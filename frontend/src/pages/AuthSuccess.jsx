import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function AuthSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthUser, setAuthToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");

    const finishLogin = (user, profile) => {
      try {
        if (user) setAuthUser(user);
        if (profile) localStorage.setItem("profile", JSON.stringify(profile));
        // Ensure token is set
        if (token) setAuthToken(token);
      } catch (err) {
        console.warn("AuthSuccess: localStorage error", err);
      }
      navigate("/", { replace: true });
    };

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    // Save token first so api helper sends it
    localStorage.setItem("token", token);

     // Try to fetch full user/profile from backend
    (async () => {
      let timeoutId;
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const res = await api.get("/profile", { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res?.data?.success) {
          const { user, profile } = res.data;
          finishLogin(user, profile);
          return;
        }
      } catch (err) {
        console.warn("AuthSuccess: failed to fetch profile", err?.response?.data || err.message);
      } finally {
        clearTimeout(timeoutId);
      }

      // Fallback: decode token payload to get id/role
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          // base64url -> base64
          const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const decoded = JSON.parse(decodeURIComponent(escape(atob(payload))));
          const user = {
            _id: decoded.id,
            id: decoded.id,
            role: decoded.role || "client",
          };
          finishLogin(user, null);
          return;
        }
      } catch (err) {
        console.error("AuthSuccess fallback decode failed:", err);
      }

      // If all else fails, redirect to login
      navigate("/login", { replace: true });
    })();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center text-slate-100">
        <h1 className="text-3xl font-bold mb-4">Logging you in...</h1>
        <p className="text-slate-400">Please wait...</p>
      </div>
    </div>
  );
}

export default AuthSuccess;
