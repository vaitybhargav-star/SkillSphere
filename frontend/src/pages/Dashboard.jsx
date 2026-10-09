import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import TrendingSkills from "../components/TrendingSkills";
import { RecommendedGigs } from "../components/RecommendedGigs";
import MainLayout from "../layouts/MainLayout";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [gigs, setGigs] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      let timeoutId;
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const [profileRes, gigsRes] = await Promise.all([
          api.get("/profile", { signal: controller.signal }),
          api.get("/gigs", { signal: controller.signal }),
        ]);
        clearTimeout(timeoutId);

        setUser(profileRes.data.user || profileRes.data?.user);
        setGigs(gigsRes.data.gigs || []);
      } catch (error) {
        console.error(error);
        if (error.name === 'AbortError') {
          console.error("Request timeout - profile or gigs API taking too long");
        }
      } finally {
        clearTimeout(timeoutId);
      }
    };

    loadData();
  }, []);

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="rounded-[2rem] bg-gradient-to-r from-cyan-500/15 via-slate-900/80 to-violet-500/15 border border-white/10 p-8 shadow-[0_30px_80px_rgba(2,_6,_23,_0.45)] backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-200/75">SkillSphere workspace</p>
            <h1 className="text-4xl font-extrabold mt-3 text-white">Welcome back, {user?.fullName || "there"}</h1>
            <p className="mt-3 max-w-2xl text-slate-300">Manage gigs, collaborate with clients, and stay on top of every project from a clean and modern dashboard.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-card rounded-[1.75rem] p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Your Role</p>
              <h2 className="text-3xl font-semibold mt-4 capitalize text-white">{user?.role || "client"}</h2>
            </div>
            <div className="glass-card rounded-[1.75rem] p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Verification</p>
              <h2 className="text-3xl font-semibold mt-4 text-white">{user?.isVerified ? "Verified" : "Pending"}</h2>
            </div>
            <div className="glass-card rounded-[1.75rem] p-6">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Open Gigs</p>
              <h2 className="text-3xl font-semibold mt-4 text-white">{gigs.length}</h2>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-[1.75rem] p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Recent Gigs</h2>
                <Link to="/gigs" className="text-cyan-300 font-medium hover:text-cyan-200">View Marketplace</Link>
              </div>
              <div className="space-y-4">
                {gigs.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">No gigs are available yet.</div>
                ) : (
                  gigs.slice(0, 5).map((gig) => (
                    <div key={gig._id} className="rounded-3xl border border-white/10 p-4 bg-slate-950/80">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-white">{gig.title}</h3>
                          <p className="mt-1 text-sm text-slate-400">Budget: ${gig.budget} • {gig.category}</p>
                        </div>
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-200">{gig.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-card rounded-[1.75rem] p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link to="/gigs" className="block rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-4 text-white transition hover:border-cyan-400/30 hover:bg-slate-900">Post or browse gigs</Link>
                <Link to="/messages" className="block rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-4 text-white transition hover:border-cyan-400/30 hover:bg-slate-900">Open your messages</Link>
                <Link to="/disputes" className="block rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-4 text-white transition hover:border-cyan-400/30 hover:bg-slate-900">Manage disputes</Link>
                <Link to="/profile" className="block rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-4 text-white transition hover:border-cyan-400/30 hover:bg-slate-900">Edit your profile</Link>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-[1.75rem] p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Trending Skills</h2>
              <TrendingSkills />
            </div>

            {user?.role === "freelancer" ? (
              <div className="glass-card rounded-[1.75rem] p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Recommended Gigs</h2>
                <RecommendedGigs freelancerId={user._id} />
              </div>
            ) : (
              <div className="glass-card rounded-[1.75rem] p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Platform Insights</h2>
                <p className="text-slate-400">Trending skills and AI matching help you discover top freelancers and high-demand work.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default Dashboard;