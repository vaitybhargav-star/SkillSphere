import { useEffect, useState } from "react";
import api from "../services/api";

function Payments() {
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ amount: "", gig: "", provider: "stripe" });
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [role, setRole] = useState("");
  const [clientGigs, setClientGigs] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isClient = role === "client";

  const loadPayments = async () => {
    const res = await api.get("/payments");
    setPayments(res.data.payments || []);
  };

  useEffect(() => {
    let active = true;

    const fetchPayments = async () => {
      const res = await api.get("/payments");
      if (active) setPayments(res.data.payments || []);
    };

    const fetchConfig = async () => {
      try {
        const res = await api.get("/config");
        if (active) {
          setStripeEnabled(res.data.config.stripeConfigured);
          setRazorpayEnabled(res.data.config.razorpayConfigured);
          setForm((prev) => ({
            ...prev,
            provider: res.data.config.stripeConfigured ? "stripe" : res.data.config.razorpayConfigured ? "razorpay" : "mock",
          }));
        }
      } catch (err) {
        console.warn("Unable to fetch payment configuration", err);
      } finally {
        if (active) setConfigLoaded(true);
      }
    };

    const loadUserRole = () => {
      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          const parsed = JSON.parse(raw);
          setRole(parsed?.role || "");
        }
      } catch (err) {
        console.warn("Failed to load user role from localStorage", err);
      }
    };

    void fetchPayments();
    void fetchConfig();
    loadUserRole();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const loadClientGigs = async () => {
      if (!isClient) {
        setClientGigs([]);
        return;
      }

      try {
        const res = await api.get("/gigs/my");
        setClientGigs(res.data.gigs || []);
      } catch (err) {
        console.warn("Unable to load client gigs", err);
        setClientGigs([]);
      }
    };

    void loadClientGigs();
  }, [isClient]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isLoading) return;
    
    if (!isClient) {
      setFeedback("Payments can only be created by client accounts. Please log in as a client.");
      return;
    }

    if (!form.gig || !form.amount || Number(form.amount) <= 0) {
      setFeedback("Please enter a valid gig ID and amount greater than zero.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/payments", { amount: Number(form.amount), gig: form.gig, provider: form.provider });
      setForm({ amount: "", gig: "", provider: form.provider });
      loadPayments();
      setFeedback("Payment draft created. You can proceed to checkout.");
    } catch (error) {
      setFeedback(error.response?.data?.message || "Failed to create payment.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    if (!isClient) {
      setFeedback("Card checkout is only available for client accounts.");
      return;
    }

    // Prevent duplicate submissions
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (form.provider === "stripe") {
        if (!stripeEnabled) {
          setFeedback("Stripe is not configured on the server. Starting demo checkout using mock payment.");
          const res = await api.post('/payments/checkout/mock', { amount: Number(form.amount || 0), gig: form.gig });
          if (res.data && res.data.url) {
            window.location.href = res.data.url;
            return;
          }
          setFeedback(res.data?.message || "Mock checkout failed for Stripe demo");
          return;
        }

        const res = await api.post("/payments/checkout", { amount: Number(form.amount || 0), gig: form.gig });
        if (res.data && res.data.url) {
          window.location.href = res.data.url;
          return;
        }
        setFeedback(res.data.message || "Stripe checkout not available");
      } else if (form.provider === "razorpay") {
        if (!razorpayEnabled) {
          setFeedback("Razorpay is not configured on the server. Using test payment fallback for now.");
          const res = await api.post('/payments/checkout/mock', { amount: Number(form.amount || 0), gig: form.gig });
          if (res.data && res.data.url) {
            window.location.href = res.data.url;
            return;
          }
          setFeedback(res.data?.message || 'Mock checkout failed for Razorpay fallback');
          return;
        }

        const res = await api.post("/payments/razorpay/create-order", { amount: Number(form.amount || 0), gig: form.gig });
        if (!res.data || !res.data.orderId) {
          setFeedback(res.data?.message || "Unable to create Razorpay order");
          return;
        }

        // Check if this is a demo mode response (Razorpay API failed, fallback to mock)
        if (res.data.isDemoMode || res.data.isMockPayment) {
          setFeedback("✅ Demo Payment: " + (res.data.message || "Payment processed successfully (demo mode)"));
          loadPayments();
          return;
        }
 
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          setFeedback("Unable to load Razorpay checkout script.");
          return;
        }
 
        const { orderId, amount, currency, key } = res.data;
        const options = {
          key,
          amount,
          currency,
          name: "SkillSphere",
          description: `Payment for gig ${form.gig || "-"}`,
          order_id: orderId,
          handler: async (response) => {
            try {
              const verifyRes = await api.post("/payments/razorpay/verify", {
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
              });
              if (verifyRes.data.success) {
                setFeedback("Payment completed successfully.");
                loadPayments();
              } else {
                setFeedback(verifyRes.data.message || "Razorpay verification failed.");
              }
            } catch (verifyError) {
              setFeedback(verifyError.response?.data?.message || "Payment verification failed.");
            }
          },
          prefill: {
            name: localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).fullName : "",
            email: localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).email : "",
          },
          theme: { color: "#0ea5e9" },
          modal: {
            ondismiss: () => {
              setFeedback("Razorpay payment was cancelled.");
            },
          },
        };
 
        const razorpay = new window.Razorpay(options);
        razorpay.on("payment.failed", function(response) {
          setFeedback("❌ Payment failed: " + (response.error?.description || "Unknown error"));
        });
        razorpay.open();
      } else {
        const res = await api.post('/payments/checkout/mock', { amount: Number(form.amount || 0), gig: form.gig });
        if (res.data && res.data.url) {
          window.location.href = res.data.url;
        } else {
          setFeedback(res.data.message || 'Mock checkout failed');
        }
      }
    } catch (error) {
      setFeedback(error.response?.data?.message || error.message || "Checkout failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="glass-card rounded-[2rem] p-8">
          <h1 className="text-3xl font-bold">Secure Payments</h1>
          <p className="mt-2 text-slate-400">Manage invoices and checkout securely from one modern dashboard.</p>
        </div>

        <div className="glass-card rounded-[2rem] p-8">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Create Payment</h2>
              {!isClient && (
                <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100 mb-4">
                  Payments are only available to client accounts. Please log in as a client to create or pay invoices.
                </div>
              )}
              {feedback && (
                <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100 mb-4">
                  {feedback}
                </div>
              )}
              <div className="space-y-4">
                {isClient && clientGigs.length > 0 && (
                  <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4 text-slate-200">
                    <label className="block text-sm font-semibold text-white mb-2" htmlFor="selected-gig">
                      Select your gig
                    </label>
                    <select
                      id="selected-gig"
                      value={form.gig}
                      onChange={(e) => setForm({ ...form, gig: e.target.value })}
                      className="auth-input w-full rounded-3xl px-4 py-3"
                    >
                      <option value="">Choose a gig to pay</option>
                      {clientGigs.map((gig) => (
                        <option key={gig._id} value={gig._id}>
                          {gig.title?.slice(0, 60) || gig._id} — {gig._id}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      Choose a posted gig and the Gig ID will be filled automatically in the payment form.
                    </p>
                  </div>
                )}
                <input disabled={!isClient} value={form.gig} onChange={(e) => setForm({ ...form, gig: e.target.value })} placeholder="Gig ID" className="auth-input w-full rounded-3xl px-4 py-3" />
                <input disabled={!isClient} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount" className="auth-input w-full rounded-3xl px-4 py-3" />
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">Payment provider</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label htmlFor="provider-stripe" className={`rounded-3xl border border-white/10 px-4 py-3 cursor-pointer ${!stripeEnabled ? "bg-slate-900/60 text-slate-500" : "bg-slate-900/80"}`}>
                      <input
                        id="provider-stripe"
                        type="radio"
                        name="provider"
                        value="stripe"
                        checked={form.provider === "stripe"}
                        onChange={(e) => setForm({ ...form, provider: e.target.value })}
                        className="mr-2"
                        disabled={!isClient}
                      />
                      Stripe
                    </label>
                    <label htmlFor="provider-razorpay" className={`rounded-3xl border border-white/10 px-4 py-3 cursor-pointer ${!razorpayEnabled ? "bg-slate-900/60 text-slate-500" : "bg-slate-900/80"}`}>
                      <input
                        id="provider-razorpay"
                        type="radio"
                        name="provider"
                        value="razorpay"
                        checked={form.provider === "razorpay"}
                        onChange={(e) => setForm({ ...form, provider: e.target.value })}
                        className="mr-2"
                        disabled={!isClient}
                      />
                      Razorpay
                    </label>
                    <label htmlFor="provider-mock" className="rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 cursor-pointer">
                      <input
                        id="provider-mock"
                        type="radio"
                        name="provider"
                        value="mock"
                        checked={form.provider === "mock"}
                        onChange={(e) => setForm({ ...form, provider: e.target.value })}
                        className="mr-2"
                        disabled={!isClient}
                      />
                      Test Payment
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">
                    {form.provider === "stripe" && !stripeEnabled
                      ? "Stripe is not configured on the server. Demo payment will use the test checkout fallback."
                      : form.provider === "razorpay" && !razorpayEnabled
                      ? "Razorpay is not configured on the server. Demo payment will use the test checkout fallback."
                      : form.provider === "razorpay" && razorpayEnabled
                      ? "Razorpay is configured and ready for actual checkout."
                      : "Choose a provider to process the payment securely."}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={!isClient || isLoading}
                    className={`brand-button w-full rounded-3xl px-5 py-3 text-base font-semibold transition ${!isClient || isLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {isLoading ? "Creating..." : "Create Payment"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={!isClient || isLoading}
                    className={`rounded-3xl px-5 py-3 text-base font-semibold transition ${isClient && !isLoading ? "border border-cyan-500/20 bg-slate-900 text-white hover:border-cyan-300/50" : "border border-slate-700 bg-slate-800 text-slate-500 cursor-not-allowed"}`}
                  >
                    {isLoading
                      ? "Processing..."
                      : form.provider === "razorpay"
                      ? "Pay with Razorpay"
                      : form.provider === "stripe"
                      ? "Pay with Stripe"
                      : "Continue with Test Payment"}
                  </button>
                </div>
                {!configLoaded ? (
                  <p className="mt-3 text-sm text-slate-400">Checking payment configuration...</p>
                ) : !stripeEnabled && !razorpayEnabled ? (
                  <p className="mt-3 text-sm text-amber-200">No card provider is configured on the server. Use Test Payment for now or configure Stripe/Razorpay.</p>
                ) : !razorpayEnabled ? (
                  <p className="mt-3 text-sm text-amber-200">Razorpay is not configured. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to your backend `.env` and restart the server.</p>
                ) : null}
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/85 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Recent Payments</h2>
              <div className="space-y-4">
                {payments.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/80 p-6 text-slate-500">No payments have been processed yet.</div>
                ) : (
                  payments.map((payment) => (
                    <div key={payment._id} className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">${payment.amount} {payment.currency}</p>
                        <p className="text-sm text-slate-400">Gig: {payment.gig || "N/A"}</p>
                        <p className="text-xs text-slate-500">Provider: {payment.provider || "mock"}{payment.paymentReference ? ` · ${payment.paymentReference}` : ""}</p>
                      </div>
                      <span className="rounded-full bg-blue-500/15 px-3 py-1 text-sm text-blue-200">{payment.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Payments;
