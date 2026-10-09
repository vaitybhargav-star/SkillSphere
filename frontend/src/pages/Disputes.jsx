import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function Disputes() {
  const { user } = useAuth();
  const [form, setForm] = useState({ proposalId: "", reason: "", description: "", evidence: "" });
  const [disputes, setDisputes] = useState([]);
  const [availableProposals, setAvailableProposals] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceDrafts, setEvidenceDrafts] = useState({});
  const [responseDrafts, setResponseDrafts] = useState({});
  const [resolutionDrafts, setResolutionDrafts] = useState({});
  const [selectedEvidenceFile, setSelectedEvidenceFile] = useState(null);
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState({});

  const uploadEvidenceFile = async (file) => {
    if (!file) {
      return null;
    }

    setUploadingEvidence(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/uploads/attachment", formData);
      return {
        file: res.data.url,
        description: res.data.filename || file.name,
      };
    } catch (error) {
      throw error;
    } finally {
      setUploadingEvidence(false);
    }
  };

  const loadDisputes = async () => {
    const res = await api.get("/disputes");
    setDisputes(res.data?.data?.disputes || res.data?.disputes || []);
  };

  useEffect(() => {
    let active = true;

    const fetchDisputes = async () => {
      const res = await api.get("/disputes");
      if (active) {
        setDisputes(res.data?.data?.disputes || res.data?.disputes || []);
      }
    };

    void fetchDisputes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const loadAvailableProposals = async () => {
      if (!user?.role) {
        return;
      }

      try {
        if (user.role === "freelancer") {
          const res = await api.get("/proposals/my");
          setAvailableProposals(res.data.proposals || []);
        }
      } catch (err) {
        console.warn("Failed to load proposals for dispute selection", err);
      }
    };

    void loadAvailableProposals();
  }, [user?.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const evidenceEntries = [];

      if (form.evidence.trim()) {
        evidenceEntries.push({ file: form.evidence, description: "Text evidence" });
      }

      if (selectedEvidenceFile) {
        const uploadedEvidence = await uploadEvidenceFile(selectedEvidenceFile);
        if (uploadedEvidence) {
          evidenceEntries.push(uploadedEvidence);
        }
      }

      await api.post("/disputes", {
        proposalId: form.proposalId,
        reason: form.reason,
        description: form.description,
        evidence: evidenceEntries,
      });

      setForm({ proposalId: "", reason: "", description: "", evidence: "" });
      setSelectedEvidenceFile(null);
      await loadDisputes();
      setMessage("Dispute submitted successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to submit dispute right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvidence = async (disputeId) => {
    const evidenceText = evidenceDrafts[disputeId];
    if (!evidenceText?.trim()) {
      setMessage("Add evidence before submitting.");
      return;
    }

    try {
      await api.post(`/disputes/${disputeId}/evidence`, {
        file: evidenceText,
        description: "Additional evidence",
      });

      setEvidenceDrafts((current) => ({ ...current, [disputeId]: "" }));
      await loadDisputes();
      setMessage("Evidence added to the dispute.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to add evidence.");
    }
  };

  const handleSubmitResponse = async (disputeId) => {
    const response = responseDrafts[disputeId];
    if (!response?.trim()) {
      setMessage("Add a response before sending.");
      return;
    }

    try {
      await api.post(`/disputes/${disputeId}/respond`, { response });
      setResponseDrafts((current) => ({ ...current, [disputeId]: "" }));
      await loadDisputes();
      setMessage("Your response was submitted.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to submit a response.");
    }
  };

  const handleResolve = async (disputeId) => {
    const draft = resolutionDrafts[disputeId] || {};
    try {
      await api.post(`/disputes/${disputeId}/resolve`, {
        decision: draft.decision || "refund_client",
        resolution: draft.resolution || "",
        refundPercentage: draft.refundPercentage || 0,
      });

      setResolutionDrafts((current) => ({ ...current, [disputeId]: { decision: "refund_client", resolution: "", refundPercentage: "" } }));
      await loadDisputes();
      setMessage("Dispute resolved successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to resolve dispute.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="glass-card rounded-[2rem] p-8">
          <h1 className="text-3xl font-bold">Dispute Resolution</h1>
          <p className="mt-2 text-slate-400">Open a dispute, attach evidence, and move the issue through mediation or admin resolution.</p>
        </div>

        <div className="glass-card rounded-[2rem] p-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-6">
              <h2 className="mb-4 text-xl font-semibold text-white">Submit a dispute</h2>
              <form className="space-y-4" onSubmit={handleSubmit}>
                {availableProposals.length > 0 && (
                  <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 text-slate-200">
                    <p className="mb-3 text-sm font-semibold text-white">Select a proposal</p>
                    <select
                      value={form.proposalId}
                      onChange={(e) => setForm({ ...form, proposalId: e.target.value })}
                      className="auth-input w-full rounded-3xl px-4 py-3"
                    >
                      <option value="">Choose a proposal</option>
                      {availableProposals.map((proposal) => (
                        <option key={proposal._id} value={proposal._id}>
                          {proposal.gig?.title ? `${proposal.gig.title} — ${proposal._id.slice(0, 8)}` : `${proposal.proposalText?.slice(0, 40) || proposal._id} — ${proposal._id.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-400">Choosing a proposal will fill the Proposal ID automatically. You can also paste one manually below.</p>
                  </div>
                )}
                <input
                  value={form.proposalId}
                  onChange={(e) => setForm({ ...form, proposalId: e.target.value })}
                  placeholder="Proposal ID or select from your proposals"
                  className="auth-input w-full rounded-3xl px-4 py-3"
                />
                <input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Reason"
                  className="auth-input w-full rounded-3xl px-4 py-3"
                  required
                />
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the issue"
                  className="auth-input w-full min-h-[110px] rounded-3xl px-4 py-3"
                />
                <textarea
                  value={form.evidence}
                  onChange={(e) => setForm({ ...form, evidence: e.target.value })}
                  placeholder="Paste evidence links or notes"
                  className="auth-input w-full min-h-[140px] rounded-3xl px-4 py-3"
                />
                <button type="submit" disabled={loading} className="brand-button w-full rounded-3xl px-5 py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-70">
                  {loading ? "Submitting..." : "Submit Dispute"}
                </button>
              </form>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Dispute activity</h2>
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                  {user?.role || "user"}
                </span>
              </div>

              {message ? <p className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">{message}</p> : null}

              <div className="space-y-4">
                {disputes.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/80 p-6 text-slate-500">No disputes found yet.</div>
                ) : (
                  disputes.map((item) => (
                    <div key={item._id} className="rounded-3xl border border-white/10 bg-slate-900/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{item.reason}</p>
                          <p className="mt-1 text-sm text-slate-400">{item.description || "No additional details provided."}</p>
                        </div>
                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                          {item.status}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-sm text-slate-400">
                        <p>Proposal: {item.proposal?._id || item.proposal || "N/A"}</p>
                        {item.evidence?.length ? (
                          <div>
                            <p className="font-medium text-slate-200">Evidence</p>
                            <ul className="mt-1 list-disc space-y-1 pl-5">
                              {item.evidence.map((entry, index) => (
                                <li key={`${item._id}-${index}`}>{entry.file || entry.description || "Evidence item"}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p>No evidence attached yet.</p>
                        )}

                        {item.responses?.length ? (
                          <div>
                            <p className="font-medium text-slate-200">Responses</p>
                            <ul className="mt-1 list-disc space-y-1 pl-5">
                              {item.responses.map((entry, index) => (
                                <li key={`${item._id}-response-${index}`}>{entry.response}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p>No responses yet.</p>
                        )}
                      </div>

                      {(item.status === "open" || item.status === "under_review") && (
                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm text-slate-300">Add evidence</label>
                            <textarea
                              value={evidenceDrafts[item._id] || ""}
                              onChange={(e) => setEvidenceDrafts((current) => ({ ...current, [item._id]: e.target.value }))}
                              className="auth-input w-full min-h-[90px] rounded-2xl px-3 py-2"
                              placeholder="Add a note or link"
                            />
                            <button onClick={() => handleAddEvidence(item._id)} className="mt-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-200">
                              Add evidence
                            </button>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-slate-300">Submit response</label>
                            <textarea
                              value={responseDrafts[item._id] || ""}
                              onChange={(e) => setResponseDrafts((current) => ({ ...current, [item._id]: e.target.value }))}
                              className="auth-input w-full min-h-[90px] rounded-2xl px-3 py-2"
                              placeholder="Share your position"
                            />
                            <button onClick={() => handleSubmitResponse(item._id)} className="mt-2 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-sm font-semibold text-fuchsia-200">
                              Submit response
                            </button>
                          </div>
                        </div>
                      )}

                      {user?.role === "admin" && (item.status === "open" || item.status === "under_review") && (
                        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                          <label className="mb-2 block text-sm text-slate-300">Admin resolution</label>
                          <select
                            value={resolutionDrafts[item._id]?.decision || "refund_client"}
                            onChange={(e) => setResolutionDrafts((current) => ({ ...current, [item._id]: { ...(current[item._id] || {}), decision: e.target.value } }))}
                            className="auth-input w-full rounded-2xl px-3 py-2"
                          >
                            <option value="refund_client">Refund client</option>
                            <option value="accept_freelancer">Accept freelancer</option>
                            <option value="reject_dispute">Reject dispute</option>
                          </select>
                          <textarea
                            value={resolutionDrafts[item._id]?.resolution || ""}
                            onChange={(e) => setResolutionDrafts((current) => ({ ...current, [item._id]: { ...(current[item._id] || {}), resolution: e.target.value } }))}
                            className="auth-input mt-3 w-full min-h-[90px] rounded-2xl px-3 py-2"
                            placeholder="Resolution summary"
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={resolutionDrafts[item._id]?.refundPercentage || ""}
                            onChange={(e) => setResolutionDrafts((current) => ({ ...current, [item._id]: { ...(current[item._id] || {}), refundPercentage: e.target.value } }))}
                            className="auth-input mt-3 w-full rounded-2xl px-3 py-2"
                            placeholder="Refund percentage"
                          />
                          <button onClick={() => handleResolve(item._id)} className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
                            Resolve dispute
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Disputes;
