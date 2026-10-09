/**
 * Freelancer Payout Controller
 * Manages payout requests and withdrawals for freelancers
 */

const Payout = require("../models/Payout");
const Payment = require("../models/Payment");
const User = require("../models/User");
const ProjectProgress = require("../models/ProjectProgress");

/**
 * Calculate available balance for a freelancer
 * (released payments minus already requested payouts)
 */
const calculateAvailableBalance = async (userId) => {
  try {
    // Get all released payments for this user's completed gigs
    const payments = await Payment.find({
      gig: { $exists: true },
      escrowStatus: "released",
    });

    // Get all gigs where user is the freelancer
    const projects = await ProjectProgress.find({
      freelancer: userId,
      status: "completed",
    }).select("gig");

    const gigIds = projects.map((p) => p.gig.toString());

    // Filter payments for this freelancer's completed gigs
    const freelancerPayments = payments.filter((p) => gigIds.includes(p.gig.toString()));

    const totalReleased = freelancerPayments.reduce((sum, p) => sum + p.amount, 0);

    // Get all pending and processing payouts
    const pendingPayouts = await Payout.find({
      freelancer: userId,
      status: { $in: ["pending", "processing"] },
    });

    const totalRequested = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = Math.max(0, totalReleased - totalRequested);

    return {
      success: true,
      availableBalance,
      totalReleased,
      totalRequested,
    };
  } catch (error) {
    console.error("Error calculating available balance:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Request a payout
 */
exports.requestPayout = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, bankAccountId, payoutMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const balanceResult = await calculateAvailableBalance(userId);
    if (!balanceResult.success) {
      return res.status(400).json({ success: false, message: balanceResult.error });
    }

    if (amount > balanceResult.availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Requested amount exceeds available balance. Available: ${balanceResult.availableBalance}`,
      });
    }

    const payout = new Payout({
      freelancer: userId,
      amount,
      bankAccountId: bankAccountId || (req.user.bankAccountId),
      payoutMethod: payoutMethod || "bank_transfer",
      status: "pending",
    });

    await payout.save();

    res.status(201).json({
      success: true,
      message: "Payout request created",
      payout,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error requesting payout" });
  }
};

/**
 * Get pending payouts for a user
 */
exports.getPendingPayouts = async (req, res) => {
  try {
    const userId = req.user._id;

    const payouts = await Payout.find({
      freelancer: userId,
      status: { $in: ["pending", "processing"] },
    }).sort({ requestDate: -1 });

    res.json({
      success: true,
      payouts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching pending payouts" });
  }
};

/**
 * Get payout history
 */
exports.getPayoutHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const payouts = await Payout.find({
      freelancer: userId,
      status: { $in: ["completed", "failed"] },
    }).sort({ completionDate: -1 });

    res.json({
      success: true,
      payouts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching payout history" });
  }
};

/**
 * Get available balance
 */
exports.getAvailableBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await calculateAvailableBalance(userId);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      availableBalance: result.availableBalance,
      totalReleased: result.totalReleased,
      totalRequested: result.totalRequested,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error calculating balance" });
  }
};

/**
 * Update bank account details
 */
exports.updateBankAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bankAccountId, payoutMethod } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        bankAccountId: bankAccountId || user.bankAccountId,
        $set: {
          "payoutPreferences.method": payoutMethod || "bank_transfer",
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Bank account updated",
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error updating bank account" });
  }
};

/**
 * Admin: Get all payouts
 */
exports.getAllPayouts = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const payouts = await Payout.find()
      .populate("freelancer", "fullName email")
      .sort({ requestDate: -1 });

    res.json({
      success: true,
      payouts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching payouts" });
  }
};

/**
 * Admin: Update payout status
 */
exports.updatePayoutStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { payoutId } = req.params;
    const { status, transactionId, failureReason } = req.body;

    const payout = await Payout.findByIdAndUpdate(
      payoutId,
      {
        status,
        transactionId: transactionId || undefined,
        failureReason: failureReason || undefined,
        completionDate: status === "completed" ? new Date() : undefined,
      },
      { new: true }
    );

    if (!payout) {
      return res.status(404).json({ success: false, message: "Payout not found" });
    }

    res.json({
      success: true,
      message: "Payout status updated",
      payout,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error updating payout status" });
  }
};
