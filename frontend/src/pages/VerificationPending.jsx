import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

function VerificationPending() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const initialPreviewUrl = searchParams.get("previewUrl") || "";

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    email
      ? `A verification link has been sent to ${email}. Check your inbox and click the link to finish creating your account.`
      : "A verification email has been sent. Check your inbox and click the link to complete account activation."
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [resendSent, setResendSent] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(initialPreviewUrl);

  const handleResend = async () => {
    if (!email) {
      setErrorMessage("Please return to the login screen and enter your email to resend verification.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setResendSent(false);

    try {
      const res = await api.post("/auth/resend-verification", { email });
      setStatusMessage(res.data.message || "Verification email resent. Please check your inbox.");
      if (res.data.verificationPreviewUrl) {
        setPreviewUrl(res.data.verificationPreviewUrl);
        setStatusMessage((prev) => `${prev} Preview is available below.`);
      }
      setResendSent(true);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || "Unable to resend verification email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl rounded-[2rem] bg-slate-950/90 p-10 shadow-[0_30px_80px_rgba(2,_6,_23,_0.48)]">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.32em] text-cyan-300/75">Verify Your Email</p>
            <h2 className="mt-4 text-3xl font-bold text-white">Thanks for signing up.</h2>
            <p className="mt-4 text-slate-400">Your account is almost ready. Verify your email to unlock SkillSphere.</p>
          </div>

          <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-6 text-slate-200">
            <p className="mb-4 text-slate-300">{statusMessage}</p>
            {email && <p className="mb-4 text-sm text-slate-400">Email: <span className="font-medium text-slate-100">{email}</span></p>}
            {previewUrl && (
              <div className="mb-4 rounded-2xl bg-slate-950 p-4 text-sm text-slate-300">
                <p className="font-medium text-cyan-300">Email preview link</p>
                <a href={previewUrl} target="_blank" rel="noreferrer" className="text-cyan-300 underline break-all">
                  {previewUrl}
                </a>
              </div>
            )}
            {errorMessage && <p className="mb-4 text-sm text-red-400">{errorMessage}</p>}
            <p className="mb-4 text-sm text-slate-400">
              If you do not receive an email within a few minutes, check your spam folder. In local development, preview links may be available via the app.
            </p>

            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="mb-4 w-full rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
            >
              {loading ? "Resending..." : resendSent ? "Verification email resent" : "Resend verification email"}
            </button>

            <div className="flex flex-col gap-3 text-center text-sm text-slate-400 sm:flex-row sm:justify-between">
              <button onClick={() => navigate("/login")} className="text-cyan-300 hover:text-cyan-200 underline">
                Return to login
              </button>
              <button onClick={() => navigate("/")} className="text-cyan-300 hover:text-cyan-200 underline">
                Back to home
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default VerificationPending;
