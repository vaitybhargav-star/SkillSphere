const User = require("../models/User");
const Gig = require("../models/Gig");
const Proposal = require("../models/Proposal");
const Review = require("../models/Review");
const Payment = require("../models/Payment");
const AuditLog = require("../models/AuditLog");
const { createNotification } = require("./notificationController");

const getAdminStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const freelancerCount = await User.countDocuments({ role: "freelancer" });
    const gigCount = await Gig.countDocuments();
    const activeGigs = await Gig.countDocuments({ status: "open" });

    // Use "accepted" as the proxy for completed work (Proposal schema uses accepted/rejected/pending)
    const completedProposals = await Proposal.countDocuments({ status: "accepted" });

    // Sum bidAmount for accepted proposals as total payouts
    const payoutData = await Proposal.aggregate([
      { $match: { status: "accepted" } },
      { $group: { _id: null, total: { $sum: "$bidAmount" } } },
    ]);

    const totalPayouts = payoutData[0]?.total || 0;

    res.status(200).json({ 
      success: true, 
      stats: { 
        userCount, 
        freelancerCount, 
        gigCount,
        activeGigs,
        completedProposals,
        totalPayouts,
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find()
          .select("fullName email role status isVerified verificationBadge createdAt twoFactorEnabled")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const previousStatus = user.status;
    user.status = user.status === "active" ? "suspended" : "active";
    await user.save();

    // create audit log
    try {
      await AuditLog.create({
        action: 'toggle_user_status',
        admin: req.user?._id,
        targetUser: user._id,
        details: { previousStatus, newStatus: user.status },
        ip: req.ip,
      });
    } catch (auditErr) {
      console.warn('Failed to write audit log for toggleUserStatus', auditErr);
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const verifyFreelancer = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role !== "freelancer") return res.status(400).json({ success: false, message: "Not a freelancer" });

    // Mark both the verification badge and canonical isVerified flag for consistency
    user.verificationBadge = true;
    user.isVerified = true;
    await user.save();

    // audit
    try {
      await AuditLog.create({
        action: 'verify_freelancer',
        admin: req.user?._id,
        targetUser: user._id,
        details: { note: 'Freelancer verified by admin' },
        ip: req.ip,
      });
    } catch (auditErr) {
      console.warn('Failed to write audit log for verifyFreelancer', auditErr);
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPaymentAnalytics = async (req, res) => {
  try {
    // Use the Payment model for accurate payment analytics
    const totalPayments = await Payment.countDocuments({ status: "paid" });
    const totalAmountAgg = await Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const escrowAnalytics = await Payment.aggregate([
      { $match: { provider: "escrow" } },
      { $group: { _id: "$escrowStatus", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPayments,
        totalAmount: totalAmountAgg[0]?.total || 0,
        platformRevenue: (totalAmountAgg[0]?.total || 0) * 0.1,
        escrowAnalytics,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const detectFraud = async (req, res) => {
  try {
    // Detect rapid proposals (potential spam)
    const suspiciousUsers = await Proposal.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      },
      { $group: { _id: "$freelancer", count: { $sum: 1 } } },
      { $match: { count: { $gt: 50 } } },
    ]);

    // Detect review manipulation
    const suspiciousReviews = await Review.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      { $group: { _id: "$reviewedUser", count: { $sum: 1 }, avgRating: { $avg: "$rating" } } },
      { $match: { count: { $gt: 20 }, avgRating: { $eq: 5 } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        suspiciousProposalSpammers: suspiciousUsers.length,
        suspiciousReviewManipulators: suspiciousReviews.length,
        details: { suspiciousUsers, suspiciousReviews },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/gigs/pending
 * Get all gigs pending approval
 */
const getPendingGigs = async (req, res) => {
  try {
    const gigs = await Gig.find({ approvalStatus: "pending" })
      .populate("client", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, gigs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/admin/gigs/:id/approve
 * Approve a gig
 */
const approveGig = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const gig = await Gig.findById(id);
    if (!gig) return res.status(404).json({ success: false, message: "Gig not found" });

    gig.approvalStatus = "approved";
    gig.approvedBy = req.user._id;
    gig.approvalNotes = notes || "";
    await gig.save();

    await createNotification({
      recipient: gig.client,
      title: "Gig approved",
      message: `Your gig "${gig.title}" has been approved and is now live!`,
      type: "general",
    });

    const freelancerRecipients = await User.find({ role: "freelancer" }).select("_id");
    const invitedRecipients = Array.isArray(gig.invitedFreelancers) ? gig.invitedFreelancers : [];
    const uniqueRecipients = [...new Set([...freelancerRecipients.map((user) => user._id.toString()), ...invitedRecipients.map((id) => id.toString())])];

    await Promise.all(uniqueRecipients.map((recipientId) => createNotification({
      recipient: recipientId,
      type: "new_gig_posted",
      title: "New gig posted",
      message: `A new gig titled "${gig.title}" is now available.`,
      sendEmail: true,
      metadata: { gigId: gig._id.toString() },
    })));

    // audit
    try {
      await AuditLog.create({
        action: 'approve_gig',
        admin: req.user?._id,
        targetGig: gig._id,
        targetUser: gig.client,
        details: { notes: notes || '' },
        ip: req.ip,
      });
    } catch (auditErr) {
      console.warn('Failed to write audit log for approveGig', auditErr);
    }

    res.status(200).json({ success: true, gig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/admin/gigs/:id/reject
 * Reject a gig
 */
const rejectGig = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: "Rejection reason is required" });
    }

    const gig = await Gig.findById(id);
    if (!gig) return res.status(404).json({ success: false, message: "Gig not found" });

    gig.approvalStatus = "rejected";
    gig.rejectionReason = reason;
    await gig.save();

    await createNotification({
      recipient: gig.client,
      title: "Gig rejected",
      message: `Your gig "${gig.title}" has been rejected. Reason: ${reason}`,
      type: "general",
    });

    // audit
    try {
      await AuditLog.create({
        action: 'reject_gig',
        admin: req.user?._id,
        targetGig: gig._id,
        targetUser: gig.client,
        details: { reason },
        ip: req.ip,
      });
    } catch (auditErr) {
      console.warn('Failed to write audit log for rejectGig', auditErr);
    }

    res.status(200).json({ success: true, gig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/gigs/stats
 * Get gig approval statistics
 */
const getGigApprovalStats = async (req, res) => {
  try {
    const pending = await Gig.countDocuments({ approvalStatus: "pending" });
    const approved = await Gig.countDocuments({ approvalStatus: "approved" });
    const rejected = await Gig.countDocuments({ approvalStatus: "rejected" });

    res.status(200).json({
      success: true,
      stats: { pending, approved, rejected, total: pending + approved + rejected },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTopCategories = async (req, res) => {
  try {
    const top = await Gig.aggregate([
      { $match: {} },
      { $group: { _id: "$category", count: { $sum: 1 }, avgBudget: { $avg: "$budget" } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { category: "$_id", count: 1, avgBudget: { $round: ["$avgBudget", 2] }, _id: 0 } },
    ]);

    res.status(200).json({ success: true, topCategories: top });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getJobSuccessRate = async (req, res) => {
  try {
    const totalProposals = await Proposal.countDocuments();
    const acceptedProposals = await Proposal.countDocuments({ status: "accepted" });
    const successRate = totalProposals === 0 ? 0 : (acceptedProposals / totalProposals) * 100;

    // Success rate by category
    const byCategory = await Proposal.aggregate([
      {
        $lookup: {
          from: "gigs",
          localField: "gig",
          foreignField: "_id",
          as: "gigData",
        },
      },
      { $unwind: "$gigData" },
      {
        $group: {
          _id: "$gigData.category",
          total: { $sum: 1 },
          accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
        },
      },
      {
        $project: {
          category: "$_id",
          total: 1,
          accepted: 1,
          successRate: { $cond: [{ $eq: ["$total", 0] }, 0, { $multiply: [{ $divide: ["$accepted", "$total"] }, 100] }] },
          _id: 0,
        },
      },
      { $sort: { successRate: -1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalProposals,
        acceptedProposals,
        successRate: Number(successRate.toFixed(2)),
        byCategory,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getComprehensiveDashboard = async (req, res) => {
  try {
    const [
      stats,
      users,
      pendingGigs,
      gigStats,
      paymentAnalytics,
      fraudData,
    ] = await Promise.all([
      (async () => {
        const userCount = await User.countDocuments();
        const freelancerCount = await User.countDocuments({ role: "freelancer" });
        const gigCount = await Gig.countDocuments();
        const activeGigs = await Gig.countDocuments({ status: "open" });
        const acceptedProposals = await Proposal.countDocuments({ status: "accepted" });
        
        const payoutData = await Proposal.aggregate([
          { $match: { status: "accepted" } },
          { $group: { _id: null, total: { $sum: "$bidAmount" } } },
        ]);
        
        return { 
          userCount, 
          freelancerCount, 
          gigCount,
          activeGigs,
          acceptedProposals,
          totalPayouts: payoutData[0]?.total || 0,
        };
      })(),
      User.find().select("fullName email role status isVerified verificationBadge createdAt").sort({ createdAt: -1 }).limit(10),
      Gig.find({ approvalStatus: "pending" }).populate("client", "fullName email").sort({ createdAt: -1 }),
      (async () => {
        const pending = await Gig.countDocuments({ approvalStatus: "pending" });
        const approved = await Gig.countDocuments({ approvalStatus: "approved" });
        const rejected = await Gig.countDocuments({ approvalStatus: "rejected" });
        return { pending, approved, rejected, total: pending + approved + rejected };
      })(),
      (async () => {
        const totalPayments = await Payment.countDocuments({ status: "paid" });
        const totalAmountAgg = await Payment.aggregate([
          { $match: { status: "paid" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const escrowAnalytics = await Payment.aggregate([
          { $match: { provider: "escrow" } },
          { $group: { _id: "$escrowStatus", count: { $sum: 1 }, total: { $sum: "$amount" } } },
        ]);
        return {
          totalPayments,
          totalAmount: totalAmountAgg[0]?.total || 0,
          platformRevenue: (totalAmountAgg[0]?.total || 0) * 0.1,
          escrowAnalytics,
        };
      })(),
      (async () => {
        const suspiciousUsers = await Proposal.aggregate([
          {
            $match: {
              createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          },
          { $group: { _id: "$freelancer", count: { $sum: 1 } } },
          { $match: { count: { $gt: 50 } } },
        ]);

        const suspiciousReviews = await Review.aggregate([
          {
            $match: {
              createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          },
          { $group: { _id: "$reviewedUser", count: { $sum: 1 }, avgRating: { $avg: "$rating" } } },
          { $match: { count: { $gt: 20 }, avgRating: { $eq: 5 } } },
        ]);

        return {
          suspiciousProposalSpammers: suspiciousUsers.length,
          suspiciousReviewManipulators: suspiciousReviews.length,
          details: { suspiciousUsers, suspiciousReviews },
        };
      })(),
    ]);

    res.status(200).json({
      success: true,
      dashboard: {
        stats,
        recentUsers: users,
        pendingGigs,
        gigStats,
        paymentAnalytics,
        fraudData,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin audit logs viewer
const getAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    const query = {};
    // optional filters
    if (req.query.action) query.action = req.query.action;
    if (req.query.admin) query.admin = req.query.admin;
    if (req.query.targetUser) query.targetUser = req.query.targetUser;
    if (req.query.targetGig) query.targetGig = req.query.targetGig;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).populate('admin', 'fullName email').populate('targetUser', 'fullName email').populate('targetGig', 'title').sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({ success: true, data: { logs, total, page, limit } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { 
  getAdminStats, 
  getUsers, 
  toggleUserStatus,
  verifyFreelancer,
  getPaymentAnalytics,
  detectFraud,
  getPendingGigs,
  approveGig,
  rejectGig,
  getGigApprovalStats,
  getTopCategories,
  getJobSuccessRate,
  getComprehensiveDashboard,
  getAuditLogs,
};
