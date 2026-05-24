"use client";
import { useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";

interface Milestone {
  id: number;
  title: string;
  amount: string;
  status: "pending" | "released";
  txHash: string | null;
}

interface Project {
  id: string;
  title: string;
  freelancerAddress: string;
  totalAmount: number;
  milestones: Milestone[];
}

export default function MilestonesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [freelancerAddress, setFreelancerAddress] = useState("0x8b0e1414fb67888c9df36490fbdd342d9dc6c64c");
  const [milestones, setMilestones] = useState([
    { title: "Design mockup", amount: "1.00" },
    { title: "Development", amount: "2.00" },
    { title: "Deployment", amount: "1.00" },
  ]);

  const addMilestone = () => setMilestones([...milestones, { title: "", amount: "1.00" }]);

  const updateMilestone = (i: number, field: string, value: string) => {
    const updated = [...milestones];
    updated[i] = { ...updated[i], [field]: value };
    setMilestones(updated);
  };

  const createProject = async () => {
    setLoading("creating");
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, freelancerAddress, milestones }),
      });
      const data = await res.json();
      if (data.success) {
        setProjects([...projects, data.data]);
        setShowForm(false);
        setTitle("");
      }
    } finally {
      setLoading(null);
    }
  };

  const releaseMilestone = async (projectId: string, milestoneId: number, amount: string, address: string) => {
    setLoading(projectId + "-" + milestoneId);
    try {
      const res = await fetch("/api/milestones/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, recipientAddress: address }),
      });
      const data = await res.json();
      if (data.success) {
        setProjects(projects.map((p) =>
          p.id !== projectId ? p : {
            ...p,
            milestones: p.milestones.map((m) =>
              m.id !== milestoneId ? m : { ...m, status: "released" as const, txHash: data.data.txHash }
            ),
          }
        ));
      }
    } finally {
      setLoading(null);
    }
  };

  const totalReleased = (p: Project) =>
    p.milestones.filter((m) => m.status === "released").reduce((s, m) => s + parseFloat(m.amount), 0);

  return (
    <Layout>
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white text-sm">Back</Link>
            <div>
              <h1 className="text-2xl font-bold">Multi-Milestone Escrow</h1>
              <p className="text-gray-400 text-sm">Project-based USDC payments on Arc</p>
            </div>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
            + New Project
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
            <h2 className="font-semibold mb-4">Create New Project</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Project Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Build landing page" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Freelancer Wallet</label>
                <input value={freelancerAddress} onChange={(e) => setFreelancerAddress(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400">Milestones</label>
                  <button onClick={addMilestone} className="text-xs text-blue-400 hover:text-blue-300">+ Add</button>
                </div>
                <div className="space-y-2">
                  {milestones.map((m, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={m.title} onChange={(e) => updateMilestone(i, "title", e.target.value)}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        placeholder="Milestone title" />
                      <input value={m.amount} onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                        className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        type="number" step="0.01" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-gray-400">
                  Total: <span className="text-white font-medium">
                    {milestones.reduce((s, m) => s + parseFloat(m.amount || "0"), 0).toFixed(2)} USDC
                  </span>
                </span>
                <button onClick={createProject} disabled={loading === "creating" || !title}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 px-6 py-2 rounded-lg text-sm font-medium">
                  {loading === "creating" ? "Creating..." : "Create Project"}
                </button>
              </div>
            </div>
          </div>
        )}

        {projects.length === 0 && !showForm ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">📋</p>
            <p>No projects yet. Click New Project to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div key={project.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{project.title}</h3>
                    <p className="text-gray-500 text-xs font-mono mt-1">
                      {project.freelancerAddress.slice(0, 10)}...{project.freelancerAddress.slice(-8)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">
                      <span className="text-green-400 font-bold">{totalReleased(project).toFixed(2)}</span>
                      /{project.totalAmount.toFixed(2)} USDC
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {project.milestones.filter((m) => m.status === "released").length}/
                      {project.milestones.length} done
                    </p>
                  </div>
                </div>

                <div className="w-full bg-gray-800 rounded-full h-1.5 mb-4">
                  <div className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: (totalReleased(project) / project.totalAmount * 100) + "%" }} />
                </div>

                <div className="space-y-2">
                  {project.milestones.map((milestone) => (
                    <div key={milestone.id}
                      className={"flex items-center justify-between p-3 rounded-lg border " +
                        (milestone.status === "released"
                          ? "bg-green-950 border-green-900"
                          : "bg-gray-800 border-gray-700")}>
                      <div className="flex items-center gap-3">
                        <span>{milestone.status === "released" ? "✅" : "⏳"}</span>
                        <div>
                          <p className="text-sm font-medium">{milestone.title}</p>
                          {milestone.txHash && (
                            <a href={"https://testnet.arcscan.app/tx/" + milestone.txHash}
                              target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300">
                              {milestone.txHash.slice(0, 16)}... view
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-yellow-400">{milestone.amount} USDC</span>
                        {milestone.status === "pending" && (
                          <button
                            onClick={() => releaseMilestone(project.id, milestone.id, milestone.amount, project.freelancerAddress)}
                            disabled={loading === project.id + "-" + milestone.id}
                            className="bg-green-700 hover:bg-green-600 disabled:bg-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium">
                            {loading === project.id + "-" + milestone.id ? "..." : "Release"}
                          </button>
                        )}
                        {milestone.status === "released" && (
                          <span className="text-xs text-green-400">Paid ✓</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}
