import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Verify2FA() {
  const location = useLocation();
  const navigate = useNavigate();
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const { setAuthToken, setAuthUser } = useAuth();

  useEffect(() => {
    const tokenFromState = location.state?.twoFactorToken;
    const tokenFromStorage = localStorage.getItem("pending2faToken");
    const token = tokenFromState || tokenFromStorage;

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setTwoFactorToken(token);
  }, [location.state, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const res = await api.post("/auth/2fa/verify-login", { twoFactorToken, code });
      if (res.data?.token) {
        localStorage.removeItem("pending2faToken");
        setAuthToken(res.data.token);
        setAuthUser(res.data.user);
        navigate("/dashboard");
        return;
      }
      setStatus("Unable to verify code. Please try again.");
    } catch (err) {
      setStatus(err.response?.data?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="auth-card rounded-[2rem] p-10 w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/75">Two-Factor Login</p>
            <h2 className="text-3xl font-bold text-white">Enter your Authenticator code</h2>
            <p className="mt-3 text-slate-400">Use the 6-digit code from your authenticator app to finish signing in.</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            <input
              type="text"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="auth-input w-full rounded-3xl px-5 py-3 outline-none"
              required
            />
            <button type="submit" disabled={loading} className="brand-button w-full rounded-3xl px-5 py-3 text-sm font-semibold transition disabled:opacity-60">
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </form>

          {status && <p className="mt-4 text-sm text-slate-300">{status}</p>}
          <p className="mt-6 text-sm text-slate-400">
            If you cannot complete verification, return to <button onClick={() => navigate("/login")} className="text-cyan-300 hover:text-cyan-200 underline">login</button>.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

export default Verify2FA;
