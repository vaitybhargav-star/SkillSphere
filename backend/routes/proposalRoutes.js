const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { submitProposal, getMyProposals, updateProposalStatus } = require("../controllers/proposalController");

// Only freelancers can submit proposals
router.post("/", protect, authorizeRoles("freelancer"), submitProposal);
router.get("/my", protect, getMyProposals);
// Only clients can update proposal status for proposals on their gigs
router.put("/:id", protect, authorizeRoles("client"), updateProposalStatus);

module.exports = router;
