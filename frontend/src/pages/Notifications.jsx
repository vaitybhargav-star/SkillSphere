import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";

const _rawApiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const normalizeSocketUrl = (raw) => {
  try {
    if (!raw) return window.location.origin;
    if (/^:\d+/.test(raw)) return `${window.location.protocol}//${window.location.hostname}${raw}`;
    if (/^\/\//.test(raw)) return `${window.location.protocol}:${raw}`;
    if (!/^https?:\/\//.test(raw)) return `${window.location.protocol}//${raw}`;
    return raw.replace(/\/$/, "");
  } catch (e) {
    return window.location.origin;
  }
};

const socketBaseUrl = normalizeSocketUrl(import.meta.env.VITE_SOCKET_URL || _rawApiBase.replace(/\/api$/, ""));

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/notifications");
      const nextNotifications = res.data?.data?.notifications || res.data?.notifications || [];
      setNotifications(nextNotifications);
    } catch (err) {
      console.error("Unable to fetch notifications", err);
      setError(err.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();

    const token = localStorage.getItem("token");
    const socket = io(socketBaseUrl, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Socket connected for notifications");
    });

    socket.on("notification", (notification) => {
      setNotifications((current) => [notification, ...current]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((current) => current.map((notification) => (notification._id === notificationId ? { ...notification, read: true } : notification)));
    } catch (err) {
      console.error("Unable to mark notification as read", err);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="mt-2 text-gray-600">Stay on top of proposals, payments, and messages.</p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-700">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-700">No new notifications yet.</div>
          ) : (
            notifications.map((notification) => (
              <div key={notification._id} className={`rounded-2xl border p-5 shadow-sm ${notification.read ? "border-slate-200 bg-slate-50" : "border-cyan-200/30 bg-cyan-50"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-700">
                        {notification.type || "notification"}
                      </span>
                      {!notification.read && <span className="text-xs font-semibold text-cyan-700">New</span>}
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">{notification.title}</h2>
                    <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
                  </div>
                  {!notification.read && (
                    <button onClick={() => markAsRead(notification._id)} className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500">
                      Mark read
                    </button>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Notifications;
