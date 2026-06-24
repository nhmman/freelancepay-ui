"use client";
import { useState } from "react";
import Layout from "../components/Layout";

type JobStatus = "Open" | "Funded" | "Submitted" | "Completed";

interface Job {
  id: string;
  jobId: string;
  description: string;
  budget: string;
  status: JobStatus;
  txHashes: Record<string, string>;
  createdAt: string;
  deliverableHash?: string;
}

const STATUS_COLORS: Record<JobStatus, string> = {
  Open: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Funded: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Submitted: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Completed: "text-green-400 bg-green-400/10 border-green-400/20" };

const STATUS_STEPS: JobStatus[] = ["Open", "Funded", "Submitted", "Completed"];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("Build a landing page for FreelancePay");
  const [budget, setBudget] = useState("5");
  const [loading, setLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

  const createJob = async () => {
    setLoading("create");
    addLog("Creating ERC-8183 job on Arc Testnet...");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, budget }) });
      const data = await res.json();
      if (data.success) {
        setJobs((prev) => [data.job, ...prev]);
        addLog(`✅ Job #${data.job.jobId} created! TX: ${data.job.txHashes.create?.slice(0, 16)}...`);
        setShowForm(false);
      } else {
        addLog(`❌ Error: ${data.error}`);
      }
    } finally {
      setLoading(null);
    }
  };

  const fundJob = async (job: Job) => {
    setLoading(job.id);
    addLog(`Funding escrow for Job #${job.jobId} with ${job.budget} USDC...`);
    try {
      const res = await fetch("/api/jobs/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.jobId, budget: job.budget }) });
      const data = await res.json();
      if (data.success) {
        setJobs((prev) => prev.map((j) => j.id === job.id
          ? { ...j, status: "Funded" as JobStatus, txHashes: { ...j.txHashes, fund: data.txHash } }
          : j));
        addLog(`✅ Escrow funded! ${job.budget} USDC locked onchain.`);
      } else addLog(`❌ Error: ${data.error}`);
    } finally {
      setLoading(null);
    }
  };

  const submitJob = async (job: Job) => {
    setLoading(job.id + "-submit");
    addLog(`Submitting deliverable for Job #${job.jobId}...`);
    try {
      const res = await fetch("/api/jobs/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.jobId }) });
      const data = await res.json();
      if (data.success) {
        setJobs((prev) => prev.map((j) => j.id === job.id
          ? { ...j, status: "Submitted" as JobStatus, deliverableHash: data.deliverableHash, txHashes: { ...j.txHashes, submit: data.txHash } }
          : j));
        addLog(`✅ Deliverable submitted! Hash: ${data.deliverableHash?.slice(0, 16)}...`);
      } else addLog(`❌ Error: ${data.error}`);
    } finally {
      setLoading(null);
    }
  };

  const completeJob = async (job: Job) => {
    setLoading(job.id + "-complete");
    addLog(`Completing Job #${job.jobId} and releasing USDC...`);
    try {
      const res = await fetch("/api/jobs/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.jobId }) });
      const data = await res.json();
      if (data.success) {
        setJobs((prev) => prev.map((j) => j.id === job.id
          ? { ...j, status: "Completed" as JobStatus, txHashes: { ...j.txHashes, complete: data.txHash } }
          : j));
        addLog(`🎉 Job #${job.jobId} completed! ${job.budget} USDC released to provider.`);
      } else addLog(`❌ Error: ${data.error}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-mono">ERC-8183</span>
              <span className="text-[10px] bg-white/5 text-gray-400 border border-white/10 px-2 py-0.5 rounded-full font-mono">CONTRACT: 0x0747...4583</span>
            </div>
            <h1 className="text-3xl font-bold mb-1">Smart Job Contracts</h1>
            <p className="text-gray-500">On-chain job lifecycle: Open → Funded → Submitted → Completed</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
            + Create Job
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {/* Create Form */}
            {showForm && (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
                <h2 className="font-semibold mb-4">New ERC-8183 Job</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Job Description</label>
                    <input value={description} onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50"
                      placeholder="Describe the work..." />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Budget (USDC)</label>
                    <div className="flex gap-2">
                      <input value={budget} onChange={(e) => setBudget(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50"
                        type="number" />
                      {["1", "5", "10"].map((v) => (
                        <button key={v} onClick={() => setBudget(v)}
                          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm hover:border-blue-500/30 transition-colors">
                          ${v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={createJob} disabled={loading === "create"}
                    className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 disabled:opacity-50 rounded-xl py-3 font-semibold text-sm transition-all">
                    {loading === "create" ? "Creating on-chain..." : "Deploy Job Contract →"}
                  </button>
                </div>
              </div>
            )}

            {/* Jobs List */}
            {jobs.length === 0 && !showForm ? (
              <div className="text-center py-20 text-gray-600">
                <p className="text-4xl mb-3">🤖</p>
                <p className="text-lg font-medium text-gray-500 mb-1">No jobs yet</p>
                <p className="text-sm">Create your first ERC-8183 smart job contract</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="bg-white/3 border border-white/8 rounded-2xl p-6">
                  {/* Job Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-gray-500">Job #{job.jobId}</span>
                        <span className={"text-[11px] px-2 py-0.5 rounded-full border font-medium " + STATUS_COLORS[job.status]}>
                          {job.status}
                        </span>
                      </div>
                      <p className="font-medium">{job.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-400">{job.budget}</p>
                      <p className="text-xs text-gray-500">USDC</p>
                    </div>
                  </div>

                  {/* Progress Steps */}
                  <div className="flex items-center gap-1 mb-4">
                    {STATUS_STEPS.map((step, i) => {
                      const currentIdx = STATUS_STEPS.indexOf(job.status);
                      const isDone = i <= currentIdx;
                      return (
                        <div key={step} className="flex items-center gap-1 flex-1">
                          <div className={"flex-1 h-1 rounded-full transition-all " + (isDone ? "bg-blue-500" : "bg-white/10")} />
                          {i === STATUS_STEPS.length - 1 && (
                            <div className={"w-2 h-2 rounded-full " + (isDone ? "bg-green-400" : "bg-white/20")} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600 mb-4">
                    {STATUS_STEPS.map((s) => <span key={s}>{s}</span>)}
                  </div>

                  {/* TX Hashes */}
                  {Object.entries(job.txHashes).map(([key, hash]) => hash && (
                    <div key={key} className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-gray-600 w-16 capitalize">{key}:</span>
                      <a href={"https://testnet.arcscan.app/tx/" + hash}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-mono text-blue-400 hover:text-blue-300">
                        {hash.slice(0, 20)}... →
                      </a>
                    </div>
                  ))}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    {job.status === "Open" && (
                      <button onClick={() => fundJob(job)} disabled={loading === job.id}
                        className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 disabled:opacity-50 rounded-xl py-2.5 text-sm font-medium transition-all">
                        {loading === job.id ? "Funding..." : "⚡ Fund Escrow"}
                      </button>
                    )}
                    {job.status === "Funded" && (
                      <button onClick={() => submitJob(job)} disabled={loading === job.id + "-submit"}
                        className="flex-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 disabled:opacity-50 rounded-xl py-2.5 text-sm font-medium transition-all">
                        {loading === job.id + "-submit" ? "Submitting..." : "📤 Submit Deliverable"}
                      </button>
                    )}
                    {job.status === "Submitted" && (
                      <button onClick={() => completeJob(job)} disabled={loading === job.id + "-complete"}
                        className="flex-1 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 disabled:opacity-50 rounded-xl py-2.5 text-sm font-medium transition-all">
                        {loading === job.id + "-complete" ? "Completing..." : "✅ Complete & Release USDC"}
                      </button>
                    )}
                    {job.status === "Completed" && (
                      <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl py-2.5 text-center text-green-400 text-sm font-medium">
                        🎉 Completed — USDC Released
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Activity Log */}
          <div className="col-span-1">
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5 sticky top-20">
              <h3 className="font-semibold mb-4 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Activity Log
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-600 text-xs">No activity yet...</p>
                ) : (
                  logs.map((log, i) => (
                    <p key={i} className="text-xs text-gray-400 font-mono leading-relaxed border-b border-white/5 pb-2">{log}</p>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
