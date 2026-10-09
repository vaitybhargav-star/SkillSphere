const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const progressController = require("../controllers/progressController");
const { attachmentUpload } = require('../controllers/uploadsController');

const router = express.Router();

/**
 * Project Progress Tracker Routes
 */

// Create project progress tracker (client creates project)
router.post("/create", protect, authorizeRoles("client"), progressController.createProjectProgress);

// Get all projects for a client (authenticated)
router.get("/client/:clientId", protect, progressController.getClientProjects);

// Get project progress details (authenticated)
router.get("/:projectId", protect, progressController.getProjectProgress);

// Update project status (client or admin)
router.put("/:projectId/status", protect, progressController.updateProjectStatus);

// Add progress log (freelancer)
const { ensureProjectParticipant } = require('../middleware/projectAccess');

router.post("/:projectId/add-log", protect, authorizeRoles("freelancer"), ensureProjectParticipant, progressController.addProgressLog);

// Upload progress file (freelancer) - accepts multipart form field 'file'
router.post("/:projectId/upload", protect, authorizeRoles("freelancer"), ensureProjectParticipant, attachmentUpload.single('file'), progressController.uploadProgressFile);

// Update milestone (client)
router.put("/:projectId/milestone/:milestoneIndex", protect, authorizeRoles("client"), ensureProjectParticipant, progressController.updateMilestone);

// Complete milestone and release payment (client) - ensure client owns project (by gigId)
router.post("/:gigId/complete-milestone", protect, authorizeRoles("client"), ensureProjectParticipant, progressController.completeMilestone);

// Submit deliverable (freelancer)
router.post("/:projectId/deliverable", protect, authorizeRoles("freelancer"), ensureProjectParticipant, progressController.submitDeliverable);

// Approve/reject deliverable (client)
router.put("/:projectId/deliverable/:deliverableIndex", protect, authorizeRoles("client"), ensureProjectParticipant, progressController.approveDeliverable);

// Report issue (authenticated)
router.post("/:projectId/issue", protect, ensureProjectParticipant, progressController.reportIssue);

// Get all projects for a gig (public)
router.get("/gig/:gigId", progressController.getGigProjects);

// Get all projects for a freelancer (public)
router.get("/freelancer/:freelancerId", progressController.getFreelancerProjects);

module.exports = router;
