import { Navigate } from "react-router-dom";

function AdminProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const rawUser = localStorage.getItem("user");

  let isAdmin = false;

  try {
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user && user.role === "admin") isAdmin = true;
    }

    if (!isAdmin && token) {
      // try to decode token payload
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        try {
          const json = decodeURIComponent(escape(atob(payload)));
          const data = JSON.parse(json);
          if (data && (data.role === 'admin' || data.role === 'Admin')) isAdmin = true;
        } catch (e) {
          // ignore decode errors
        }
      }
    }
  } catch (e) {
    console.warn('AdminProtectedRoute error:', e);
  }

  return isAdmin ? children : <Navigate to="/admin-login" replace />;
}

export default AdminProtectedRoute;
