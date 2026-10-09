const Payment = require("../models/Payment");
const ProjectProgress = require("../models/ProjectProgress");
const Proposal = require("../models/Proposal");
const Gig = require("../models/Gig");
const { createNotification } = require("./notificationController");

let stripe = null;
if (process.env.STRIPE_SECRET) {
  try {
    stripe = require("stripe")(process.env.STRIPE_SECRET);
  } catch (e) {
    stripe = null;
  }
}

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    const Razorpay = require("razorpay");
    
    // Validate that credentials look reasonable
    if (process.env.RAZORPAY_KEY_ID.length < 15) {
      console.warn("⚠️ RAZORPAY_KEY_ID looks suspiciously short (", process.env.RAZORPAY_KEY_ID.length, "chars)");
      console.warn("   Expected format: rzp_test_XXXXXXXXXXXXXXX (at least 25 chars)");
      console.warn("   Skipping Razorpay initialization");
      razorpay = null;
    } else {
      razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      console.log("✅ Razorpay initialized with key:", process.env.RAZORPAY_KEY_ID);
    }
  } catch (e) {
    console.error("❌ Failed to initialize Razorpay:", e.message);
    razorpay = null;
  }
} else {
  console.warn("⚠️ Razorpay credentials not found in environment variables");
}

const notifyPaymentReceived = async (payment) => {
  try {
   if (!payment) return;

   let recipientId = payment.user;
   let gig = null;

   if (payment.gig) {
     gig = await Gig.findById(payment.gig).catch(() => null);
     recipientId = gig?.client || payment.user;
   }

   await createNotification({
     recipient: recipientId,
     type: "payment_received",
     title: "Payment received",
     message: `Payment of ${payment.amount} ${payment.currency} has been received for ${gig?.title || "your project"}.`,
     sendEmail: true,
     metadata: { paymentId: payment._id.toString(), gigId: gig?._id?.toString?.() || payment.gig?.toString?.() },
   });
  } catch (error) {
   console.warn("Failed to create payment notification:", error.message);
  }
};

const createPayment = async (req, res) => {
  try {
    const { amount, gig, currency } = req.body;

    if (!gig || typeof gig !== "string" || !gig.trim()) {
      return res.status(400).json({ success: false, message: "Gig identifier is required." });
    }

    const normalizedAmount = Number(amount);
    if (!normalizedAmount || normalizedAmount <= 0) {
      return res.status(400).json({ success: false, message: "A valid payment amount is required." });
    }

    const payment = await Payment.create({
      user: req.user._id,
      gig: gig.trim(),
      amount: normalizedAmount,
      currency: currency || "USD",
      provider: req.body.provider || "mock",
    });

    res.status(201).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markPaid = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    payment.status = "paid";
    await payment.save();
    await notifyPaymentReceived(payment);
    res.status(200).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createCheckoutSession = async (req, res) => {
  try {
    const { amount, currency = "USD", gig } = req.body;

    if (!stripe) {
      return res.status(501).json({ success: false, message: "Stripe not configured on server" });
    }

    if (!gig || typeof gig !== "string" || !gig.trim()) {
      return res.status(400).json({ success: false, message: "Gig identifier is required for checkout." });
    }

    const normalizedAmount = Number(amount);
    if (!normalizedAmount || normalizedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Checkout amount must be greater than zero." });
    }

    // store a pending payment record first so we can reference it in Stripe metadata
    const payment = await Payment.create({
      user: req.user._id,
      gig: gig.trim(),
      amount: normalizedAmount,
      currency,
      provider: "stripe",
      paymentReference: "stripe_pending",
      status: "pending",
    });

    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: `Payment for gig ${gig || "-"}` },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/payments?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payments?status=cancel`,
      metadata: { userId: req.user._id.toString(), gig: gig || "", paymentId: payment._id.toString() },
    });
    payment.paymentReference = session.id;
    payment.providerData = { sessionId: session.id, stripePaymentStatus: "created" };
    await payment.save();

    res.status(200).json({ success: true, url: session.url, paymentId: payment._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mock checkout to allow local testing when Stripe is not configured
const createMockCheckout = async (req, res) => {
  try {
    const { amount, currency = "USD", gig } = req.body;

    const payment = await Payment.create({
      user: req.user._id,
      gig,
      amount,
      currency,
      provider: "mock",
      status: "paid",
      paymentReference: `mock_${Date.now()}`,
      escrowStatus: "held",
    });

    await notifyPaymentReceived(payment);

    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payments?status=success&paymentId=${payment._id}`;
    res.status(200).json({ success: true, url: redirectUrl, paymentId: payment._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Create Razorpay payment order
 * Falls back to mock payment if Razorpay API fails
 */
const createRazorpayOrder = async (req, res) => {
  try {
    // Defensive check for user
    if (!req.user) {
      console.warn("❌ No user in request - auth may have failed");
      return res.status(401).json({ success: false, message: "Authentication required. Please log in first." });
    }

    if (!req.user._id) {
      console.warn("❌ User has no _id - invalid user object");
      return res.status(401).json({ success: false, message: "Invalid user session. Please log in again." });
    }

    const { amount, currency = "INR", gig } = req.body;

    if (!gig || typeof gig !== "string" || !gig.trim()) {
      return res.status(400).json({ success: false, message: "Gig identifier is required" });
    }

    const normalizedAmount = Number(amount);
    if (!normalizedAmount || normalizedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than zero" });
    }

    // If Razorpay is not configured, fall back to mock payment
    if (!razorpay) {
      console.warn("⚠️ Razorpay not configured, falling back to mock payment for demo");
      const payment = await Payment.create({
        user: req.user._id,
        gig: gig.trim(),
        amount: normalizedAmount,
        currency,
        provider: "mock",
        status: "paid",
        paymentReference: `mock_${Date.now()}`,
        escrowStatus: "held",
      });

      await notifyPaymentReceived(payment);

      res.status(200).json({
        success: true,
        orderId: `mock_order_${Date.now()}`,
        amount: Math.round(normalizedAmount * 100),
        currency,
        paymentId: payment._id,
        key: "mock_key_for_demo",
        isMockPayment: true,
      });
      return;
    }

    const options = {
      amount: Math.round(normalizedAmount * 100), // Razorpay uses paise
      currency,
      receipt: `gig_${gig}_${Date.now()}`,
      notes: {
        gig: gig || "",
        userId: req.user._id.toString(),
      },
    };

    console.log("📝 Creating Razorpay order with options:", JSON.stringify(options, null, 2));

    let order;
    try {
      order = await razorpay.orders.create(options);
      console.log("✅ Razorpay order created:", order.id);
    } catch (apiError) {
      console.error("❌ Razorpay API Error - Full Details:");
      console.error("Error Message:", apiError.message);
      console.error("Error Code:", apiError.code);
      console.error("Status Code:", apiError.statusCode);
      console.error("Error toString:", apiError.toString());
      
      // Try to extract the actual error from Razorpay response
      let errorMsg = apiError.message || "Unknown error";
      if (apiError.response) {
        console.error("Razorpay Response:", JSON.stringify(apiError.response, null, 2));
        if (apiError.response.error) {
          errorMsg = apiError.response.error.description || apiError.response.error.reason || errorMsg;
        }
      }

      // FALLBACK: For demo purposes, create a mock payment when Razorpay fails
      console.warn("⚠️ Razorpay API failed, creating mock payment as fallback for demo");
      const payment = await Payment.create({
        user: req.user._id,
        gig: gig.trim(),
        amount: normalizedAmount,
        currency,
        provider: "razorpay_demo", // Mark as demo
        status: "paid",
        paymentReference: `demo_order_${Date.now()}`,
        providerData: { razorpayError: errorMsg },
        escrowStatus: "held",
      });

      res.status(200).json({
        success: true,
        orderId: `demo_order_${Date.now()}`,
        amount: Math.round(normalizedAmount * 100),
        currency,
        paymentId: payment._id,
        key: process.env.RAZORPAY_KEY_ID || "demo_key",
        isDemoMode: true,
        message: "Demo mode: Mock payment created (Razorpay API unavailable)",
      });
      return;
    }

    // Store payment record with order ID
    const payment = await Payment.create({
      user: req.user._id,
      gig: gig.trim(),
      amount: normalizedAmount,
      currency,
      provider: "razorpay",
      status: "pending",
      paymentReference: order.id,
      providerData: { orderId: order.id, receipt: options.receipt },
      escrowStatus: "held",
    });

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment._id,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("❌ createRazorpayOrder Error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to create Razorpay order",
      ...(process.env.NODE_ENV === "development" && { stack: error.stack })
    });
  }
};

/**
 * Verify Razorpay payment signature
 */
const verifyRazorpayPayment = async (req, res) => {
  try {
    const { paymentId, orderId, signature } = req.body;

    if (!paymentId || !orderId || !signature) {
      return res.status(400).json({ success: false, message: "Missing required fields: paymentId, orderId, signature" });
    }

    const crypto = require("crypto");
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    console.log("🔐 Verifying Razorpay payment:", {
      orderId,
      paymentId,
      signatureMatch: expectedSignature === signature,
    });

    if (expectedSignature !== signature) {
      console.error("❌ Signature mismatch - possible tampering or invalid credentials");
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // Update payment status
    const payment = await Payment.findById(paymentId);
    if (payment) {
      payment.status = "paid";
      payment.paymentReference = orderId;
      payment.providerData = {
        ...payment.providerData,
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        razorpaySignature: signature,
      };
      await payment.save();
      await notifyPaymentReceived(payment);
      console.log("✅ Payment verified and status updated:", paymentId);
    } else {
      console.warn("⚠️ Payment not found for verification:", paymentId);
    }

    res.status(200).json({ success: true, message: "Payment verified", payment });
  } catch (error) {
    console.error("❌ verifyRazorpayPayment Error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to verify payment",
      ...(process.env.NODE_ENV === "development" && { stack: error.stack })
    });
  }
};

/**
 * Create escrow payment for a proposal
 */
const createEscrowPayment = async (req, res) => {
  try {
    const { proposalId, amount } = req.body;

    const proposal = await Proposal.findById(proposalId).populate("gig");
    if (!proposal) {
      return res.status(404).json({ success: false, message: "Proposal not found" });
    }

    const payment = await Payment.create({
      user: req.user._id,
      gig: proposal.gig._id,
      amount,
      currency: proposal.gig.budgetType === "hourly" ? "USD" : "USD",
      provider: "escrow",
      status: "paid",
      paymentReference: `escrow_${proposal._id}`,
      escrowStatus: "held",
      relatedMilestoneId: proposal._id,
      escrowHeldDate: new Date(),
    });

    await notifyPaymentReceived(payment);

    res.status(201).json({
      success: true,
      message: "Escrow payment created successfully",
      payment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Release escrow payment after milestone completion
 */
const releaseEscrowPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    if (payment.escrowStatus !== "held") {
      return res.status(400).json({
        success: false,
        message: `Cannot release escrow with status: ${payment.escrowStatus}`,
      });
    }

    payment.escrowStatus = "released";
    payment.releaseDate = new Date();
    await payment.save();

    res.status(200).json({
      success: true,
      message: "Escrow payment released successfully",
      payment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Refund escrow payment (in case of dispute)
 */
const refundEscrowPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    if (!["held", "disputed"].includes(payment.escrowStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot refund escrow with status: ${payment.escrowStatus}`,
      });
    }

    payment.escrowStatus = "refunded";
    payment.status = "refunded";
    await payment.save();

    res.status(200).json({
      success: true,
      message: "Escrow payment refunded successfully",
      payment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get escrow payment status
 */
const getEscrowStatus = async (req, res) => {
  try {
    const { proposalId } = req.params;

    const payments = await Payment.find({
      relatedMilestoneId: proposalId,
      provider: "escrow",
    });

    const escrowData = {
      totalEscrowed: payments.reduce((sum, p) => sum + p.amount, 0),
      held: payments.filter((p) => p.escrowStatus === "held"),
      released: payments.filter((p) => p.escrowStatus === "released"),
      disputed: payments.filter((p) => p.escrowStatus === "disputed"),
      refunded: payments.filter((p) => p.escrowStatus === "refunded"),
    };

    res.status(200).json({ success: true, escrowData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get payment analytics
 */
const getPaymentAnalytics = async (req, res) => {
  try {
    const totalPayments = await Payment.countDocuments({ status: "paid" });
    const totalAmount = await Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const escrowAnalytics = await Payment.aggregate([
      { $match: { provider: "escrow" } },
      { $group: { _id: "$escrowStatus", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        totalPayments,
        totalAmount: totalAmount[0]?.total || 0,
        escrowAnalytics,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  createPayment,
  getPayments,
  markPaid,
  createCheckoutSession,
  createMockCheckout,
  createRazorpayOrder,
  verifyRazorpayPayment,
  createEscrowPayment,
  releaseEscrowPayment,
  refundEscrowPayment,
  getEscrowStatus,
  getPaymentAnalytics,
};
