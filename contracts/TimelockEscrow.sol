// Deployed at 0x74d0cb38af5d79f1a88d893e13ed2ac347347961 on Arc Testnet, chain 5042002.
// Source from the explorer API; this header was added in this repo. Recompiled with solc 0.8.20,
// optimizer 200: executable code matches the deployed bytecode 1981/1981 bytes; the metadata trailer
// differs, so this file is logically equivalent, not a byte-identical original. See README.md.
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title TimelockEscrow
/// @notice Single deployed contract, reused for many escrows via incrementing IDs.
/// @dev Beneficiary can NEVER pull funds early. Funds release only when:
///      (a) the depositor manually approves, or
///      (b) the timelock deadline has passed (anyone can then trigger payout).
///      The arbiter may refund the depositor only while status is still Funded
///      (i.e., before release) — this is the dispute window.
contract TimelockEscrow {
    address public immutable arbiter;
    IERC20 public immutable usdc;
    uint256 public nonce;

    enum Status { None, Funded, Released, Refunded }

    struct Escrow {
        address depositor;
        address beneficiary;
        uint256 amount;
        uint256 deadline;
        Status status;
    }

    mapping(uint256 => Escrow) public escrows;

    event EscrowFunded(uint256 indexed id, address indexed depositor, address indexed beneficiary, uint256 amount, uint256 deadline);
    event EscrowReleased(uint256 indexed id, address indexed by);
    event EscrowRefunded(uint256 indexed id);

    error NotArbiter();
    error NotFunded();
    error NotYetReleasable();
    error TransferFailed();

    constructor(address _arbiter, address _usdc) {
        arbiter = _arbiter;
        usdc = IERC20(_usdc);
    }

    /// @notice Lock `amount` USDC for `beneficiary`. Caller must have approved this
    /// contract for at least `amount` beforehand. `timelockSeconds` is how long the
    /// depositor has to dispute before anyone can trigger an automatic release.
    function fund(address beneficiary, uint256 amount, uint256 timelockSeconds) external returns (uint256 id) {
        bool ok = usdc.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();
        id = nonce++;
        uint256 deadline = block.timestamp + timelockSeconds;
        escrows[id] = Escrow({
            depositor: msg.sender,
            beneficiary: beneficiary,
            amount: amount,
            deadline: deadline,
            status: Status.Funded
        });
        emit EscrowFunded(id, msg.sender, beneficiary, amount, deadline);
    }

    /// @notice Release funds to the beneficiary. Callable by the depositor at any time
    /// (early approval), or by ANYONE once the deadline has passed (auto-release keeper).
    function release(uint256 id) external {
        Escrow storage e = escrows[id];
        if (e.status != Status.Funded) revert NotFunded();
        bool isDepositor = msg.sender == e.depositor;
        bool deadlinePassed = block.timestamp >= e.deadline;
        if (!isDepositor && !deadlinePassed) revert NotYetReleasable();
        e.status = Status.Released;
        bool ok = usdc.transfer(e.beneficiary, e.amount);
        if (!ok) revert TransferFailed();
        emit EscrowReleased(id, msg.sender);
    }

    /// @notice Arbiter-only dispute resolution: refund the depositor. Only works while
    /// the escrow is still Funded (i.e., before it has been released).
    function refund(uint256 id) external {
        if (msg.sender != arbiter) revert NotArbiter();
        Escrow storage e = escrows[id];
        if (e.status != Status.Funded) revert NotFunded();
        e.status = Status.Refunded;
        bool ok = usdc.transfer(e.depositor, e.amount);
        if (!ok) revert TransferFailed();
        emit EscrowRefunded(id);
    }
}