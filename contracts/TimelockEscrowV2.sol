// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title TimelockEscrowV2
/// @notice Single deployed contract, reused for many escrows via incrementing IDs.
///         Successor to TimelockEscrow 0x74d0cb38af5d79f1a88d893e13ed2ac347347961 on Arc Testnet.
/// @dev    What V2 adds over V1: the depositor may nominate ONE authorized releaser at fund()
///         time. That releaser — and only that address — may trigger the payout before the
///         deadline, in addition to the depositor. This is what lets an agent wallet release an
///         escrow funded by a real client.
///
///         What V2 deliberately keeps identical to V1:
///         - The payout amount is read from storage. No caller passes an amount to release() or
///           refund(); the amount is fixed once, at fund().
///         - The recipient is written once in fund() and no function can change it.
///         - After the deadline, ANYONE may call release(). Funds still go to the beneficiary,
///           for the stored amount. This is the anti-hostage property of the timelock.
///         - The beneficiary cannot release early by its own address, unless it is also the
///           depositor. fund() rejects a releaser equal to the beneficiary's address, but it
///           cannot detect a different address the beneficiary controls. Choosing a trustworthy
///           releaser is the depositor's responsibility.
///
///         What V2 tightens:
///         - refund() is no longer available after the deadline. In V1 the arbiter could refund
///           at any time while the escrow was still Funded, which contradicted the anti-hostage
///           property above. The dispute window now ends where the auto-release window begins.
///         - fund() rejects a zero beneficiary, a zero amount, a timelock longer than
///           MAX_TIMELOCK, and a releaser equal to the beneficiary.
///         - Escrow IDs start at FIRST_ID instead of 0, so an ID from this contract does not
///           collide with an ID from V1 as long as V1 has issued fewer than FIRST_ID escrows.
contract TimelockEscrowV2 {
    /// @notice May refund the depositor while the escrow is Funded and before its deadline.
    ///         Set once, at deployment.
    address public immutable arbiter;

    /// @notice The settlement asset. On Arc this is USDC. Set once, at deployment.
    IERC20 public immutable usdc;

    /// @notice The first escrow ID this contract will ever issue. Chosen so that IDs from this
    ///         deployment and IDs from V1 (which start at 0) do not collide off-chain, as long as
    ///         V1 has issued fewer than 1_000_000 escrows.
    uint256 public constant FIRST_ID = 1_000_000;

    /// @notice Upper bound on how far in the future a deadline may be set.
    uint256 public constant MAX_TIMELOCK = 365 days;

    /// @notice The ID that will be assigned to the next escrow.
    uint256 public nonce = FIRST_ID;

    enum Status { None, Funded, Released, Refunded }

    /// @dev `status` (1 byte) and `releaser` (20 bytes) share one storage slot, so adding the
    ///      releaser costs no extra slot per escrow. `releaser` is last so that the first five
    ///      fields keep the same positions they had in V1.
    struct Escrow {
        address depositor;
        address beneficiary;
        uint256 amount;
        uint256 deadline;
        Status status;
        address releaser;
    }

    mapping(uint256 => Escrow) public escrows;

    event EscrowFunded(
        uint256 indexed id,
        address indexed depositor,
        address indexed beneficiary,
        uint256 amount,
        uint256 deadline,
        address releaser
    );
    event EscrowReleased(uint256 indexed id, address indexed by);
    event EscrowRefunded(uint256 indexed id);

    error NotArbiter();
    error NotFunded();
    error NotYetReleasable();
    error TransferFailed();
    error ZeroAddress();
    error ZeroAmount();
    error TimelockTooLong();
    error RefundWindowClosed();
    error ReleaserIsBeneficiary();

    constructor(address _arbiter, address _usdc) {
        if (_arbiter == address(0) || _usdc == address(0)) revert ZeroAddress();
        arbiter = _arbiter;
        usdc = IERC20(_usdc);
    }

    /// @notice Lock `amount` USDC for `beneficiary`. The caller must have approved this contract
    ///         for at least `amount` beforehand.
    /// @param beneficiary      Who gets paid. Written once here; nothing can change it afterwards.
    /// @param amount           How much gets paid. Written once here; no caller ever supplies an
    ///                         amount to release().
    /// @param timelockSeconds  Seconds until the deadline. Must not exceed MAX_TIMELOCK. Before
    ///                         the deadline only the depositor or the releaser may release, and
    ///                         only the arbiter may refund. From the deadline on anyone may
    ///                         release and refund is closed. 0 is valid: release is open to
    ///                         anyone immediately and refund can never be used.
    /// @param releaser         Optional. One address the depositor authorizes to trigger the
    ///                         payout before the deadline — in Statio's case, the agent wallet.
    ///                         Pass address(0) for V1 behaviour (depositor only, before the
    ///                         deadline). fund() rejects a releaser equal to the beneficiary's
    ///                         address, but cannot detect a different address the beneficiary
    ///                         controls; choosing a trustworthy releaser is the depositor's
    ///                         responsibility. The releaser is fixed at funding time
    ///                         and cannot be added, changed or removed later, so no party can
    ///                         grant itself this authority after the fact.
    /// @return id              The escrow ID. Read it from the EscrowFunded event in the
    ///                         transaction receipt, not from nonce() — a concurrent fund() would
    ///                         make a nonce read taken before the transaction wrong.
    function fund(
        address beneficiary,
        uint256 amount,
        uint256 timelockSeconds,
        address releaser
    ) external returns (uint256 id) {
        if (beneficiary == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (timelockSeconds > MAX_TIMELOCK) revert TimelockTooLong();
        if (releaser == beneficiary) revert ReleaserIsBeneficiary();

        bool ok = usdc.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();

        id = nonce++;
        uint256 deadline = block.timestamp + timelockSeconds;
        escrows[id] = Escrow({
            depositor: msg.sender,
            beneficiary: beneficiary,
            amount: amount,
            deadline: deadline,
            status: Status.Funded,
            releaser: releaser
        });
        emit EscrowFunded(id, msg.sender, beneficiary, amount, deadline, releaser);
    }

    /// @notice Pay the beneficiary the stored amount.
    /// @dev    Callable by the depositor at any time; by the nominated releaser at any time; or
    ///         by ANYONE once the deadline has passed. The only thing a caller chooses is which
    ///         escrow. Amount and recipient come from storage in every path.
    function release(uint256 id) external {
        Escrow storage e = escrows[id];
        if (e.status != Status.Funded) revert NotFunded();

        bool isDepositor = msg.sender == e.depositor;
        bool isReleaser = e.releaser != address(0) && msg.sender == e.releaser;
        bool deadlinePassed = block.timestamp >= e.deadline;
        if (!isDepositor && !isReleaser && !deadlinePassed) revert NotYetReleasable();

        e.status = Status.Released;
        bool ok = usdc.transfer(e.beneficiary, e.amount);
        if (!ok) revert TransferFailed();
        emit EscrowReleased(id, msg.sender);
    }

    /// @notice Arbiter-only dispute resolution: return the funds to the depositor.
    /// @dev    Only while the escrow is still Funded AND still before the deadline. Once the
    ///         deadline passes the escrow belongs to the beneficiary and the arbiter can no
    ///         longer take it back.
    function refund(uint256 id) external {
        if (msg.sender != arbiter) revert NotArbiter();
        Escrow storage e = escrows[id];
        if (e.status != Status.Funded) revert NotFunded();
        if (block.timestamp >= e.deadline) revert RefundWindowClosed();

        e.status = Status.Refunded;
        bool ok = usdc.transfer(e.depositor, e.amount);
        if (!ok) revert TransferFailed();
        emit EscrowRefunded(id);
    }

    /// @notice Read an escrow as a named struct rather than a positional tuple.
    /// @dev    Prefer this off-chain over the auto-generated escrows() getter, so that adding a
    ///         field later cannot silently shift a hard-coded tuple index.
    function getEscrow(uint256 id) external view returns (Escrow memory) {
        return escrows[id];
    }
}
