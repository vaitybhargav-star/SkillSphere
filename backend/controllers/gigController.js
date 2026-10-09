const Gig = require("../models/Gig");
const Proposal = require("../models/Proposal");
const User = require("../models/User");
const { initializePipeline, getEmbedding } = require("../utils/huggingfaceMatching");

const createGig = async (req, res) => {
  try {
    const { title, description, category, budget, budgetType, minBudget, maxBudget, location, radius, skills, milestones, attachments } = req.body;
    const resolvedMinBudget = typeof minBudget === 'number' ? minBudget : minBudget ? Number(minBudget) : undefined;
    const resolvedMaxBudget = typeof maxBudget === 'number' ? maxBudget : maxBudget ? Number(maxBudget) : undefined;
    const resolvedBudget = typeof budget === 'number' ? budget : budget ? Number(budget) : undefined;
    const effectiveBudget = resolvedBudget || resolvedMaxBudget || resolvedMinBudget;

    if (!effectiveBudget || effectiveBudget <= 0) {
      return res.status(400).json({ success: false, message: "Budget or budget range must be provided" });
    }

    if ((resolvedMinBudget !== undefined || resolvedMaxBudget !== undefined) && (resolvedMinBudget === undefined || resolvedMaxBudget === undefined || resolvedMinBudget > resolvedMaxBudget)) {
      return res.status(400).json({ success: false, message: "Both minBudget and maxBudget must be provided and minBudget must be <= maxBudget" });
    }

    if (milestones && milestones.length > 0) {
      const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (Number(m.paymentAmount || m.amount) || 0), 0);
      if (totalMilestoneAmount !== effectiveBudget) {
        return res.status(400).json({
          success: false,
          message: `Milestone amounts must sum to budget. Total: ${totalMilestoneAmount}, Budget: ${effectiveBudget}`,
        });
      }

      const milestonesWithPayment = milestones.map((m) => ({
        ...m,
        paymentAmount: Number(m.paymentAmount || m.amount) || 0,
      }));

      const gig = await Gig.create({
        title,
        description,
        category,
        budget: effectiveBudget,
        budgetType: budgetType || "fixed",
        minBudget: resolvedMinBudget,
        maxBudget: resolvedMaxBudget,
        location,
        radius,
        skills,
        milestones: milestonesWithPayment,
        attachments: attachments || [],
        client: req.user._id,
        approvalStatus: "pending", // Set to pending by default
      });

      // compute and persist skill embeddings for the gig (non-blocking but awaited to ensure consistency)
      (async () => {
        try {
          const skillsArr = (skills || []).map(s => (typeof s === 'string' ? s : (s.name || ''))).filter(Boolean);
          if (skillsArr.length > 0) {
            await initializePipeline();
            const embeddings = [];
            for (const skill of skillsArr) {
              const emb = await getEmbedding(String(skill));
              if (emb && emb.length) embeddings.push({ skill, embedding: emb });
            }
            if (embeddings.length > 0) {
              await Gig.updateOne({ _id: gig._id }, { $set: { skillEmbeddings: embeddings } });
              console.log(`[Gig Embeddings] Saved ${embeddings.length} embeddings for gig ${gig._id}`);
            }
          }
        } catch (e) {
          console.warn('[Gig Embeddings] Failed to compute embeddings for gig', gig._id, e.message);
        }
      })();

      return res.status(201).json({ success: true, gig });
    }

    const gig = await Gig.create({
      title,
      description,
      category,
      budget: effectiveBudget,
      budgetType: budgetType || "fixed",
      minBudget: resolvedMinBudget,
      maxBudget: resolvedMaxBudget,
      location,
      radius,
      skills,
      milestones: milestones || [],
      attachments: attachments || [],
      client: req.user._id,
      approvalStatus: "pending", // Set to pending by default
    });

    // compute and persist skill embeddings for the gig (non-blocking but awaited to ensure consistency)
    (async () => {
      try {
        const skillsArr = (skills || []).map(s => (typeof s === 'string' ? s : (s.name || ''))).filter(Boolean);
        if (skillsArr.length > 0) {
          await initializePipeline();
          const embeddings = [];
          for (const skill of skillsArr) {
            const emb = await getEmbedding(String(skill));
            if (emb && emb.length) embeddings.push({ skill, embedding: emb });
          }
          if (embeddings.length > 0) {
            await Gig.updateOne({ _id: gig._id }, { $set: { skillEmbeddings: embeddings } });
            console.log(`[Gig Embeddings] Saved ${embeddings.length} embeddings for gig ${gig._id}`);
          }
        }
      } catch (e) {
        console.warn('[Gig Embeddings] Failed to compute embeddings for gig', gig._id, e.message);
      }
    })();

    res.status(201).json({ success: true, gig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllGigs = async (req, res) => {
  try {
    // Only show approved gigs to non-admins/non-creators
    const query = req.user && req.user.role === "admin" ? {} : { approvalStatus: "approved" };
    
    const gigs = await Gig.find(query)
      .populate("client", "fullName email")
      .sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, gigs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get gigs created by the current user (shows pending gigs to creator)
 */
const getMyGigs = async (req, res) => {
  try {
    const gigs = await Gig.find({ client: req.user._id })
      .populate("client", "fullName email")
      .sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, gigs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getGigById = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id)
      .populate("client", "fullName email")
      .populate("invitedFreelancers", "fullName email");
    if (!gig) return res.status(404).json({ success: false, message: "Gig not found" });
    res.status(200).json({ success: true, gig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateGigStatus = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: "Gig not found" });

    if (req.user.role !== "admin" && gig.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to update this gig" });
    }

    gig.status = req.body.status || gig.status;
    await gig.save();
    res.status(200).json({ success: true, gig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getGigProposals = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: "Gig not found" });

    if (req.user.role !== "admin" && gig.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to view proposals for this gig" });
    }

    const proposals = await Proposal.find({ gig: req.params.id }).populate("freelancer", "fullName email");
    res.status(200).json({ success: true, proposals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const inviteFreelancer = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: "Gig not found" });

    if (req.user.role !== "admin" && gig.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to invite freelancers to this gig" });
    }

    const { freelancerId } = req.body;
    if (!freelancerId) {
      return res.status(400).json({ success: false, message: "Freelancer ID is required" });
    }

    const freelancer = await User.findById(freelancerId);
    if (!freelancer || freelancer.role !== "freelancer") {
      return res.status(404).json({ success: false, message: "Freelancer not found" });
    }

    const alreadyInvited = gig.invitedFreelancers.some((id) => id.toString() === freelancerId.toString());
    if (alreadyInvited) {
      return res.status(200).json({ success: true, message: "Freelancer already invited", invitedFreelancers: gig.invitedFreelancers });
    }

    gig.invitedFreelancers.push(freelancerId);
    await gig.save();

    res.status(200).json({ success: true, message: "Freelancer invited successfully", invitedFreelancers: gig.invitedFreelancers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) return res.status(404).json({ success: false, message: "Gig not found" });

    if (req.user.role !== "admin" && gig.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to update this gig" });
    }

    const { title, description, category, budget, budgetType, minBudget, maxBudget, location, radius, skills, milestones, attachments } = req.body;
    const resolvedMinBudget = typeof minBudget === 'number' ? minBudget : minBudget ? Number(minBudget) : gig.minBudget;
    const resolvedMaxBudget = typeof maxBudget === 'number' ? maxBudget : maxBudget ? Number(maxBudget) : gig.maxBudget;
    const resolvedBudget = typeof budget === 'number' ? budget : budget ? Number(budget) : gig.budget;
    const effectiveBudget = resolvedBudget || resolvedMaxBudget || resolvedMinBudget;

    if ((resolvedMinBudget !== undefined || resolvedMaxBudget !== undefined) && (resolvedMinBudget === undefined || resolvedMaxBudget === undefined || resolvedMinBudget > resolvedMaxBudget)) {
      return res.status(400).json({ success: false, message: "Both minBudget and maxBudget must be provided and minBudget must be <= maxBudget" });
    }

    if (milestones && milestones.length > 0) {
      const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (Number(m.paymentAmount || m.amount) || 0), 0);
      if (totalMilestoneAmount !== effectiveBudget) {
        return res.status(400).json({
          success: false,
          message: `Milestone amounts must sum to budget. Total: ${totalMilestoneAmount}, Budget: ${effectiveBudget}`,
        });
      }
    }

    gig.title = title || gig.title;
    gig.description = description || gig.description;
    gig.category = category || gig.category;
    gig.budget = effectiveBudget || gig.budget;
    gig.budgetType = budgetType || gig.budgetType;
    gig.minBudget = resolvedMinBudget;
    gig.maxBudget = resolvedMaxBudget;
    gig.location = location || gig.location;
    gig.radius = radius !== undefined ? radius : gig.radius;
    gig.skills = skills || gig.skills;
    gig.milestones = milestones || gig.milestones;
    gig.attachments = attachments || gig.attachments;

    await gig.save();

    // recompute embeddings in background if skills present
    (async () => {
      try {
        const skillsArr = (gig.skills || []).map(s => (typeof s === 'string' ? s : (s.name || ''))).filter(Boolean);
        if (skillsArr.length > 0) {
          await initializePipeline();
          const embeddings = [];
          for (const skill of skillsArr) {
            const emb = await getEmbedding(String(skill));
            if (emb && emb.length) embeddings.push({ skill, embedding: emb });
          }
          if (embeddings.length > 0) {
            await Gig.updateOne({ _id: gig._id }, { $set: { skillEmbeddings: embeddings } });
            console.log(`[Gig Embeddings] Updated ${embeddings.length} embeddings for gig ${gig._id}`);
          }
        }
      } catch (e) {
        console.warn('[Gig Embeddings] Failed to update embeddings for gig', gig._id, e.message);
      }
    })();

    res.status(200).json({ success: true, gig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createGig, getAllGigs, getMyGigs, getGigById, updateGigStatus, getGigProposals, inviteFreelancer, updateGig };
