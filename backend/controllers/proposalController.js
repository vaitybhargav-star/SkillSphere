const Proposal = require("../models/Proposal");
const Gig = require("../models/Gig");
const { createNotification } = require("./notificationController");

const submitProposal = async (req, res) => {
  try {
    const { gigId, proposalText, bidAmount, estimatedTime } = req.body;
    const gig = await Gig.findById(gigId);

    if (!gig) return res.status(404).json({ success: false, message: "Gig not found" });

    const proposal = await Proposal.create({
      gig: gigId,
      freelancer: req.user._id,
      client: gig.client,
      proposalText,
      bidAmount,
      estimatedTime,
    });

    gig.proposals.push(proposal._id);
    await gig.save();

    res.status(201).json({ success: true, proposal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMyProposals = async (req, res) => {
  try {
    const proposals = await Proposal.find({ freelancer: req.user._id }).populate("gig");
    res.status(200).json({ success: true, proposals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProposalStatus = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id).populate("gig");
    if (!proposal) return res.status(404).json({ success: false, message: "Proposal not found" });

    if (req.user.role !== "admin" && proposal.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to update this proposal" });
    }

    if (req.body.negotiation) {
      const { counterOfferAmount, counterEstimatedTime, negotiationMessage } = req.body;
      if (!counterOfferAmount && !counterEstimatedTime && !negotiationMessage) {
        return res.status(400).json({ success: false, message: "Negotiation requires a counter offer amount, estimated time, or message." });
      }

      proposal.negotiationHistory = proposal.negotiationHistory || [];
      proposal.negotiationHistory.push({
        sender: "client",
        message: negotiationMessage || "Counter-offer requested",
        bidAmount: counterOfferAmount !== undefined ? Number(counterOfferAmount) : undefined,
        estimatedTime: counterEstimatedTime || undefined,
      });

      if (counterOfferAmount !== undefined) {
        proposal.counterOfferAmount = Number(counterOfferAmount);
      }
      if (counterEstimatedTime) {
        proposal.counterEstimatedTime = counterEstimatedTime;
      }
      if (negotiationMessage) {
        proposal.lastNegotiationMessage = negotiationMessage;
      }

      proposal.status = "pending";
      await proposal.save();
      return res.status(200).json({ success: true, proposal });
    }

    const previousStatus = proposal.status;

    if (req.body.status && ["pending", "accepted", "rejected"].includes(req.body.status)) {
      proposal.status = req.body.status;
    }

    await proposal.save();

    if (proposal.status === "accepted" && previousStatus !== "accepted") {
      await createNotification({
        recipient: proposal.freelancer,
        type: "proposal_accepted",
        title: "Proposal accepted",
        message: `Your proposal for "${proposal.gig?.title || "the gig"}" has been accepted.`,
        sendEmail: true,
        metadata: { proposalId: proposal._id.toString(), gigId: proposal.gig?._id?.toString?.() || proposal.gig?.toString?.() },
      });
    }

    res.status(200).json({ success: true, proposal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { submitProposal, getMyProposals, updateProposalStatus };
