const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { createGig, getAllGigs, getGigById, updateGigStatus, getGigProposals, getMyGigs, inviteFreelancer, updateGig } = require("../controllers/gigController");

// Only clients can create gigs
router.post("/", protect, authorizeRoles("client"), createGig);
router.get("/", getAllGigs);
router.get("/my", protect, authorizeRoles("client"), getMyGigs);
router.get("/:id", getGigById);
// Updating gig status could be client or admin - keep controller check but require authentication
router.put("/:id/status", protect, updateGigStatus);
router.put("/:id", protect, authorizeRoles("client"), updateGig);
// Only clients can view proposals for their gigs
router.get("/:id/proposals", protect, authorizeRoles("client"), getGigProposals);
router.post("/:id/invite", protect, authorizeRoles("client"), inviteFreelancer);

module.exports = router;
