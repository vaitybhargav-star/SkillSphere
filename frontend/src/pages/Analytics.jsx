import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";

function Analytics() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError("");
      try {
        const raw = localStorage.getItem("user");
        const user = raw ? JSON.parse(raw) : null;

        if (!user || !user._id) {
          setError("Unable to read user profile. Please log in again.");
          return;
        }

        if (user.role !== "freelancer") {
          setError("Analytics dashboards are available for freelancer accounts. Use the Profile page to switch your role or contact support.");
          return;
        }

        const res = await api.get(`/analytics/freelancer/${user._id}/overview`);
        setOverview(res.data.data);
      } catch (err) {
        console.error("Error loading analytics", err);
        setError(err.response?.data?.message || "Unable to load analytics.");
      } finally {
        setLoading(false);
      }
    };

    void loadAnalytics();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="mt-2 text-gray-600">Review your growth, earnings, and reputation across the platform.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-700">Loading analytics...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Total Proposals</p>
              <h2 className="mt-2 text-3xl font-semibold">{overview.stats.totalProposals}</h2>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Completed Projects</p>
              <h2 className="mt-2 text-3xl font-semibold">{overview.stats.completedProjects}</h2>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">Average Rating</p>
              <h2 className="mt-2 text-3xl font-semibold">{overview.stats.averageRating}</h2>
            </div>
          </div>
        )}

        {!loading && !error && overview && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Success Rates</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Proposal acceptance</span>
                  <span>{overview.successRates.proposalAcceptanceRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Project completion</span>
                  <span>{overview.successRates.projectCompletionRate}%</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Profile Summary</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Profile completion</span>
                  <span>{overview.profileCompletion}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Total reviews</span>
                  <span>{overview.stats.totalReviews}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total earnings</span>
                  <span>${overview.stats.totalEarnings}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Analytics;
