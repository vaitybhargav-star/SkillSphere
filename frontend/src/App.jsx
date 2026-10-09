import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ClientProfile from "./pages/ClientProfile";
import FreelancerProfile from "./pages/FreelancerProfile";
import Gigs from "./pages/Gigs";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminGigApproval from "./pages/AdminGigApproval";
import Messaging from "./pages/Messaging";
import Disputes from "./pages/Disputes";
import Payments from "./pages/Payments";
import Projects from "./pages/Projects";
import Notifications from "./pages/Notifications";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Reviews from "./pages/Reviews";
import AuthSuccess from "./pages/AuthSuccess";
import VerificationPending from "./pages/VerificationPending";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import TwoFactorSetup from "./pages/TwoFactorSetup";
import Verify2FA from "./pages/Verify2FA";
import Search from "./pages/Search";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-pending" element={<VerificationPending />} />
      <Route path="/auth/success" element={<AuthSuccess />} />
      <Route path="/auth/verified" element={<AuthSuccess />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/client/profile" element={<ProtectedRoute><ClientProfile /></ProtectedRoute>} />
      <Route path="/freelancer/profile" element={<ProtectedRoute><FreelancerProfile /></ProtectedRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset" element={<ResetPassword />} />
      <Route path="/2fa/verify" element={<Verify2FA />} />
      <Route path="/2fa/setup" element={<ProtectedRoute><TwoFactorSetup /></ProtectedRoute>} />
      <Route path="/search" element={<Search />} />
      <Route path="/gigs" element={<ProtectedRoute><Gigs /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminProtectedRoute><Admin /></AdminProtectedRoute>} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin-gig-approval" element={<AdminProtectedRoute><AdminGigApproval /></AdminProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messaging /></ProtectedRoute>} />
      <Route path="/disputes" element={<ProtectedRoute><Disputes /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;