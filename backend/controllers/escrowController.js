/**
 * Escrow Payment Controller
 * Manages payment escrow lifecycle (hold, release, refund)
 */

const Payment = require("../models/Payment");
const Gig = require("../models/Gig");
const User = require("../models/User");
const Proposal = require("../models/Proposal");

/**
 * Hold payment in escrow when gig is accepted
 * @param {Object} gigId - The gig ID
 * @param {Object} clientId - The client (payer) ID
 * @param {Number} amount - Amount to hold
 * @returns {Object} Payment record
 */
exports.holdPayment = async (gigId, clientId, amount) => {
  try {
    const payment = new Payment({
      user: clientId,
      gig: gigId,
      amount: amount,
      status: "pending",
      escrowStatus: "held",
      escrowHeldDate: new Date(),
    });

    await payment.save();
    return { success: true, payment };
  } catch (error) {
    console.error("Error holding payment:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Release payment from escrow
 * @param {String} paymentId - Payment ID
 * @param {String} milestoneId - Milestone ID (optional)
 * @returns {Object} Updated payment
 */
exports.releasePayment = async (paymentId, milestoneId = null) => {
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    if (payment.escrowStatus !== "held") {
      return { success: false, error: "Payment is not in held status" };
    }

    payment.escrowStatus = "released";
    payment.status = "paid";
    payment.releaseDate = new Date();
    if (milestoneId) {
      payment.relatedMilestoneId = milestoneId;
    }

    await payment.save();
    return { success: true, payment };
  } catch (error) {
    console.error("Error releasing payment:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Refund payment from escrow
 * @param {String} paymentId - Payment ID
 * @param {String} reason - Reason for refund
 * @returns {Object} Updated payment
 */
exports.refundPayment = async (paymentId, reason = "") => {
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return { success: false, error: "Payment not found" };
    }

    if (payment.escrowStatus !== "held") {
      return { success: false, error: "Payment is not in held status" };
    }

    payment.escrowStatus = "refunded";
    payment.status = "refunded";
    payment.releaseDate = new Date();

    await payment.save();
    return { success: true, payment };
  } catch (error) {
    console.error("Error refunding payment:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get total escrow balance held for a user (client perspective)
 * @param {String} userId - User ID (client)
 * @returns {Number} Total amount held in escrow
 */
exports.getEscrowBalance = async (userId) => {
  try {
    const payments = await Payment.find({
      user: userId,
      escrowStatus: "held",
    });

    const totalHeld = payments.reduce((sum, payment) => sum + payment.amount, 0);
    return { success: true, balance: totalHeld, payments };
  } catch (error) {
    console.error("Error calculating escrow balance:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all held payments for a user
 * @param {String} userId - User ID
 * @returns {Array} List of held payments
 */
exports.getHeldPayments = async (userId) => {
  try {
    const payments = await Payment.find({
      user: userId,
      escrowStatus: "held",
    }).populate("gig", "title budget");

    return { success: true, payments };
  } catch (error) {
    console.error("Error fetching held payments:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get escrow history for a user
 * @param {String} userId - User ID
 * @returns {Array} List of released/refunded payments
 */
exports.getEscrowHistory = async (userId) => {
  try {
    const payments = await Payment.find({
      user: userId,
      escrowStatus: { $in: ["released", "refunded"] },
    })
      .populate("gig", "title budget")
      .sort({ releaseDate: -1 });

    return { success: true, payments };
  } catch (error) {
    console.error("Error fetching escrow history:", error);
    return { success: false, error: error.message };
  }
};

/**
 * GET /api/escrow/balance
 * Get user's current escrow balance
 */
exports.getBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await exports.getEscrowBalance(userId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      balance: result.balance,
      totalPayments: result.payments.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching escrow balance" });
  }
};

/**
 * GET /api/escrow/held
 * Get all held payments
 */
exports.getHeld = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await exports.getHeldPayments(userId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      payments: result.payments,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching held payments" });
  }
};

/**
 * GET /api/escrow/history
 * Get escrow release/refund history
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await exports.getEscrowHistory(userId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      payments: result.payments,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching escrow history" });
  }
};
