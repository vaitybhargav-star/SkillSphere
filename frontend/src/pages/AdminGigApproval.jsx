import { useEffect, useState } from "react";
import api from "../services/api";
import "./AdminGigApproval.css";

function AdminGigApproval() {
  const [pendingGigs, setPendingGigs] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState("");
  const [selectedGigForReview, setSelectedGigForReview] = useState(null);
  const [approvalForm, setApprovalForm] = useState({ action: "", reason: "", notes: "" });

  const loadPendingGigs = async () => {
    try {
      const res = await api.get("/admin/gigs/pending");
      setPendingGigs(res.data.gigs || []);
    } catch (error) {
      console.error("Error loading pending gigs:", error);
      setFeedback("Failed to load pending gigs");
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get("/admin/gigs/stats");
      setStats(res.data.stats || { pending: 0, approved: 0, rejected: 0, total: 0 });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  useEffect(() => {
    const loadUserRole = () => {
      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          const parsed = JSON.parse(raw);
          setRole(parsed?.role || "");
        }
      } catch (err) {
        console.warn("Failed to load user role", err);
      }
    };

    loadUserRole();

    let active = true;

    const fetchAll = async () => {
      if (active) {
        await loadPendingGigs();
        await loadStats();
      }
    };

    void fetchAll();

    return () => {
      active = false;
    };
  }, []);

  const handleApproveGig = async (gigId) => {
    if (isLoading) return;

    if (role !== "admin") {
      setFeedback("Admin access required");
      return;
    }

    setIsLoading(true);
    try {
      await api.post(`/admin/gigs/${gigId}/approve`, {
        notes: approvalForm.notes,
      });
      setFeedback("Gig approved successfully");
      setSelectedGigForReview(null);
      setApprovalForm({ action: "", reason: "", notes: "" });
      setTimeout(() => {
        setFeedback("");
        loadPendingGigs();
        loadStats();
      }, 2000);
    } catch (error) {
      setFeedback(error.response?.data?.message || "Failed to approve gig");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectGig = async (gigId) => {
    if (isLoading) return;

    if (!approvalForm.reason) {
      setFeedback("Please provide a rejection reason");
      return;
    }

    if (role !== "admin") {
      setFeedback("Admin access required");
      return;
    }

    setIsLoading(true);
    try {
      await api.post(`/admin/gigs/${gigId}/reject`, {
        reason: approvalForm.reason,
      });
      setFeedback("Gig rejected successfully");
      setSelectedGigForReview(null);
      setApprovalForm({ action: "", reason: "", notes: "" });
      setTimeout(() => {
        setFeedback("");
        loadPendingGigs();
        loadStats();
      }, 2000);
    } catch (error) {
      setFeedback(error.response?.data?.message || "Failed to reject gig");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setApprovalForm((prev) => ({ ...prev, [name]: value }));
  };

  const closeModal = () => {
    setSelectedGigForReview(null);
    setApprovalForm({ action: "", reason: "", notes: "" });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="admin-gig-approval-container">
      <div className="approval-header">
        <h1>Gig Approval Workflow</h1>
        <p>Review and approve pending gigs before they go live</p>
      </div>

      {feedback && (
        <div className={`feedback-message ${feedback.includes("successfully") ? "success" : "error"}`}>
          {feedback}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="stats-cards">
        <div className="stat-card pending">
          <div className="stat-number">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card approved">
          <div className="stat-number">{stats.approved}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-number">{stats.rejected}</div>
          <div className="stat-label">Rejected</div>
        </div>
        <div className="stat-card total">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
      </div>

      {/* Pending Gigs Table */}
      <div className="pending-gigs-section">
        <div className="section-header">
          <h2>Pending Gigs ({stats.pending})</h2>
        </div>

        {pendingGigs.length === 0 ? (
          <div className="empty-state">
            <p>No pending gigs to review</p>
          </div>
        ) : (
          <div className="gigs-table">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Budget</th>
                  <th>Category</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingGigs.map((gig) => (
                  <tr key={gig._id}>
                    <td className="gig-title">
                      <strong>{gig.title}</strong>
                      <p className="description">{gig.description.substring(0, 50)}...</p>
                    </td>
                    <td>{gig.client?.fullName || "Unknown"}</td>
                    <td className="budget">${gig.budget.toFixed(2)}</td>
                    <td>{gig.category}</td>
                    <td>{formatDate(gig.createdAt)}</td>
                    <td className="actions">
                      <button
                        className="view-btn"
                        onClick={() => {
                          setSelectedGigForReview(gig);
                          setApprovalForm({ action: "", reason: "", notes: "" });
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedGigForReview && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Review Gig: {selectedGigForReview.title}</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="gig-details">
                <h3>Gig Information</h3>
                <p><strong>Title:</strong> {selectedGigForReview.title}</p>
                <p><strong>Client:</strong> {selectedGigForReview.client?.fullName}</p>
                <p><strong>Email:</strong> {selectedGigForReview.client?.email}</p>
                <p><strong>Budget:</strong> ${selectedGigForReview.budget.toFixed(2)}</p>
                <p><strong>Category:</strong> {selectedGigForReview.category}</p>
                <p><strong>Description:</strong> {selectedGigForReview.description}</p>
                {selectedGigForReview.skills && selectedGigForReview.skills.length > 0 && (
                  <p><strong>Skills:</strong> {selectedGigForReview.skills.join(", ")}</p>
                )}
                {selectedGigForReview.milestones && selectedGigForReview.milestones.length > 0 && (
                  <div>
                    <strong>Milestones:</strong>
                    <ul>
                      {selectedGigForReview.milestones.map((m, i) => (
                        <li key={i}>
                          {m.title} - ${m.paymentAmount || m.amount || 0}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="review-form">
                <h3>Review Decision</h3>
                <div className="form-group">
                  <label>
                    <input
                      type="radio"
                      name="action"
                      value="approve"
                      checked={approvalForm.action === "approve"}
                      onChange={handleInputChange}
                    />
                    Approve
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="radio"
                      name="action"
                      value="reject"
                      checked={approvalForm.action === "reject"}
                      onChange={handleInputChange}
                    />
                    Reject
                  </label>
                </div>

                {approvalForm.action === "approve" && (
                  <div className="form-group">
                    <label htmlFor="notes">Approval Notes (Optional)</label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={approvalForm.notes}
                      onChange={handleInputChange}
                      placeholder="Add any notes for the client..."
                      rows="3"
                    />
                  </div>
                )}

                {approvalForm.action === "reject" && (
                  <div className="form-group">
                    <label htmlFor="reason">Rejection Reason (Required)</label>
                    <textarea
                      id="reason"
                      name="reason"
                      value={approvalForm.reason}
                      onChange={handleInputChange}
                      placeholder="Explain why this gig is being rejected..."
                      rows="3"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeModal}>
                Cancel
              </button>
              {approvalForm.action === "approve" && (
                <button
                  className="approve-btn"
                  onClick={() => handleApproveGig(selectedGigForReview._id)}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Approve"}
                </button>
              )}
              {approvalForm.action === "reject" && (
                <button
                  className="reject-btn"
                  onClick={() => handleRejectGig(selectedGigForReview._id)}
                  disabled={isLoading || !approvalForm.reason}
                >
                  {isLoading ? "Processing..." : "Reject"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminGigApproval;
