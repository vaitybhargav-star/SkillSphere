import { useEffect, useState } from "react";
import api from "../services/api";
import "./Payouts.css";

function Payouts() {
  const [availableBalance, setAvailableBalance] = useState(0);
  const [totalReleased, setTotalReleased] = useState(0);
  const [totalRequested, setTotalRequested] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [form, setForm] = useState({ amount: "", bankAccountId: "", payoutMethod: "bank_transfer" });
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("balance");
  const [role, setRole] = useState("");

  const loadBalance = async () => {
    try {
      const res = await api.get("/payouts/balance");
      setAvailableBalance(res.data.availableBalance || 0);
      setTotalReleased(res.data.totalReleased || 0);
      setTotalRequested(res.data.totalRequested || 0);
    } catch (error) {
      console.error("Error loading balance:", error);
      setFeedback("Failed to load balance");
    }
  };

  const loadPendingPayouts = async () => {
    try {
      const res = await api.get("/payouts/pending");
      setPendingPayouts(res.data.payouts || []);
    } catch (error) {
      console.error("Error loading pending payouts:", error);
    }
  };

  const loadPayoutHistory = async () => {
    try {
      const res = await api.get("/payouts/history");
      setPayoutHistory(res.data.payouts || []);
    } catch (error) {
      console.error("Error loading payout history:", error);
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
        await loadBalance();
        await loadPendingPayouts();
        await loadPayoutHistory();
      }
    };

    void fetchAll();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    if (role !== "freelancer") {
      setFeedback("Payouts are only available for freelancers");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setFeedback("Please enter a valid amount");
      return;
    }

    if (Number(form.amount) > availableBalance) {
      setFeedback(`Amount exceeds available balance (${availableBalance})`);
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/payouts/request", {
        amount: Number(form.amount),
        bankAccountId: form.bankAccountId || undefined,
        payoutMethod: form.payoutMethod,
      });
      setForm({ amount: "", bankAccountId: "", payoutMethod: "bank_transfer" });
      setFeedback("Payout request created successfully");
      setTimeout(() => {
        setFeedback("");
        loadBalance();
        loadPendingPayouts();
      }, 2000);
    } catch (error) {
      setFeedback(error.response?.data?.message || "Failed to request payout");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="payouts-container">
      <div className="payouts-header">
        <h1>Freelancer Payouts</h1>
        <p>Manage your earnings and request withdrawals</p>
      </div>

      {feedback && (
        <div className={`feedback-message ${feedback.includes("successfully") ? "success" : "error"}`}>
          {feedback}
        </div>
      )}

      {/* Balance Cards */}
      <div className="balance-cards">
        <div className="card balance-card">
          <h3>Available Balance</h3>
          <div className="balance-amount">${availableBalance.toFixed(2)}</div>
          <p className="balance-subtext">Ready to withdraw</p>
        </div>

        <div className="card stats-card">
          <h3>Total Released</h3>
          <div className="stat-amount">${totalReleased.toFixed(2)}</div>
          <p className="stat-subtext">From completed projects</p>
        </div>

        <div className="card stats-card">
          <h3>Total Requested</h3>
          <div className="stat-amount">${totalRequested.toFixed(2)}</div>
          <p className="stat-subtext">Pending payouts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "balance" ? "active" : ""}`}
          onClick={() => setActiveTab("balance")}
        >
          Request Payout
        </button>
        <button
          className={`tab-button ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Payouts ({pendingPayouts.length})
        </button>
        <button
          className={`tab-button ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "balance" && (
          <div className="request-payout-form">
            <div className="card">
              <h2>Request Payout</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="amount">Amount (USD)</label>
                  <input
                    id="amount"
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={availableBalance}
                    required
                  />
                  <p className="help-text">Max available: ${availableBalance.toFixed(2)}</p>
                </div>

                <div className="form-group">
                  <label htmlFor="payoutMethod">Payout Method</label>
                  <select
                    id="payoutMethod"
                    name="payoutMethod"
                    value={form.payoutMethod}
                    onChange={handleInputChange}
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="stripe_connect">Stripe Connect</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="bankAccountId">Bank Account ID</label>
                  <input
                    id="bankAccountId"
                    type="text"
                    name="bankAccountId"
                    value={form.bankAccountId}
                    onChange={handleInputChange}
                    placeholder="Optional: Your saved bank account ID"
                  />
                  <p className="help-text">Leave blank to use your default account</p>
                </div>

                <button type="submit" disabled={isLoading || availableBalance === 0}>
                  {isLoading ? "Processing..." : "Request Payout"}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "pending" && (
          <div className="pending-payouts">
            {pendingPayouts.length === 0 ? (
              <div className="empty-state">
                <p>No pending payouts</p>
              </div>
            ) : (
              <div className="payouts-table">
                <table>
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Method</th>
                      <th>Requested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayouts.map((payout) => (
                      <tr key={payout._id}>
                        <td className="amount">${payout.amount.toFixed(2)}</td>
                        <td>
                          <span className={`status-badge ${payout.status}`}>
                            {payout.status}
                          </span>
                        </td>
                        <td>{payout.payoutMethod === "bank_transfer" ? "Bank Transfer" : "Stripe"}</td>
                        <td>{formatDate(payout.requestDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="payout-history">
            {payoutHistory.length === 0 ? (
              <div className="empty-state">
                <p>No payout history</p>
              </div>
            ) : (
              <div className="payouts-table">
                <table>
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Method</th>
                      <th>Completed</th>
                      <th>Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutHistory.map((payout) => (
                      <tr key={payout._id}>
                        <td className="amount">${payout.amount.toFixed(2)}</td>
                        <td>
                          <span className={`status-badge ${payout.status}`}>
                            {payout.status}
                          </span>
                        </td>
                        <td>{payout.payoutMethod === "bank_transfer" ? "Bank Transfer" : "Stripe"}</td>
                        <td>{payout.completionDate ? formatDate(payout.completionDate) : "N/A"}</td>
                        <td className="transaction-id">{payout.transactionId || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Payouts;
