const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
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
} = require("../controllers/adminController");

router.get("/stats", protect, authorizeRoles("admin"), getAdminStats);
router.get("/users", protect, authorizeRoles("admin"), getUsers);
router.put("/users/:id/toggle-status", protect, authorizeRoles("admin"), toggleUserStatus);
router.put("/users/:id/verify", protect, authorizeRoles("admin"), verifyFreelancer);

// Payment analytics
router.get("/payments/analytics", protect, authorizeRoles("admin"), getPaymentAnalytics);

// Top categories & job success analytics
router.get("/analytics/top-categories", protect, authorizeRoles("admin"), getTopCategories);
router.get("/analytics/job-success", protect, authorizeRoles("admin"), getJobSuccessRate);

// Fraud detection
router.get("/fraud/detect", protect, authorizeRoles("admin"), detectFraud);

// Gig approval routes
router.get("/gigs/pending", protect, authorizeRoles("admin"), getPendingGigs);
router.get("/gigs/stats", protect, authorizeRoles("admin"), getGigApprovalStats);
router.post("/gigs/:id/approve", protect, authorizeRoles("admin"), approveGig);
router.post("/gigs/:id/reject", protect, authorizeRoles("admin"), rejectGig);

// Comprehensive dashboard - combines all admin data
router.get("/dashboard", protect, authorizeRoles("admin"), getComprehensiveDashboard);

// Audit logs
router.get('/audit', protect, authorizeRoles('admin'), getAuditLogs);

// Job control endpoints (manual triggers and trending readout)
const { getTrendingSkills, getSchedulerRuns, runEmbeddingsNow, runTrendingNow } = require('../controllers/adminJobsController');
router.get('/trending-skills', protect, authorizeRoles('admin'), getTrendingSkills);
router.get('/jobs/runs', protect, authorizeRoles('admin'), getSchedulerRuns);
router.post('/jobs/run-embeddings', protect, authorizeRoles('admin'), runEmbeddingsNow);
router.post('/jobs/run-trending', protect, authorizeRoles('admin'), runTrendingNow);

module.exports = router;
