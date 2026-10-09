/**
 * Project Progress Tracker Controller
 * Manages work milestones, deliverables, and progress tracking
 */

const ProjectProgress = require("../models/ProjectProgress");
const Proposal = require("../models/Proposal");
const Gig = require("../models/Gig");
const User = require("../models/User");
const Payment = require("../models/Payment");
const escrowController = require("./escrowController");

/**
 * POST /api/progress/create
 * Create progress tracker for accepted proposal
 */
exports.createProjectProgress = async (req, res) => {
  try {
    const { gigId, proposalId, milestones, projectStartDate, projectDeadline } = req.body;

    // Verify proposal exists and is accepted
    const proposal = await Proposal.findById(proposalId);
    if (!proposal || proposal.status !== "accepted") {
      return res.status(400).json({ success: false, message: "Invalid or unaccepted proposal" });
    }

    // Check if progress already exists
    const existingProgress = await ProjectProgress.findOne({ proposal: proposalId });
    if (existingProgress) {
      return res.status(400).json({ success: false, message: "Progress tracker already exists" });
    }

    const projectProgress = new ProjectProgress({
      gig: gigId,
      proposal: proposalId,
      freelancer: proposal.freelancer,
      client: proposal.client,
      milestones: milestones || [],
      projectStartDate,
      projectDeadline,
      status: "not-started",
    });

    await projectProgress.save();

    res.status(201).json({
      success: true,
      message: "Project progress tracker created",
      data: projectProgress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error creating progress tracker" });
  }
};

/**
 * GET /api/progress/:projectId
 * Get project progress details
 */
exports.getProjectProgress = async (req, res) => {
  try {
    const { projectId } = req.params;

    const progress = await ProjectProgress.findById(projectId)
      .populate("freelancer", "fullName email")
      .populate("client", "fullName email")
      .populate("gig", "title budget");

    if (!progress) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching project progress" });
  }
};

/**
 * PUT /api/progress/:projectId/status
 * Update overall project status
 */
exports.updateProjectStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status } = req.body;

    const validStatuses = ["not-started", "in-progress", "on-hold", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const progress = await ProjectProgress.findByIdAndUpdate(projectId, { status }, { new: true });

    if (!progress) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    res.json({
      success: true,
      message: "Project status updated",
      data: progress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error updating status" });
  }
};

/**
 * POST /api/progress/:projectId/add-log
 * Add a progress log entry
 */
exports.addProgressLog = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { description, percentageCompleted, filesUploaded, comments } = req.body;

    const progress = await ProjectProgress.findById(projectId);
    if (!progress) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    progress.progressLogs.push({
      date: new Date(),
      description,
      percentageCompleted,
      filesUploaded: filesUploaded || [],
      comments,
    });

    // Update overall completion — compute max of milestones and logs for safety
    if (typeof percentageCompleted === 'number') {
      progress.overallCompletion = Math.max(progress.overallCompletion || 0, percentageCompleted);
    }

    if (percentageCompleted === 100) {
      progress.status = "completed";
    } else if (percentageCompleted > 0) {
      progress.status = "in-progress";
    }

    await progress.save();

    res.json({
      success: true,
      message: "Progress log added",
      data: progress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error adding progress log" });
  }
};

/**
 * POST /api/progress/:projectId/upload
 * Upload a file for project progress (attachment). Uses multipart form 'file'.
 */
exports.uploadProgressFile = async (req, res) => {
  try {
    // req.file populated by multer middleware in route
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const projectId = req.params.projectId;
    const progress = await ProjectProgress.findById(projectId);
    if (!progress) return res.status(404).json({ success: false, message: 'Project not found' });

    // Perform upload (Cloudinary or local fallback) — mimic uploadsController.attachmentUploadHandler
    const cloudinary = require('cloudinary').v2;
    const path = require('path');
    const fs = require('fs');
    let url = null;

    if (cloudinary.config().api_key) {
      const streamifier = require('streamifier');
      const streamUpload = (buffer) => {
        return new Promise((resolve, reject) => {
          const options = {
            folder: 'skillsphere/progress',
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true,
          };
          const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (result) resolve(result);
            else reject(error);
          });
          streamifier.createReadStream(buffer).pipe(stream);
        });
      };

      const result = await streamUpload(req.file.buffer);
      url = result.secure_url;
    } else {
      // Save locally
      const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
      if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      const ext = path.extname(req.file.originalname) || '';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2,9)}${ext}`;
      const outPath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(outPath, req.file.buffer);
      url = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${filename}`;
    }

    // Attach to progress logs as latest log file
    const fileEntry = {
      filename: req.file.originalname || 'attachment',
      url,
      uploadedAt: new Date(),
    };

    // If there's an in-progress log, append; otherwise create a log
    if (progress.progressLogs && progress.progressLogs.length > 0) {
      const latestLog = progress.progressLogs[progress.progressLogs.length - 1];
      latestLog.filesUploaded = latestLog.filesUploaded || [];
      latestLog.filesUploaded.push(fileEntry);
    } else {
      progress.progressLogs.push({ date: new Date(), description: 'File upload', filesUploaded: [fileEntry] });
    }

    await progress.save();

    res.status(200).json({ success: true, file: fileEntry, progress });
  } catch (err) {
    console.error('Upload progress file error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/progress/:projectId/milestone/:milestoneIndex
 * Update milestone status
 */
exports.updateMilestone = async (req, res) => {
  try {
    const { projectId, milestoneIndex } = req.params;
    const { completionPercentage, status, deliverables } = req.body;

    const progress = await ProjectProgress.findById(projectId);
    if (!progress) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const milestone = progress.milestones[milestoneIndex];
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found" });
    }

    if (completionPercentage !== undefined) {
      milestone.completionPercentage = completionPercentage;
    }
    if (status) {
      milestone.status = status;
    }
    if (deliverables) {
      milestone.deliverables = deliverables;
    }

    // If milestone is marked as completed, release corresponding escrow payment
    if (status === "completed" && milestone.status !== "completed") {
      const gig = await Gig.findById(progress.gig);
      if (gig && gig.milestones[milestoneIndex] && gig.milestones[milestoneIndex].paymentAmount) {
        const payment = await Payment.findOne({
          gig: progress.gig,
          amount: gig.milestones[milestoneIndex].paymentAmount,
          escrowStatus: "held",
        });

        if (payment) {
          await escrowController.releasePayment(payment._id, projectId);
        }
      }
    }

    // Check if all milestones are completed
    const allCompleted = progress.milestones.every(
      (m) => m.completionPercentage === 100 || m.status === "completed"
    );

    if (allCompleted) {
      progress.overallCompletion = 100;
      progress.status = "completed";
    }

    await progress.save();

    res.json({
      success: true,
      message: "Milestone updated",
      data: progress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error updating milestone" });
  }
};

/**
 * POST /api/progress/:projectId/deliverable
 * Submit a deliverable
 */
exports.submitDeliverable = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, url } = req.body;

    const progress = await ProjectProgress.findById(projectId);
    if (!progress) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    progress.deliverables.push({
      title,
      description,
      url,
      status: "submitted",
    });

    await progress.save();

    res.json({
      success: true,
      message: "Deliverable submitted",
      data: progress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error submitting deliverable" });
  }
};

/**
 * PUT /api/progress/:projectId/deliverable/:deliverableIndex
 * Approve or reject deliverable
 */
exports.approveDeliverable = async (req, res) => {
  try {
    const { projectId, deliverableIndex } = req.params;
    const { status } = req.body; // "approved" or "rejected"

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const progress = await ProjectProgress.findById(projectId);
    if (!progress) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const deliverable = progress.deliverables[deliverableIndex];
    if (!deliverable) {
      return res.status(404).json({ success: false, message: "Deliverable not found" });
    }

    deliverable.status = status;
    await progress.save();

    res.json({
      success: true,
      message: `Deliverable ${status}`,
      data: progress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error updating deliverable" });
  }
};

/**
 * POST /api/progress/:projectId/issue
 * Report an issue during project
 */
exports.reportIssue = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, severity } = req.body;

    const progress = await ProjectProgress.findById(projectId);
    if (!progress) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    progress.issues.push({
      title,
      description,
      severity,
      reportedBy: req.user.id,
      status: "open",
    });

    await progress.save();

    res.json({
      success: true,
      message: "Issue reported",
      data: progress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error reporting issue" });
  }
};

/**
 * GET /api/progress/gig/:gigId
 * Get all projects for a gig
 */
exports.getGigProjects = async (req, res) => {
  try {
    const { gigId } = req.params;

    const projects = await ProjectProgress.find({ gig: gigId })
      .populate("freelancer", "fullName email")
      .populate("client", "fullName email");

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching projects" });
  }
};

/**
 * GET /api/progress/freelancer/:freelancerId
 * Get all projects for a freelancer
 */
exports.getFreelancerProjects = async (req, res) => {
  try {
    const { freelancerId } = req.params;

    const projects = await ProjectProgress.find({ freelancer: freelancerId })
      .populate("gig", "title budget")
      .populate("client", "fullName email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching projects" });
  }
};

/**
 * GET /api/progress/client/:clientId
 * Get all projects for a client
 */
exports.getClientProjects = async (req, res) => {
  try {
    const { clientId } = req.params;

    const projects = await ProjectProgress.find({ client: clientId })
      .populate("gig", "title budget")
      .populate("freelancer", "fullName email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching client projects" });
  }
};

/**
 * POST /api/progress/:gigId/complete-milestone
 * Complete a milestone and release escrow payment
 */
exports.completeMilestone = async (req, res) => {
  try {
    const { gigId } = req.params;
    const { milestoneIndex } = req.body;

    const progress = await ProjectProgress.findOne({ gig: gigId });
    if (!progress) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const milestone = progress.milestones[milestoneIndex];
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found" });
    }

    const gig = await Gig.findById(gigId);
    if (!gig || !gig.milestones[milestoneIndex]) {
      return res.status(404).json({ success: false, message: "Gig milestone not found" });
    }

    const milestoneAmount = gig.milestones[milestoneIndex].paymentAmount;

    const payment = await Payment.findOne({
      gig: gigId,
      amount: milestoneAmount,
      escrowStatus: "held",
    });

    if (payment) {
      const result = await escrowController.releasePayment(payment._id, progress._id);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.error });
      }
    }

    milestone.status = "completed";
    milestone.completionPercentage = 100;

    const allCompleted = progress.milestones.every(
      (m) => m.completionPercentage === 100 || m.status === "completed"
    );

    if (allCompleted) {
      progress.overallCompletion = 100;
      progress.status = "completed";
    }

    await progress.save();

    res.json({
      success: true,
      message: "Milestone completed and payment released",
      data: progress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error completing milestone" });
  }
};
