const Dispute = require("../models/Dispute");
const Proposal = require("../models/Proposal");
const Payment = require("../models/Payment");
const AuditLog = require("../models/AuditLog");
const { createNotification } = require("./notificationController");

// Initialize payment providers if configured
let stripe = null;
if (process.env.STRIPE_SECRET) {
  try {
    stripe = require("stripe")(process.env.STRIPE_SECRET);
  } catch (e) {
    stripe = null;
    console.warn("Stripe initialization failed:", e.message);
  }
}

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    const Razorpay = require("razorpay");
    razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  } catch (e) {
    razorpay = null;
    console.warn("Razorpay initialization failed:", e.message);
  }
}

const normalizeEvidence = (evidence, userId) => {
  if (!evidence) {
    return [];
  }

  const items = Array.isArray(evidence) ? evidence : [evidence];

  return items.map((item) => {
    if (typeof item === "string") {
      return {
        file: item,
        description: "",
        uploadedBy: userId,
      };
    }

    return {
      file: item.file || "",
      description: item.description || "",
      uploadedBy: userId,
    };
  });
};

const createDispute = async (req, res) => {
  try {
    const { proposalId, gig, reason, description, evidence = [] } = req.body;
    const userId = req.user._id;
    const resolvedProposalId = proposalId || gig;

    if (!resolvedProposalId || !reason) {
      return res.status(400).json({ success: false, message: "Proposal ID and reason are required" });
    }

    const proposal = await Proposal.findById(resolvedProposalId).populate("freelancer client");
    if (!proposal) {
      return res.status(404).json({ success: false, message: "Proposal not found" });
    }

    const isFreelancer = proposal.freelancer?._id?.toString() === userId.toString();
    const isClient = proposal.client?._id?.toString() === userId.toString();

    if (!isFreelancer && !isClient) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const dispute = new Dispute({
      proposal: resolvedProposalId,
      initiator: userId,
      reason,
      description,
      evidence: normalizeEvidence(evidence, userId),
      status: "open",
    });

    await dispute.save();

    res.status(201).json({
      success: true,
      dispute,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDisputes = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, limit = 20, skip = 0 } = req.query;
    const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
    const parsedSkip = Math.max(0, parseInt(skip, 10) || 0);

    let filter = {};

    if (req.user.role === "admin") {
      if (status) {
        filter.status = status;
      }
    } else {
      const relatedProposals = await Proposal.find({
        $or: [{ freelancer: userId }, { client: userId }],
      }).select("_id");

      filter = {
        proposal: { $in: relatedProposals.map((proposal) => proposal._id) },
      };

      if (status) {
        filter.status = status;
      }
    }

    const disputes = await Dispute.find(filter)
      .populate({ path: "proposal", populate: [{ path: "freelancer" }, { path: "client" }] })
      .populate("initiator", "fullName email")
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .skip(parsedSkip);

    const total = await Dispute.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: { disputes, total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDisputeDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const dispute = await Dispute.findById(id)
      .populate({ path: "proposal", populate: [{ path: "freelancer" }, { path: "client" }] })
      .populate("initiator", "fullName email")
      .populate("resolution.resolvedBy", "fullName");

    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }

    if (req.user.role !== "admin") {
      const isInitiator = dispute.initiator?._id?.toString() === userId.toString();
      const isParticipant = dispute.proposal?.freelancer?._id?.toString() === userId.toString() || dispute.proposal?.client?._id?.toString() === userId.toString();

      if (!isInitiator && !isParticipant) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }
    }

    res.status(200).json({
      success: true,
      dispute,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const { file, description } = req.body;

    const dispute = await Dispute.findById(id).populate({ path: "proposal", populate: [{ path: "freelancer" }, { path: "client" }] });
    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }

    if (req.user.role !== "admin") {
      const isInitiator = dispute.initiator?.toString() === req.user._id.toString();
      const isParticipant = dispute.proposal?.freelancer?._id?.toString() === req.user._id.toString() || dispute.proposal?.client?._id?.toString() === req.user._id.toString();

      if (!isInitiator && !isParticipant) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }
    }

    if (!file) {
      return res.status(400).json({ success: false, message: "Evidence file or note is required" });
    }

    dispute.evidence.push({
      file,
      description: description || "",
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
    });

    dispute.status = "under_review";
    await dispute.save();

    res.status(200).json({
      success: true,
      dispute,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const submitResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!response) {
      return res.status(400).json({ success: false, message: "Response is required" });
    }

    const dispute = await Dispute.findById(id).populate({ path: "proposal", populate: [{ path: "freelancer" }, { path: "client" }] });
    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }

    if (req.user.role !== "admin") {
      const isInitiator = dispute.initiator?.toString() === req.user._id.toString();
      const isParticipant = dispute.proposal?.freelancer?._id?.toString() === req.user._id.toString() || dispute.proposal?.client?._id?.toString() === req.user._id.toString();

      if (!isInitiator && !isParticipant) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }
    }

    if (dispute.responses.find((r) => r.respondent?.toString() === req.user._id.toString())) {
      return res.status(400).json({ success: false, message: "You have already submitted a response" });
    }

    dispute.responses.push({
      respondent: req.user._id,
      response,
      submittedAt: new Date(),
    });

    dispute.status = "under_review";
    await dispute.save();

    res.status(200).json({
      success: true,
      dispute,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resolveDispute = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can resolve disputes" });
    }

    const { id } = req.params;
    const { resolution, decision, refundPercentage } = req.body;

    const dispute = await Dispute.findById(id).populate({ path: "proposal", populate: [{ path: "freelancer" }, { path: "client" }] });
    if (!dispute) {
      return res.status(404).json({ success: false, message: "Dispute not found" });
    }

    const resolvedStatus = decision === "reject_dispute" ? "rejected" : "resolved";

    dispute.status = resolvedStatus;
    dispute.resolution = {
      resolvedBy: req.user._id,
      decision,
      resolution: resolution || "",
      refundPercentage: refundPercentage || 0,
      resolvedAt: new Date(),
    };

    // If admin decided to refund the client, attempt provider refunds (Stripe/Razorpay) and update payment records
    let refundAudit = [];
    if (decision === "refund_client") {
      try {
        if (dispute.proposal && dispute.proposal._id) {
          // Find any payments linked to this proposal/milestone
          const payments = await Payment.find({ relatedMilestoneId: dispute.proposal._id });

          for (const payment of payments) {
            try {
              // Determine refund amount based on refundPercentage (default 100)
              const pct = Number(refundPercentage) || 100;
              const refundAmount = Math.round((payment.amount || 0) * (pct / 100));

              let refundResult = null;
              if (payment.provider === "stripe" && stripe) {
                // Try multiple common fields for identifying the payment
                const paymentIntent = payment.providerData?.paymentIntentId || payment.providerData?.paymentIntent || payment.providerData?.stripePaymentIntentId || payment.providerData?.chargeId || payment.paymentReference;
                if (paymentIntent) {
                  const amountCents = Math.round(refundAmount * 100);
                  try {
                    refundResult = await stripe.refunds.create({ payment_intent: paymentIntent, amount: amountCents });
                  } catch (sErr) {
                    // Some integrations may refund by charge id
                    try {
                      refundResult = await stripe.refunds.create({ charge: paymentIntent, amount: amountCents });
                    } catch (sErr2) {
                      console.error("Stripe refund failed for", payment._id.toString(), sErr.message || sErr2.message);
                    }
                  }
                }
              } else if (payment.provider === "razorpay" && razorpay) {
                const razorpayPaymentId = payment.providerData?.razorpayPaymentId || payment.providerData?.razorpayPayment_id || payment.paymentReference;
                if (razorpayPaymentId) {
                  try {
                    // Razorpay expects amount in paise
                    const amountPaise = Math.round(refundAmount * 100);
                    refundResult = await razorpay.payments.refund(razorpayPaymentId, { amount: amountPaise });
                  } catch (rErr) {
                    console.error("Razorpay refund failed for", payment._id.toString(), rErr.message);
                  }
                }
              }

              // If provider refund succeeded, record it; otherwise still mark DB as refunded for escrow/mock
              payment.refundDetails = payment.refundDetails || {};
              if (refundResult) {
                payment.refundDetails = {
                  provider: payment.provider,
                  refundId: refundResult.id || refundResult._id || refundResult.entity || refundResult.refund_id || null,
                  raw: refundResult,
                };
                payment.status = "refunded";
                payment.escrowStatus = "refunded";
                payment.refundedAt = new Date();
                payment.refundReason = resolution || "Refunded by admin via dispute resolution";
                await payment.save();

                refundAudit.push({ paymentId: payment._id, provider: payment.provider, refundId: payment.refundDetails.refundId, amount: refundAmount });
              } else {
                // No provider refund (provider not configured or refund failed) — update DB to reflect refund state
                if (["held", "disputed", "pending"].includes(payment.escrowStatus) || payment.status !== "refunded") {
                  payment.escrowStatus = "refunded";
                  payment.status = "refunded";
                  payment.refundReason = resolution || "Refunded by admin via dispute resolution (provider refund not performed)";
                  payment.refundedAt = new Date();
                  await payment.save();
                }

                refundAudit.push({ paymentId: payment._id, provider: payment.provider, refundId: null, amount: refundAmount, note: "DB-marked refund; provider refund not performed" });
              }
            } catch (innerErr) {
              console.error("Payment refund loop error for payment", payment._id.toString(), innerErr.message);
              refundAudit.push({ paymentId: payment._id, error: innerErr.message });
            }
          }
        }
      } catch (payErr) {
        console.error("Error while processing refunds during dispute resolution:", payErr.message);
      }
    }

    // Save dispute changes before notifications/audit
    await dispute.save();

    // Update proposal status based on decision
    if (dispute.proposal) {
      if (decision === "refund_client") {
        dispute.proposal.status = "refunded";
      } else if (decision === "accept_freelancer") {
        dispute.proposal.status = "completed";
      }
      await dispute.proposal.save();
    }

    // Create an audit log entry for admin action
    try {
      await AuditLog.create({
        action: "resolve_dispute",
        admin: req.user._id,
        targetUser: dispute.initiator || null,
        targetGig: dispute.proposal?._id || null,
        details: { disputeId: dispute._id, decision, resolution, refundPercentage, refunds: refundAudit },
        ip: req.ip,
      });
    } catch (auditErr) {
      console.warn("Failed to create audit log for dispute resolution:", auditErr.message);
    }

    // Send notifications to involved parties (client and freelancer)
    try {
      const clientId = dispute.proposal?.client?._id || (dispute.proposal?.client || null);
      const freelancerId = dispute.proposal?.freelancer?._id || (dispute.proposal?.freelancer || null);

      const title = `Dispute ${dispute._id} resolved`;
      const msg = `Decision: ${decision}. ${resolution || ""}`;

      if (clientId) {
        await createNotification({ recipient: clientId, type: "dispute_resolved", title, message: msg, sendEmail: true, metadata: { disputeId: dispute._id.toString() } });
      }
      if (freelancerId) {
        await createNotification({ recipient: freelancerId, type: "dispute_resolved", title, message: msg, sendEmail: true, metadata: { disputeId: dispute._id.toString() } });
      }
    } catch (notifErr) {
      console.warn("Failed to send dispute resolution notifications:", notifErr.message);
    }

    if (dispute.proposal) {
      if (decision === "refund_client") {
        dispute.proposal.status = "refunded";
      } else if (decision === "accept_freelancer") {
        dispute.proposal.status = "completed";
      }
      await dispute.proposal.save();
    }

    res.status(200).json({
      success: true,
      dispute,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDisputeStats = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const stats = {
      total: await Dispute.countDocuments(),
      open: await Dispute.countDocuments({ status: "open" }),
      underReview: await Dispute.countDocuments({ status: "under_review" }),
      resolved: await Dispute.countDocuments({ status: "resolved" }),
      rejected: await Dispute.countDocuments({ status: "rejected" }),
    };

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createDispute,
  getDisputes,
  getDisputeDetails,
  addEvidence,
  submitResponse,
  resolveDispute,
  getDisputeStats,
};
