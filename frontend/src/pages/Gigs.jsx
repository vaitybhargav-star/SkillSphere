import { useEffect, useState } from "react";
import api from "../services/api";

function Gigs() {
  const [gigs, setGigs] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    budget: "",
    budgetType: "fixed",
    minBudget: "",
    maxBudget: "",
    location: "",
    skills: "",
  });
  const [milestones, setMilestones] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [search, setSearch] = useState("");
  const [proposalForms, setProposalForms] = useState({});
  const [submittingId, setSubmittingId] = useState(null);
  const [message, setMessage] = useState("");
  const [userRole, setUserRole] = useState("");
  const [myProposals, setMyProposals] = useState([]);
  const [gigProposals, setGigProposals] = useState({});
  const [viewingProposals, setViewingProposals] = useState({});
  const [proposalActionLoading, setProposalActionLoading] = useState({});
  const [showNegotiationForm, setShowNegotiationForm] = useState({});
  const [negotiationData, setNegotiationData] = useState({});
  const [myGigs, setMyGigs] = useState([]);
  const [inviteStatus, setInviteStatus] = useState({});
  const [recommendations, setRecommendations] = useState({});
  const [recommendationsOpen, setRecommendationsOpen] = useState({});
  const [recommendationLoading, setRecommendationLoading] = useState({});
  const [recommendationError, setRecommendationError] = useState({});

  const loadGigs = async () => {
    const res = await api.get("/gigs");
    setGigs(res.data.gigs || []);
  };

  useEffect(() => {
    let active = true;

    const fetchGigs = async () => {
      const res = await api.get("/gigs");
      if (active) setGigs(res.data.gigs || []);
    };

    const loadUserRole = async () => {
      try {
        const raw = localStorage.getItem("user");
        const parsed = raw ? JSON.parse(raw) : null;
        setUserRole(parsed?.role || "");
        if (parsed?.role === "freelancer") {
          const response = await api.get("/proposals/my");
          setMyProposals(response.data.proposals || []);
        }
        if (parsed?.role === "client") {
          const response = await api.get("/gigs/my");
          setMyGigs(response.data.gigs || []);
        }
      } catch (err) {
        console.warn("Failed to load user role", err);
      }
    };

    void fetchGigs();
    void loadUserRole();

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole !== "client") {
      setMessage("Only client accounts can create new gigs. Switch to a client role to post work.");
      return;
    }

    try {
      await api.post("/gigs", {
        ...form,
        skills: form.skills.split(",").map((item) => item.trim()).filter(Boolean),
        budget: form.budget ? Number(form.budget) : undefined,
        minBudget: form.minBudget ? Number(form.minBudget) : undefined,
        maxBudget: form.maxBudget ? Number(form.maxBudget) : undefined,
        milestones,
        attachments,
      });
      setForm({ title: "", description: "", category: "", budget: "", budgetType: "fixed", minBudget: "", maxBudget: "", location: "", skills: "" });
      setMilestones([]);
      setAttachments([]);
      setMessage("Gig created successfully.");
      await loadGigs();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to create gig");
    }
  };

  const handleAddMilestone = () => {
    setMilestones((prev) => [...prev, { title: "", description: "", paymentAmount: "", dueDate: "", status: "pending", completionPercentage: 0 }]);
  };

  const handleMilestoneChange = (index, field, value) => {
    setMilestones((prev) => prev.map((ms, idx) => (idx === index ? { ...ms, [field]: value } : ms)));
  };

  const handleRemoveMilestone = (index) => {
    setMilestones((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddAttachment = (value) => {
    if (!value) return;
    setAttachments((prev) => [...prev, value]);
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleInviteFreelancer = async (gigId, freelancerId) => {
    try {
      setInviteStatus((prev) => ({ ...prev, [freelancerId]: "loading" }));
      await api.post(`/gigs/${gigId}/invite`, { freelancerId });
      setInviteStatus((prev) => ({ ...prev, [freelancerId]: "invited" }));
      setMessage("Freelancer invited successfully.");
    } catch (error) {
      setInviteStatus((prev) => ({ ...prev, [freelancerId]: "error" }));
      setMessage(error.response?.data?.message || "Failed to invite freelancer");
    }
  };

  const refreshGigProposals = async (gigId) => {
    try {
      const response = await api.get(`/gigs/${gigId}/proposals`);
      setGigProposals((prev) => ({ ...prev, [gigId]: response.data.proposals || [] }));
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load proposals");
    }
  };

  const handleToggleProposals = async (gigId) => {
    setViewingProposals((prev) => ({ ...prev, [gigId]: !prev[gigId] }));

    if (viewingProposals[gigId] || gigProposals[gigId]) {
      return;
    }

    await refreshGigProposals(gigId);
  };

  const handleToggleNegotiation = (proposalId) => {
    setShowNegotiationForm((prev) => ({ ...prev, [proposalId]: !prev[proposalId] }));
  };

  const handleNegotiationChange = (proposalId, field, value) => {
    setNegotiationData((prev) => ({
      ...prev,
      [proposalId]: {
        ...prev[proposalId],
        [field]: value,
      },
    }));
  };

  const handleProposalStatusUpdate = async (proposalId, gigId, status) => {
    setProposalActionLoading((prev) => ({ ...prev, [proposalId]: true }));
    try {
      await api.put(`/proposals/${proposalId}`, { status });
      await refreshGigProposals(gigId);
      setMessage(`Proposal ${status} successfully.`);
    } catch (error) {
      setMessage(error.response?.data?.message || `Failed to ${status} proposal`);
    } finally {
      setProposalActionLoading((prev) => ({ ...prev, [proposalId]: false }));
    }
  };

  const handleNegotiateProposal = async (proposalId, gigId) => {
    const negotiation = negotiationData[proposalId] || {};

    if (!negotiation.counterOfferAmount && !negotiation.counterEstimatedTime && !negotiation.negotiationMessage) {
      setMessage("Please provide a counter offer amount, estimated time, or negotiation message.");
      return;
    }

    setProposalActionLoading((prev) => ({ ...prev, [proposalId]: true }));
    try {
      await api.put(`/proposals/${proposalId}`, {
        negotiation: true,
        counterOfferAmount: negotiation.counterOfferAmount ? Number(negotiation.counterOfferAmount) : undefined,
        counterEstimatedTime: negotiation.counterEstimatedTime,
        negotiationMessage: negotiation.negotiationMessage,
      });
      await refreshGigProposals(gigId);
      setMessage("Negotiation request sent to freelancer.");
      setShowNegotiationForm((prev) => ({ ...prev, [proposalId]: false }));
      setNegotiationData((prev) => ({ ...prev, [proposalId]: {} }));
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to send negotiation request");
    } finally {
      setProposalActionLoading((prev) => ({ ...prev, [proposalId]: false }));
    }
  };

  const handleProposalChange = (gigId, field, value) => {
    setProposalForms((prev) => ({
      ...prev,
      [gigId]: { ...prev[gigId], [field]: value },
    }));
  };

  const handleProposalSubmit = async (gigId) => {
    const formData = proposalForms[gigId] || {};
    setSubmittingId(gigId);
    try {
      await api.post("/proposals", {
        gigId,
        proposalText: formData.proposalText || "",
        bidAmount: Number(formData.bidAmount || 0),
        estimatedTime: formData.estimatedTime || "3 days",
      });
      setProposalForms((prev) => ({ ...prev, [gigId]: { proposalText: "", bidAmount: "", estimatedTime: "" } }));
      setMessage("Proposal submitted successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to submit proposal");
    } finally {
      setSubmittingId(null);
    }
  };

  const toggleRecommendations = async (gigId) => {
    setRecommendationsOpen((prev) => ({ ...prev, [gigId]: !prev[gigId] }));
    if (recommendations[gigId] || recommendationLoading[gigId]) return;

    setRecommendationLoading((prev) => ({ ...prev, [gigId]: true }));
    setRecommendationError((prev) => ({ ...prev, [gigId]: null }));

    try {
      const response = await api.get(`/matching/recommend/${gigId}?limit=5`);
      setRecommendations((prev) => ({ ...prev, [gigId]: response.data.data.recommendedFreelancers || [] }));
    } catch (error) {
      setRecommendationError((prev) => ({ ...prev, [gigId]: error.response?.data?.message || "Failed to load recommendations" }));
    } finally {
      setRecommendationLoading((prev) => ({ ...prev, [gigId]: false }));
    }
  };

  const filteredGigs = gigs.filter((gig) => {
    const term = search.toLowerCase();
    return (
      gig.title?.toLowerCase().includes(term) ||
      gig.description?.toLowerCase().includes(term) ||
      gig.category?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="max-w-7xl mx-auto grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 glass-card rounded-[2rem] p-8">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Post a gig</p>
            <h2 className="text-2xl font-bold text-white mt-3">Create your listing</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input name="title" value={form.title} onChange={handleChange} placeholder="Title" className="auth-input w-full rounded-3xl px-4 py-3" required />
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description" className="auth-input w-full min-h-[120px] rounded-3xl px-4 py-3" required />
            <input name="category" value={form.category} onChange={handleChange} placeholder="Category" className="auth-input w-full rounded-3xl px-4 py-3" required />
            <div className="grid gap-3 md:grid-cols-3">
              <select name="budgetType" value={form.budgetType} onChange={handleChange} className="auth-input w-full rounded-3xl px-4 py-3" aria-label="Budget type">
                <option value="fixed">Fixed Budget</option>
                <option value="hourly">Hourly Rate</option>
              </select>
              <input name="minBudget" type="number" value={form.minBudget} onChange={handleChange} placeholder="Min Budget" className="auth-input w-full rounded-3xl px-4 py-3" />
              <input name="maxBudget" type="number" value={form.maxBudget} onChange={handleChange} placeholder="Max Budget" className="auth-input w-full rounded-3xl px-4 py-3" />
            </div>
            <input name="budget" type="number" value={form.budget} onChange={handleChange} placeholder="Budget" className="auth-input w-full rounded-3xl px-4 py-3" />
            <input name="location" value={form.location} onChange={handleChange} placeholder="Location" className="auth-input w-full rounded-3xl px-4 py-3" />
            <input name="skills" value={form.skills} onChange={handleChange} placeholder="React, Node" className="auth-input w-full rounded-3xl px-4 py-3" />
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-white">Milestones</p>
                <button type="button" onClick={handleAddMilestone} className="text-cyan-300 underline">Add milestone</button>
              </div>
              {milestones.length === 0 ? (
                <p className="text-slate-400 text-sm">Add milestones to track deliverables and payment release.</p>
              ) : (
                <div className="space-y-4">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="rounded-3xl border border-slate-700 bg-slate-900 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-sm text-slate-200">Milestone {index + 1}</p>
                        <button type="button" onClick={() => handleRemoveMilestone(index)} className="text-sm text-rose-400">Remove</button>
                      </div>
                      <input value={milestone.title} onChange={(e) => handleMilestoneChange(index, 'title', e.target.value)} placeholder="Title" className="auth-input w-full rounded-3xl px-4 py-3 mb-3" />
                      <textarea value={milestone.description} onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)} placeholder="Description" className="auth-input w-full rounded-3xl px-4 py-3 mb-3" rows="3" />
                      <div className="grid gap-3 md:grid-cols-3">
                        <input value={milestone.paymentAmount} onChange={(e) => handleMilestoneChange(index, 'paymentAmount', e.target.value)} placeholder="Payment amount" type="number" className="auth-input w-full rounded-3xl px-4 py-3" />
                        <input value={milestone.dueDate} onChange={(e) => handleMilestoneChange(index, 'dueDate', e.target.value)} placeholder="Due date" type="date" className="auth-input w-full rounded-3xl px-4 py-3" />
                        <select value={milestone.status} onChange={(e) => handleMilestoneChange(index, 'status', e.target.value)} className="auth-input w-full rounded-3xl px-4 py-3">
                          <option value="pending">Pending</option>
                          <option value="in-progress">In progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="font-semibold text-white mb-3">Attachments</p>
              <div className="grid gap-3 md:grid-cols-2">
                <input id="attachment-url" type="text" placeholder="Document URL or filename" className="auth-input w-full rounded-3xl px-4 py-3" />
                <button type="button" onClick={() => {
                  const input = document.getElementById('attachment-url');
                  if (input?.value) {
                    handleAddAttachment(input.value);
                    input.value = '';
                  }
                }} className="brand-button rounded-3xl px-5 py-3 text-base font-semibold">Add Attachment</button>
              </div>
              {attachments.length > 0 && (
                <ul className="mt-3 space-y-2 text-slate-200">
                  {attachments.map((attachment, idx) => (
                    <li key={idx} className="flex items-center justify-between rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3">
                      <span className="truncate">{attachment}</span>
                      <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-rose-400">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" className="brand-button w-full rounded-3xl px-5 py-3 text-base font-semibold">Create Gig</button>
            {userRole !== "client" && (
              <p className="mt-3 text-sm text-amber-200">Only clients can post new gigs. Freelancers can browse and submit proposals.</p>
            )}
          </form>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="glass-card rounded-[2rem] p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Marketplace</h2>
                <p className="text-slate-400 mt-2">Browse available gigs and pitch your best proposal.</p>
              </div>
              <div className="w-full max-w-md">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search gigs" className="auth-input w-full rounded-3xl px-4 py-3" />
              </div>
            </div>
          </div>

          {message && <div className="rounded-3xl border border-cyan-500/10 bg-cyan-500/10 p-4 text-sm text-cyan-200">{message}</div>}

          {userRole === "client" && myGigs.length > 0 && (
            <div className="rounded-[2rem] border border-cyan-500/10 bg-slate-900/90 p-6">
              <h3 className="text-xl font-semibold text-white">Your Posted Gigs</h3>
              <p className="text-slate-400 mt-1">Manage your posted projects, invite freelancers, and track incoming proposals.</p>
              <div className="mt-5 space-y-4">
                {myGigs.map((postedGig) => (
                  <div key={postedGig._id} className="rounded-3xl border border-slate-700 bg-slate-950 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm text-slate-400">{postedGig.category} • {postedGig.location}</p>
                        <h4 className="font-semibold text-white">{postedGig.title}</h4>
                        <p className="text-sm text-slate-400">Budget: ${postedGig.budget} {postedGig.budgetType === 'hourly' ? '/hr' : ''}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleProposals(postedGig._id)}
                        className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20"
                      >
                        {viewingProposals[postedGig._id] ? 'Hide proposals' : 'View proposals'}
                      </button>
                    </div>
                    {postedGig.invitedFreelancers?.length > 0 && (
                      <p className="mt-3 text-sm text-slate-400">Invited freelancers: {postedGig.invitedFreelancers.length}</p>
                    )}
                    {viewingProposals[postedGig._id] && gigProposals[postedGig._id] && (
                      <div className="mt-4 rounded-3xl border border-slate-700 bg-slate-900 p-4">
                        <h5 className="font-semibold text-white mb-3">Proposals</h5>
                        {gigProposals[postedGig._id]?.length === 0 ? (
                          <p className="text-sm text-slate-400">No proposals yet for this posted gig.</p>
                        ) : (
                          <div className="space-y-3">
                            {gigProposals[postedGig._id].map((proposal) => (
                              <div key={proposal._id} className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                  <div>
                                    <p className="text-sm text-slate-400">{proposal.freelancer?.fullName || proposal.freelancer}</p>
                                    <p className="text-white">{proposal.proposalText}</p>
                                    <div className="mt-2 text-sm text-slate-400">
                                      <p>Estimated time: {proposal.estimatedTime}</p>
                                      {proposal.counterOfferAmount !== undefined && (
                                        <p>Client counter offer: ${proposal.counterOfferAmount}{proposal.counterEstimatedTime ? ` in ${proposal.counterEstimatedTime}` : ''}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-slate-400">Bid: ${proposal.bidAmount}</p>
                                    <p className="text-sm font-semibold text-cyan-300">Status: {proposal.status}</p>
                                  </div>
                                </div>

                                {proposal.negotiationHistory?.length > 0 && (
                                  <div className="mt-4 rounded-3xl border border-slate-700 bg-slate-900 p-3">
                                    <p className="text-sm font-semibold text-white mb-2">Negotiation history</p>
                                    <div className="space-y-2 text-sm text-slate-400">
                                      {proposal.negotiationHistory.map((item, index) => (
                                        <div key={index} className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                                          <p className="text-slate-300">{item.sender === 'client' ? 'Client' : 'Freelancer'} message</p>
                                          {item.message && <p>{item.message}</p>}
                                          {item.bidAmount !== undefined && <p>Bid request: ${item.bidAmount}</p>}
                                          {item.estimatedTime && <p>Estimated time: {item.estimatedTime}</p>}
                                          <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {proposal.status === 'pending' && (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={proposalActionLoading[proposal._id]}
                                      onClick={() => handleProposalStatusUpdate(proposal._id, postedGig._id, 'accepted')}
                                      className="rounded-full border border-emerald-500 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                                    >
                                      {proposalActionLoading[proposal._id] ? 'Processing...' : 'Accept'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={proposalActionLoading[proposal._id]}
                                      onClick={() => handleProposalStatusUpdate(proposal._id, postedGig._id, 'rejected')}
                                      className="rounded-full border border-rose-500 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
                                    >
                                      {proposalActionLoading[proposal._id] ? 'Processing...' : 'Reject'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleNegotiation(proposal._id)}
                                      className="rounded-full border border-cyan-500 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20"
                                    >
                                      {showNegotiationForm[proposal._id] ? 'Cancel' : 'Negotiate'}
                                    </button>
                                  </div>
                                )}

                                {showNegotiationForm[proposal._id] && (
                                  <div className="mt-4 rounded-3xl border border-slate-700 bg-slate-900 p-4">
                                    <p className="font-semibold text-white mb-3">Send negotiation response</p>
                                    <div className="grid gap-3 md:grid-cols-3">
                                      <input
                                        type="number"
                                        placeholder="Counter amount"
                                        value={negotiationData[proposal._id]?.counterOfferAmount || ''}
                                        onChange={(e) => handleNegotiationChange(proposal._id, 'counterOfferAmount', e.target.value)}
                                        className="auth-input w-full rounded-3xl px-4 py-3"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Counter time (e.g. 10 days)"
                                        value={negotiationData[proposal._id]?.counterEstimatedTime || ''}
                                        onChange={(e) => handleNegotiationChange(proposal._id, 'counterEstimatedTime', e.target.value)}
                                        className="auth-input w-full rounded-3xl px-4 py-3"
                                      />
                                    </div>
                                    <textarea
                                      placeholder="Message to freelancer"
                                      value={negotiationData[proposal._id]?.negotiationMessage || ''}
                                      onChange={(e) => handleNegotiationChange(proposal._id, 'negotiationMessage', e.target.value)}
                                      className="auth-input mt-3 w-full rounded-3xl px-4 py-3"
                                      rows="3"
                                    />
                                    <button
                                      type="button"
                                      disabled={proposalActionLoading[proposal._id]}
                                      onClick={() => handleNegotiateProposal(proposal._id, postedGig._id)}
                                      className="brand-button mt-3 rounded-3xl px-5 py-3 text-base font-semibold disabled:opacity-60"
                                    >
                                      {proposalActionLoading[proposal._id] ? 'Sending...' : 'Send Negotiation'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {userRole === "freelancer" && myProposals.length > 0 && (
            <div className="rounded-[2rem] border border-cyan-500/10 bg-slate-900/90 p-6">
              <h3 className="text-xl font-semibold text-white">Your Applications</h3>
              <p className="text-slate-400 mt-1">Track proposal status for the gigs you've applied to.</p>
              <div className="mt-5 space-y-4">
                {myProposals.map((proposal) => (
                  <div key={proposal._id} className="rounded-3xl border border-slate-700 bg-slate-950 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm text-slate-400">{proposal.gig?.title || "Unknown gig"}</p>
                        <p className="font-semibold text-white">{proposal.proposalText}</p>
                        <div className="mt-2 text-sm text-slate-400">
                          <p>Estimated time: {proposal.estimatedTime}</p>
                          {proposal.counterOfferAmount !== undefined && (
                            <p>Client counter offer: ${proposal.counterOfferAmount}{proposal.counterEstimatedTime ? ` in ${proposal.counterEstimatedTime}` : ''}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">Bid: ${proposal.bidAmount}</p>
                        <p className="text-sm font-semibold text-cyan-300">Status: {proposal.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-5">
            {filteredGigs.map((gig) => (
              <div key={gig._id} className="glass-card rounded-[2rem] border border-white/10 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{gig.title}</h3>
                    <p className="mt-2 text-slate-400">{gig.description}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span>Budget: ${gig.budget}</span>
                      <span>{gig.category}</span>
                      <span>{gig.location}</span>
                      {gig.invitedFreelancers?.length > 0 && <span>{gig.invitedFreelancers.length} invited</span>}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-200">{gig.status}</span>
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <h4 className="font-semibold text-white">Submit a proposal</h4>
                    <div className="flex flex-wrap gap-2">
                      {userRole === "client" && (
                        <>
                          <button
                            onClick={() => toggleRecommendations(gig._id)}
                            className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20"
                          >
                            {recommendationsOpen[gig._id] ? "Hide AI recommendations" : "Show AI freelancer recommendations"}
                          </button>
                          <button
                            onClick={() => handleToggleProposals(gig._id)}
                            className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                          >
                            {viewingProposals[gig._id] ? "Hide proposals" : "View proposals"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {viewingProposals[gig._id] && gigProposals[gig._id] && (
                    <div className="mt-4 rounded-3xl border border-slate-700 bg-slate-900 p-4">
                      <h5 className="font-semibold text-white mb-3">Proposals for this gig</h5>
                      {gigProposals[gig._id].length === 0 ? (
                        <p className="text-sm text-slate-400">No proposals have been submitted yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {gigProposals[gig._id].map((proposal) => (
                            <div key={proposal._id} className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="text-sm text-slate-400">{proposal.freelancer?.fullName || proposal.freelancer}</p>
                                  <p className="text-white">{proposal.proposalText}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-slate-400">Bid: ${proposal.bidAmount}</p>
                                  <p className="text-sm font-semibold text-cyan-300">Status: {proposal.status}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <textarea value={proposalForms[gig._id]?.proposalText || ""} onChange={(e) => handleProposalChange(gig._id, "proposalText", e.target.value)} placeholder="Describe your approach" className="auth-input mt-4 w-full rounded-3xl px-4 py-3" rows="4" />
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input type="number" value={proposalForms[gig._id]?.bidAmount || ""} onChange={(e) => handleProposalChange(gig._id, "bidAmount", e.target.value)} placeholder="Bid amount" className="auth-input w-full rounded-3xl px-4 py-3" />
                    <input value={proposalForms[gig._id]?.estimatedTime || ""} onChange={(e) => handleProposalChange(gig._id, "estimatedTime", e.target.value)} placeholder="Estimated time" className="auth-input w-full rounded-3xl px-4 py-3" />
                  </div>
                  <button onClick={() => handleProposalSubmit(gig._id)} disabled={submittingId === gig._id} className="brand-button mt-4 rounded-3xl px-5 py-3 text-base font-semibold disabled:opacity-60">
                    {submittingId === gig._id ? "Submitting..." : "Send Proposal"}
                  </button>
                  {recommendationsOpen[gig._id] && (
                    <div className="mt-6 rounded-3xl border border-cyan-500/20 bg-slate-900/90 p-4">
                      <h5 className="font-semibold text-white mb-3">AI Recommended Freelancers</h5>
                      {recommendationLoading[gig._id] ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
                        </div>
                      ) : recommendationError[gig._id] ? (
                        <p className="text-sm text-red-400">{recommendationError[gig._id]}</p>
                      ) : recommendations[gig._id]?.length > 0 ? (
                        <div className="space-y-3">
                          {recommendations[gig._id].map((freelancer) => (
                            <div key={freelancer.freelancerId} className="rounded-3xl border border-cyan-500/20 bg-slate-950/90 p-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div>
                                  <p className="text-sm text-slate-400">{freelancer.title}</p>
                                  <h6 className="text-lg font-semibold text-white">{freelancer.name}</h6>
                                  <p className="text-sm text-slate-500">Rating: {freelancer.rating} • Match: {freelancer.matchScore}%</p>
                                </div>
                                <div className="space-y-2 text-right">
                                  <p className="text-xs text-slate-400">Skill: {freelancer.skillMatch}%</p>
                                  <p className="text-xs text-slate-400">Experience: {freelancer.experience} yrs</p>
                                  <button
                                    type="button"
                                    onClick={() => handleInviteFreelancer(gig._id, freelancer.freelancerId)}
                                    className="mt-3 inline-flex items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-500/20"
                                  >
                                    {inviteStatus[freelancer.freelancerId] === 'loading'
                                      ? 'Inviting…'
                                      : inviteStatus[freelancer.freelancerId] === 'invited'
                                      ? 'Invited'
                                      : 'Invite to Bid'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">No recommended freelancers are available right now.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filteredGigs.length === 0 && <div className="rounded-[1.75rem] border border-dashed border-slate-700 bg-slate-950/80 p-8 text-center text-slate-400">No gigs match your search yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Gigs;
