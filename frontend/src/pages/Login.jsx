import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();
  const { setAuthToken, setAuthUser } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [adminOnly, setAdminOnly] = useState(false);
  const [googleError] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("error") === "google-not-configured"
      ? "Google sign-in is not configured for this deployment."
      : "";
  });
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    // If already logged in, redirect to home
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/", { replace: true });
      return;
    }
  }, [navigate]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get("/config");
        setGoogleEnabled(res.data.config.googleConfigured);
      } catch (err) {
        console.warn("Unable to fetch auth configuration", err);
      } finally {
        setConfigLoaded(true);
      }
    };
    void fetchConfig();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await api.post("/auth/login", formData);

      if (res.data?.twoFactorRequired) {
        localStorage.setItem("pending2faToken", res.data.twoFactorToken);
        navigate("/2fa/verify");
        return;
      }

      // If checkbox asked for admin only, enforce it client-side for convenience
      if (adminOnly && !(res.data.user && res.data.user.role === 'admin')) {
        alert('This account is not an admin. Please use the correct admin credentials.');
        setLoading(false);
        return;
      }

      // Save JWT Token and user through Auth context
      setAuthToken(res.data.token);
      setAuthUser(res.data.user);
      // After login, prefer redirect target (next) if present; otherwise route by role
      const params = new URLSearchParams(window.location.search);
      const nextPath = params.get('next');

      if (res.data.user && res.data.user.role === 'admin') {
        navigate('/admin');
      } else if (nextPath) {
        // ensure a safe internal redirect
        try {
          const url = new URL(nextPath, window.location.origin);
          if (url.origin === window.location.origin) {
            navigate(url.pathname + url.search + url.hash);
          } else {
            navigate('/dashboard');
          }
        } catch (e) {
          // if parsing fails, fallback
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error("❌ Login Error:", err);

      if (err.response) {
        const errorData = err.response.data || {};
        if (errorData.verificationRequired) {
          const previewUrl = errorData.verificationPreviewUrl || "";
          const email = errorData.email || formData.email;
          navigate(
            `/verify-pending?email=${encodeURIComponent(email)}${previewUrl ? `&previewUrl=${encodeURIComponent(previewUrl)}` : ""}`
          );
          return;
        }
        alert(errorData.message || "Login failed");
      } else if (err.request) {
        alert("Server is not responding.");
      } else {
        alert(err.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };


  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const googleAuthUrl = `${apiBase.replace(/\/api$/, "")}/api/auth/google`;

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hero-panel rounded-[2rem] p-10 text-slate-100 shadow-[0_30px_80px_rgba(2,_6,_23,_0.48)]">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">Secure freelancer login</p>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Sign in to SkillSphere and manage your projects with style.
            </h1>
            <p className="mt-6 max-w-xl text-slate-300 leading-8">
              Login fast and continue where you left off. Connect with top talent, track progress, and grow your business with a premium dashboard experience.
            </p>
            <div className="mt-10 space-y-4">
              <div className="rounded-3xl bg-slate-950/90 border border-cyan-400/10 p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Why choose SkillSphere?</p>
                <ul className="mt-4 space-y-3 text-slate-300 text-sm">
                  <li>• Lightning-fast gig discovery</li>
                  <li>• Clean, modern collaboration tools</li>
                  <li>• Trusted local experts and secure payments</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="auth-card rounded-[2rem] p-10">
            <div className="mb-8 space-y-3 text-center">
              <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/75">Login</p>
              <h2 className="text-3xl font-bold text-white">Welcome back</h2>
              <p className="text-slate-400">Access your dashboard and continue managing your marketplace.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="auth-input w-full rounded-3xl px-5 py-3 outline-none"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="auth-input w-full rounded-3xl px-5 py-3 outline-none"
                required
              />

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input id="adminOnly" type="checkbox" checked={adminOnly} onChange={(e) => setAdminOnly(e.target.checked)} />
                  <label htmlFor="adminOnly" className="text-sm text-slate-300">Login as admin (owner only)</label>
                </div>
                <div className="text-xs text-slate-500">
                  If you're the platform admin, use <a href="/admin-login" className="text-cyan-300 underline">Admin Login</a> for faster access.
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="brand-button w-full rounded-3xl px-5 py-3 text-sm font-semibold transition disabled:opacity-60 mt-3"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="mt-6 text-center text-slate-400">or</div>

            {!configLoaded ? (
              <div className="mt-4 rounded-3xl border border-slate-700 bg-slate-950/80 p-4 text-sm text-slate-300">
                Checking authentication providers...
              </div>
            ) : googleError ? (
              <div className="mt-4 rounded-3xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
                {googleError}
              </div>
            ) : !googleEnabled ? (
              <div className="mt-4 rounded-3xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                Google sign-in is currently disabled. Please use your email and password to login.
              </div>
            ) : (
              <button
                onClick={() => {
                  window.location.href = googleAuthUrl;
                }}
                className="mt-4 flex w-full items-center justify-center gap-3 rounded-3xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-300 hover:bg-slate-900"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-950">G</span>
                Continue with Google
              </button>
            )}

            <p className="mt-6 text-center text-slate-400">
              New here? <a href="/register" className="text-cyan-300 hover:text-cyan-200">Create an account</a>
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default Login;