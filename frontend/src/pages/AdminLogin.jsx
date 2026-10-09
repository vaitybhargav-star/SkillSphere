import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      if (!res?.data?.success) {
        setError(res?.data?.message || "Login failed");
        setLoading(false);
        return;
      }

      if (res.data.twoFactorRequired) {
        localStorage.setItem("twoFactorToken", res.data.twoFactorToken);
        navigate('/2fa/verify');
        return;
      }

      const token = res.data.token;
      const user = res.data.user;
      const isAdmin = user && typeof user.role === "string" && user.role.toLowerCase() === "admin";

      if (!isAdmin) {
        setError("This login does not belong to an admin account. Use a valid admin account.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      navigate("/admin", { replace: true });
    } catch (err) {
      console.error("AdminLogin error", err);
      setError(err.response?.data?.message || err.message || "Login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="hero-panel rounded-[2rem] p-10 text-slate-100 shadow-[0_30px_80px_rgba(2,_6,_23,_0.48)]">
            <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/75">Admin Dashboard Access</p>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Secure admin access for SkillSphere.
            </h1>
            <p className="mt-6 max-w-xl text-slate-300 leading-8">
              Sign in with your admin credentials to manage users, approve gigs, review payments, and monitor platform health from the admin console.
            </p>
            <div className="mt-10 space-y-4 rounded-3xl border border-cyan-400/10 bg-slate-950/70 p-6">
              <div className="text-sm text-slate-300 uppercase tracking-[0.24em] text-cyan-300/80">Admin tools</div>
              <ul className="space-y-3 text-slate-300 text-sm">
                <li>• Manage users and suspend accounts</li>
                <li>• Verify freelancers and approve gigs</li>
                <li>• Monitor payments and refunds</li>
                <li>• Track platform revenue and job success</li>
              </ul>
            </div>
          </div>

          <div className="auth-card rounded-[2rem] p-10">
            <div className="mb-8 space-y-3 text-center">
              <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/75">Admin Login</p>
              <h2 className="text-3xl font-bold text-white">Manage the platform securely</h2>
              <p className="text-slate-400">Login with your admin account to access the admin dashboard.</p>
            </div>

            {error && (
              <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Email</label>
                <input
                  className="auth-input w-full rounded-3xl border border-slate-800/70 bg-slate-950/85 px-5 py-3 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="admin@skillsphere.com"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
                <input
                  className="auth-input w-full rounded-3xl border border-slate-800/70 bg-slate-950/85 px-5 py-3 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                disabled={loading}
                className="brand-button w-full rounded-3xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign in as Admin"}
              </button>
            </form>

            <div className="mt-6 rounded-3xl border border-slate-800/70 bg-slate-950/80 px-5 py-4 text-sm text-slate-400">
              Use admin credentials or Google SSO with an admin role to access the admin dashboard.
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default AdminLogin;
