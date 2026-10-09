const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const availabilityController = require("../controllers/availabilityController");

const router = express.Router();

router.post("/setup", protect, authorizeRoles("freelancer"), availabilityController.setupAvailability);
router.get("/me", protect, availabilityController.getMyAvailability);
router.get("/bookings", protect, availabilityController.getMyBookings);
router.post("/book", protect, authorizeRoles("client"), availabilityController.bookFreelancer);
router.post("/add-event", protect, authorizeRoles("freelancer"), availabilityController.addCalendarEvent);
router.get("/check-availability", availabilityController.checkAvailability);
router.get("/:freelancerId", availabilityController.getAvailability);
router.put("/:availabilityId", protect, authorizeRoles("freelancer"), availabilityController.updateAvailabilityStatus);

module.exports = router;
