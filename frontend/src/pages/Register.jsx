import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function Register() {
  const navigate = useNavigate();
  const { setAuthToken, setAuthUser } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "client",
  });

  useEffect(() => {
    // If already logged in, redirect to home
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/", { replace: true });
      return;
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/auth/register", formData);

      if (res.data?.verificationRequired) {
        navigate(
          `/verify-pending?email=${encodeURIComponent(res.data.user?.email || formData.email)}${res.data.verificationPreviewUrl ? `&previewUrl=${encodeURIComponent(res.data.verificationPreviewUrl)}` : ""}`,
          { replace: true }
        );
        return;
      }

      setAuthToken(res.data.token);
      setAuthUser(res.data.user);
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Registration Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="auth-card rounded-[2rem] p-10">
            <div className="mb-8 space-y-3 text-center">
              <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/75">Create account</p>
              <h2 className="text-3xl font-bold text-white">Join SkillSphere</h2>
              <p className="text-slate-400">Build your profile, discover local talent, and launch your next project with confidence.</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Full Name</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Your full name" className="auth-input w-full rounded-3xl px-5 py-3 outline-none" required />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className="auth-input w-full rounded-3xl px-5 py-3 outline-none" required />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Choose a strong password" className="auth-input w-full rounded-3xl px-5 py-3 outline-none" required />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Select Role</label>
                <select name="role" value={formData.role} onChange={handleChange} className="auth-input w-full rounded-3xl px-5 py-3 outline-none" required>
                  <option value="client">Client</option>
                  <option value="freelancer">Freelancer</option>
                </select>
              </div>

              <button type="submit" className="brand-button w-full rounded-3xl px-5 py-3 text-sm font-semibold transition">Register</button>
            </form>

            <p className="mt-6 text-center text-slate-400">
              Already a member? <a href="/login" className="text-cyan-300 hover:text-cyan-200">Login now</a>
            </p>
          </div>

          <div className="hero-panel rounded-[2rem] p-10 text-slate-100 shadow-[0_30px_80px_rgba(2,_6,_23,_0.48)]">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">Why SkillSphere</p>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Launch projects faster with top local freelancers.
            </h1>
            <p className="mt-6 max-w-xl text-slate-300 leading-8">
              Create a polished profile, collaborate in real time, and make smarter decisions with analytics built for growing teams.
            </p>

            <div className="mt-10 space-y-4">
              <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
                <p className="font-semibold text-cyan-300">Professional workflow</p>
                <p className="mt-2 text-slate-300">Track progress, payments, and conversations from one elegant dashboard.</p>
              </div>
              <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
                <p className="font-semibold text-violet-300">Stunning design</p>
                <p className="mt-2 text-slate-300">A modern interface designed to impress clients and freelancers alike.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default Register;