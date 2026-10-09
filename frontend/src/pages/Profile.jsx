import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientProfile from "./ClientProfile";
import FreelancerProfile from "./FreelancerProfile";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

function Profile() {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Guard against malformed JSON in localStorage which would throw on JSON.parse
    let user = null;
    try {
      const raw = localStorage.getItem("user");
      user = raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error("Failed to parse user from localStorage:", err);
      // Clear the bad value to avoid repeated errors
      localStorage.removeItem("user");
      user = null;
    }

    const finalize = (role) => {
      setUserRole(role);
      setLoading(false);
    };

    (async () => {
      if (!user || !user._id || !user.role) {
        // Try to fetch profile from server as a fallback
        let timeoutId;
        try {
          const controller = new AbortController();
          timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const res = await api.get("/profile", { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res?.data?.success) {
            const srvUser = res.data.user;
            const roleFromServer = res.data.role || (srvUser && srvUser.role);
            // persist user/profile locally
            if (srvUser) {
              setAuthUser(srvUser);
            }
            if (res.data.profile) localStorage.setItem("profile", JSON.stringify(res.data.profile));
            finalize(roleFromServer || "client");
            return;
          }
        } catch (err) {
          console.warn("Profile fetch failed:", err?.response?.data || err.message);
        } finally {
          clearTimeout(timeoutId);
        }

        console.error("Missing user data");
        navigate("/login");
        return;
      }

      finalize(user.role);
    })();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center text-slate-100">
          <h1 className="text-3xl font-bold mb-4">Loading profile...</h1>
        </div>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center text-slate-100">
          <h1 className="text-3xl font-bold mb-4">Error loading profile</h1>
          <p className="text-slate-400">Please login again</p>
        </div>
      </div>
    );
  }

  if (userRole === "client") {
    return <ClientProfile />;
  }

  if (userRole === "freelancer") {
    return <FreelancerProfile />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/90 p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <h1 className="text-3xl font-bold text-white mb-4">Profile access not available</h1>
        <p className="text-slate-400 mb-6">Your account role <span className="font-semibold text-white">{userRole || "unknown"}</span> does not have a dedicated profile page yet.</p>
        <p className="text-sm text-slate-400">If you believe this is an error, please visit your dashboard or contact support.</p>
      </div>
    </div>
  );
}
 
export default Profile;
