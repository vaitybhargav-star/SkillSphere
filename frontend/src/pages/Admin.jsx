import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

function Admin() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [stats, setStats] = useState(null);
  const [fraudData, setFraudData] = useState(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [trendingSkills, setTrendingSkills] = useState([]);
  const [schedulerRuns, setSchedulerRuns] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        // Load comprehensive dashboard data
        try {
          const dashboardRes = await api.get("/admin/dashboard");
          if (active) setDashboard(dashboardRes.data.dashboard);
        } catch (err) {
          console.warn("Comprehensive dashboard not available, loading individual data");
        }

        const [statsRes, usersRes, fraudRes, paymentsRes] = await Promise.all([
          api.get("/admin/stats"),
          api.get("/admin/users"),
          api.get("/admin/fraud/detect").catch(() => null),
          api.get("/admin/payments/analytics").catch(() => null),
        ]);

        if (!active) return;

        setStats(statsRes.data.stats);
        setUsers(usersRes.data.users || []);

        if (fraudRes) setFraudData(fraudRes.data.data);
        if (paymentsRes) setPaymentAnalytics(paymentsRes.data.data);
      } catch (error) {
        console.error("Error loading admin data:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  // Load jobs view when tab selected
  useEffect(() => {
    if (activeTab !== 'jobs') return;
    let active = true;
    (async () => {
      try {
        setJobsLoading(true);
        const [res1, res2] = await Promise.all([
          api.get('/admin/trending-skills?limit=20').catch(() => ({ data: { skills: [] } })),
          api.get('/admin/jobs/runs?limit=20').catch(() => ({ data: { runs: [] } })),
        ]);
        if (!active) return;
        setTrendingSkills(res1.data.skills || []);
        setSchedulerRuns(res2.data.runs || []);
      } catch (e) {
        console.error('Failed to load jobs view', e);
      } finally {
        setJobsLoading(false);
      }
    })();

    return () => { active = false; };
  }, [activeTab]);

  const handleToggleStatus = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/toggle-status`);
      const usersRes = await api.get("/admin/users");
      setUsers(usersRes.data.users || []);
    } catch (error) {
      alert(error.response?.data?.message || "Unable to update user status");
    }
  };

  const handleVerifyFreelancer = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/verify`);
      const usersRes = await api.get("/admin/users");
      setUsers(usersRes.data.users || []);
      alert("Freelancer verified successfully!");
    } catch (error) {
      alert(error.response?.data?.message || "Unable to verify freelancer");
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color = "blue" }) => {
    const colorClasses = {
      blue: "bg-blue-50 text-blue-600",
      green: "bg-green-50 text-green-600",
      red: "bg-red-50 text-red-600",
      yellow: "bg-yellow-50 text-yellow-600",
    };

    return (
      <div className="glass-card rounded-[1.75rem] p-6 border-l-4 border-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">{title}</p>
            <h3 className="text-3xl font-bold mt-2 text-white">{value}</h3>
            {subtitle && <p className="text-slate-400 text-xs mt-1">{subtitle}</p>}
          </div>
          {icon && <div className={`text-3xl ${colorClasses[color]}`}>{icon}</div>}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400 mt-2">Monitor platform activity, manage accounts, and detect fraud</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 border-b border-slate-700">
            {['overview', 'users', 'fraud', 'payments', 'gigs', 'jobs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-4 font-medium ${
                  activeTab === tab
                    ? "text-cyan-300 border-b-2 border-cyan-300"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Users" value={stats?.userCount || 0} icon="👥" color="blue" />
              <StatCard title="Freelancers" value={stats?.freelancerCount || 0} icon="💼" color="green" />
              <StatCard title="Active Gigs" value={stats?.activeGigs || 0} icon="🚀" color="yellow" />
              <StatCard
                title="Completed Work"
                value={stats?.completedProposals || 0}
                icon="✅"
                color="green"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass-card rounded-[1.75rem] p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Platform Revenue</h3>
                <p className="text-3xl font-bold text-white">${(stats?.totalPayouts * 0.1).toFixed(2)}</p>
                <p className="text-slate-400 text-sm mt-2">Total Payouts: ${stats?.totalPayouts.toFixed(2)}</p>
              </div>

              <div className="glass-card rounded-[1.75rem] p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Quick Actions</h3>
                <button
                  onClick={() => setActiveTab("gigs")}
                  className="w-full bg-cyan-500 text-white py-2 rounded-lg mb-2 hover:bg-cyan-400"
                >
                  Review Pending Gigs
                </button>
                <button
                  onClick={() => setActiveTab("fraud")}
                  className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-500"
                >
                  Check Fraud Detection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === "users" && (
          <div className="glass-card rounded-[1.75rem] p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">User Management</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400">Name</th>
                    <th className="text-left py-3 px-4 text-slate-400">Email</th>
                    <th className="text-left py-3 px-4 text-slate-400">Role</th>
                    <th className="text-left py-3 px-4 text-slate-400">Status</th>
                    <th className="text-left py-3 px-4 text-slate-400">Verified</th>
                    <th className="text-left py-3 px-4 text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 20).map((user) => (
                    <tr key={user._id} className="border-b border-slate-700 hover:bg-slate-900/60">
                      <td className="py-3 px-4 text-white">{user.fullName}</td>
                      <td className="py-3 px-4 text-slate-300">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 bg-slate-800 text-cyan-300 rounded-full text-sm">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            user.status === "active"
                              ? "bg-emerald-500/15 text-emerald-200"
                              : "bg-red-500/15 text-red-200"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{user.isVerified ? "✅" : "❌"}</td>
                      <td className="py-3 px-4 space-x-2">
                        <button
                          onClick={() => handleToggleStatus(user._id)}
                          className="text-sm bg-cyan-500 text-white px-2 py-1 rounded hover:bg-cyan-400"
                        >
                          {user.status === "active" ? "Suspend" : "Activate"}
                        </button>
                        {user.role === "freelancer" && !user.verificationBadge && (
                          <button
                            onClick={() => handleVerifyFreelancer(user._id)}
                            className="text-sm bg-emerald-500 text-white px-2 py-1 rounded hover:bg-emerald-400"
                          >
                            Verify
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FRAUD TAB */}
        {activeTab === "fraud" && (
          <div className="space-y-6">
            {fraudData ? (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="glass-card rounded-[1.75rem] p-6 border-l-4 border-red-500">
                    <h3 className="font-semibold text-white mb-2">⚠️ Suspicious Spammers</h3>
                    <p className="text-2xl font-bold text-red-300">
                      {fraudData.suspiciousProposalSpammers}
                    </p>
                    <p className="text-sm text-slate-400 mt-2">
                      Users submitting excessive proposals (50+/day)
                    </p>
                  </div>

                  <div className="glass-card rounded-[1.75rem] p-6 border-l-4 border-yellow-400">
                    <h3 className="font-semibold text-white mb-2">🔍 Review Manipulation</h3>
                    <p className="text-2xl font-bold text-yellow-300">
                      {fraudData.suspiciousReviewManipulators}
                    </p>
                    <p className="text-sm text-slate-400 mt-2">
                      Accounts receiving suspicious 5-star reviews (20+/week)
                    </p>
                  </div>
                </div>

                {fraudData.details?.suspiciousUsers?.length > 0 && (
                  <div className="glass-card rounded-[1.75rem] p-6">
                    <h3 className="font-semibold text-white mb-4">Suspicious Accounts Detail</h3>
                    <div className="space-y-2">
                      {fraudData.details.suspiciousUsers.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-900 rounded">
                          <p className="font-mono text-sm text-slate-300">ID: {item._id}</p>
                          <p className="text-sm text-slate-400">{item.count} proposals in last 24 hours</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-card rounded-[1.75rem] p-6 text-center">
                <p className="text-slate-400">Fraud detection data not available</p>
              </div>
            )}
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === "payments" && (
          <div className="space-y-6">
            {paymentAnalytics ? (
              <>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="glass-card rounded-[1.75rem] p-6">
                    <p className="text-slate-400">Total Payments</p>
                    <h2 className="text-3xl font-bold mt-2 text-white">{paymentAnalytics.totalPayments}</h2>
                  </div>
                  <div className="glass-card rounded-[1.75rem] p-6">
                    <p className="text-slate-400">Total Amount</p>
                    <h2 className="text-3xl font-bold mt-2 text-white">
                      ${paymentAnalytics.totalAmount?.toFixed(2) || 0}
                    </h2>
                  </div>
                  <div className="glass-card rounded-[1.75rem] p-6">
                    <p className="text-slate-400">Platform Revenue (10%)</p>
                    <h2 className="text-3xl font-bold mt-2 text-white">
                      ${(paymentAnalytics.totalAmount * 0.1)?.toFixed(2) || 0}
                    </h2>
                  </div>
                </div>

                {paymentAnalytics.escrowAnalytics?.length > 0 && (
                  <div className="glass-card rounded-[1.75rem] p-6">
                    <h3 className="font-semibold mb-4 text-white">Escrow Status</h3>
                    <div className="grid md:grid-cols-4 gap-4">
                      {paymentAnalytics.escrowAnalytics.map((item, idx) => (
                        <div key={idx} className="p-4 border border-slate-700 rounded-lg bg-slate-950/80">
                          <p className="text-slate-400 text-sm capitalize">{item._id}</p>
                          <p className="font-bold text-lg mt-2 text-white">{item.count}</p>
                          <p className="text-slate-400 text-xs mt-1">
                            ${item.total?.toFixed(2) || 0}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-card rounded-[1.75rem] p-6 text-center">
                <p className="text-slate-400">Payment analytics not available</p>
              </div>
            )}
          </div>
        )}

        {/* GIGS TAB */}
        {activeTab === "gigs" && (
          <div className="glass-card rounded-[1.75rem] p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Gig Management</h2>
            <button
              onClick={() => navigate("/admin-gig-approval")}
              className="bg-cyan-500 text-slate-950 px-6 py-2 rounded-lg hover:bg-cyan-400"
            >
              Go to Gig Approval Page →
            </button>
          </div>
        )}

        {/* JOBS TAB */}
        {activeTab === "jobs" && (
          <div className="space-y-6">
            <div className="glass-card rounded-[1.75rem] p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Scheduler & Trending</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2 text-white">Trending Skills (Top 20)</h3>
                  <div className="space-y-2">
                    {trendingSkills.length === 0 ? (
                      <p className="text-slate-400 text-sm">No trending skills available</p>
                    ) : (
                      trendingSkills.slice(0,20).map((s) => (
                        <div key={s._id || s.skill} className="flex justify-between p-2 border border-slate-700 rounded bg-slate-950/80">
                          <div className="font-medium text-white">{s.skill}</div>
                          <div className="text-sm text-slate-400">{s.count} • {s.score.toFixed(3)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-white">Recent Scheduler Runs</h3>
                  <div className="space-y-2 max-h-60 overflow-auto">
                    {schedulerRuns.length === 0 ? (
                      <p className="text-slate-400 text-sm">No run history yet</p>
                    ) : (
                      schedulerRuns.slice(0,20).map((r) => (
                        <div key={r._id} className="p-2 border border-slate-700 rounded bg-slate-950/90">
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <div className="font-medium text-white">{r.taskType}</div>
                                <div className="text-xs text-slate-400">{new Date(r.startedAt).toLocaleString()}</div>
                              </div>
                              <button
                                onClick={() => setSelectedRun(r)}
                                className="text-sm bg-slate-700 text-slate-100 px-2 py-1 rounded hover:bg-slate-600"
                              >
                                View details
                              </button>
                            </div>
                            <div className="text-sm text-slate-400">Status: {r.status} {r.durationMs ? `• ${r.durationMs}ms` : ''}</div>
                            {r.error && <div className="text-xs text-red-400 mt-1">Error: {r.error}</div>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-3 flex-wrap">
                <button
                  onClick={async () => {
                    setJobsLoading(true);
                    try {
                      await api.post('/admin/jobs/run-embeddings');
                      alert('Embeddings refresh triggered');
                    } catch (e) { alert(e.response?.data?.message || 'Failed to trigger'); }
                    setJobsLoading(false);
                  }}
                  className="bg-cyan-500 text-slate-950 px-4 py-2 rounded hover:bg-cyan-400"
                >
                  Run Embeddings Now
                </button>

                <button
                  onClick={async () => {
                    setJobsLoading(true);
                    try {
                      await api.post('/admin/jobs/run-trending');
                      alert('Trending computation triggered');
                    } catch (e) { alert(e.response?.data?.message || 'Failed to trigger'); }
                    setJobsLoading(false);
                  }}
                  className="bg-emerald-500 text-slate-950 px-4 py-2 rounded hover:bg-emerald-400"
                >
                  Run Trending Now
                </button>

                <button
                  onClick={async () => {
                    setJobsLoading(true);
                    try {
                      const res1 = await api.get('/admin/trending-skills?limit=20');
                      const res2 = await api.get('/admin/jobs/runs?limit=20');
                      setTrendingSkills(res1.data.skills || []);
                      setSchedulerRuns(res2.data.runs || []);
                    } catch (e) {
                      alert('Failed to refresh jobs');
                    }
                    setJobsLoading(false);
                  }}
                  className="bg-slate-700 text-slate-100 px-4 py-2 rounded hover:bg-slate-600"
                >
                  Refresh View
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </MainLayout>
  );
}

export default Admin;
