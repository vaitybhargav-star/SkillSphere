const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
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
} = require("../controllers/paymentController");
const { getBalance, getHeld, getHistory } = require("../controllers/escrowController");

// Only clients can create payments and start checkout sessions
router.post("/", protect, authorizeRoles("client"), createPayment);
// Allow authenticated users to view their payments (client or freelancer)
router.get("/", protect, getPayments);
// Mark payment as paid - admin access only
router.put("/:id/pay", protect, authorizeRoles("admin"), markPaid);

// Stripe checkout
router.post("/checkout", protect, authorizeRoles("client"), createCheckoutSession);
router.post("/checkout/mock", protect, authorizeRoles("client"), createMockCheckout);

// Razorpay payment
router.post("/razorpay/create-order", protect, authorizeRoles("client"), createRazorpayOrder);
router.post("/razorpay/verify", protect, authorizeRoles("client"), verifyRazorpayPayment);

// Escrow management
router.post("/escrow/create", protect, authorizeRoles("client"), createEscrowPayment);
router.put("/escrow/:paymentId/release", protect, authorizeRoles("admin"), releaseEscrowPayment);
router.put("/escrow/:paymentId/refund", protect, authorizeRoles("admin"), refundEscrowPayment);
router.get("/escrow/:proposalId/status", protect, getEscrowStatus);
router.get("/analytics/dashboard", protect, getPaymentAnalytics);

// Legacy escrow endpoints
router.get("/escrow/balance", protect, getBalance);
router.get("/escrow/held", protect, getHeld);
router.get("/escrow/history", protect, getHistory);

module.exports = router;
