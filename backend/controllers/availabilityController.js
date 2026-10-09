/**
 * Availability Scheduler Controller
 * Manages freelancer availability slots and booking
 */

const Availability = require("../models/Availability");
const User = require("../models/User");

const getCurrentUserId = (req) => req.user?.id || req.user?._id;

const toMinutes = (time) => {
  if (!time) return null;
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateOnly = (date) => {
  const value = new Date(date);
  return value.toISOString().slice(0, 10);
};

const getAvailabilitySlotForDay = (availability, dayName) => {
  return (availability.availabilitySlots || []).find((slot) => slot.dayOfWeek === dayName);
};

const isDateInAvailabilityWindow = (availability, date) => {
  const slot = getAvailabilitySlotForDay(availability, date.toLocaleDateString("en-US", { weekday: "long" }));
  if (!slot) return false;
  const startMinutes = toMinutes(slot.startTime);
  const endMinutes = toMinutes(slot.endTime);
  if (startMinutes == null || endMinutes == null || startMinutes >= endMinutes) return false;
  return true;
};

const hasConflict = (availability, start, end) => {
  const normalizedStart = new Date(start);
  const normalizedEnd = new Date(end);
  return (availability.bookedSlots || []).some((booking) => {
    if (booking.status === "cancelled") return false;
    const bookingStart = new Date(booking.startDate);
    const bookingEnd = new Date(booking.endDate);
    return normalizedStart <= bookingEnd && normalizedEnd >= bookingStart;
  });
};

const autoScheduleWindow = (availability, preferredStartDate, durationDays = 1, maxDays = 90) => {
  const startDate = preferredStartDate ? new Date(preferredStartDate) : new Date();
  const startOfDay = new Date(startDate);
  startOfDay.setHours(0, 0, 0, 0);

  for (let offset = 0; offset <= maxDays; offset += 1) {
    const candidateStart = addDays(startOfDay, offset);
    const candidateEnd = addDays(candidateStart, durationDays - 1);
    let candidate = candidateStart;
    let fits = true;

    for (let dayOffset = 0; dayOffset < durationDays; dayOffset += 1) {
      const currentDay = addDays(candidateStart, dayOffset);
      if (!isDateInAvailabilityWindow(availability, currentDay)) {
        fits = false;
        break;
      }
      if (hasConflict(availability, currentDay, currentDay)) {
        fits = false;
        break;
      }
      candidate = currentDay;
    }

    if (fits) {
      return {
        startDate: candidateStart,
        endDate: candidateEnd,
      };
    }
  }

  return null;
};

/**
 * POST /api/availability/setup
 * Set up availability schedule for freelancer
 */
exports.setupAvailability = async (req, res) => {
  try {
    const { availabilitySlots, timezone, totalAvailableHours } = req.body;

    const freelancerId = getCurrentUserId(req);

    let availability = await Availability.findOne({ freelancer: freelancerId });

    if (availability) {
      // Update existing
      availability.availabilitySlots = availabilitySlots || availability.availabilitySlots;
      availability.timezone = timezone || availability.timezone;
      availability.totalAvailableHours = totalAvailableHours || availability.totalAvailableHours;
    } else {
      // Create new
      availability = new Availability({
        freelancer: freelancerId,
        availabilitySlots,
        timezone,
        totalAvailableHours,
      });
    }

    await availability.save();

    res.json({
      success: true,
      message: "Availability schedule saved",
      data: availability,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error setting up availability" });
  }
};

/**
 * GET /api/availability/:freelancerId
 * Get freelancer's availability schedule
 */
exports.getAvailability = async (req, res) => {
  try {
    const { freelancerId } = req.params;

    const availability = await Availability.findOne({ freelancer: freelancerId });

    if (!availability) {
      return res.status(404).json({ success: false, message: "Availability not found" });
    }

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching availability" });
  }
};

exports.getMyAvailability = async (req, res) => {
  try {
    const freelancerId = getCurrentUserId(req);
    const availability = await Availability.findOne({ freelancer: freelancerId });

    if (!availability) {
      return res.status(404).json({ success: false, message: "Availability not found" });
    }

    res.json({ success: true, data: availability });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching availability" });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const availability = await Availability.find({ $or: [{ freelancer: userId }, { "bookedSlots.client": userId }] });

    const bookings = availability.flatMap((entry) =>
      (entry.bookedSlots || []).filter((slot) => slot.client?.toString() === userId?.toString() || entry.freelancer?.toString() === userId?.toString()).map((slot) => ({
        ...slot.toObject(),
        freelancer: entry.freelancer,
      }))
    );

    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching bookings" });
  }
};

/**
 * POST /api/availability/book
 * Book a freelancer for a specific time period
 */
exports.bookFreelancer = async (req, res) => {
  try {
    const { freelancerId, gigId, startDate, endDate, hoursPerDay, notes, autoSchedule = false, title } = req.body;

    if (!freelancerId) {
      return res.status(400).json({ success: false, message: "Freelancer ID is required" });
    }

    let availability = await Availability.findOne({ freelancer: freelancerId });

    if (!availability) {
      return res.status(404).json({ success: false, message: "Freelancer availability not set" });
    }

    let resolvedStart = startDate ? new Date(startDate) : null;
    let resolvedEnd = endDate ? new Date(endDate) : null;
    const normalizedHoursPerDay = Number(hoursPerDay || 8);

    if (autoSchedule || (!resolvedStart && !resolvedEnd)) {
      const preferredStart = startDate ? new Date(startDate) : new Date();
      const durationDays = resolvedStart && resolvedEnd ? Math.max(1, Math.ceil((resolvedEnd - resolvedStart) / (1000 * 60 * 60 * 24)) + 1) : 1;
      const scheduled = autoScheduleWindow(availability, preferredStart, durationDays, 90);
      if (!scheduled) {
        return res.status(400).json({ success: false, message: "No matching availability window was found in the next 90 days" });
      }
      resolvedStart = scheduled.startDate;
      resolvedEnd = scheduled.endDate;
    }

    if (!resolvedStart || !resolvedEnd) {
      return res.status(400).json({ success: false, message: "Start date and end date are required" });
    }

    const start = new Date(resolvedStart);
    const end = new Date(resolvedEnd);
    const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const bookingHours = durationDays * normalizedHoursPerDay;

    if (availability.totalBookedHours + bookingHours > availability.totalAvailableHours) {
      return res.status(400).json({
        success: false,
        message: `Not enough available hours. Freelancer has ${availability.totalAvailableHours - availability.totalBookedHours} hours left`,
      });
    }

    if (hasConflict(availability, start, end)) {
      return res.status(400).json({ success: false, message: "The selected time window overlaps with an existing booking" });
    }

    availability.bookedSlots.push({
      client: getCurrentUserId(req),
      startDate: start,
      endDate: end,
      gigId: gigId || undefined,
      hoursPerDay: normalizedHoursPerDay,
      status: "confirmed",
      title: title || "Scheduled session",
      notes: notes || "",
    });

    availability.totalBookedHours += bookingHours;
    availability.status = availability.totalBookedHours >= availability.totalAvailableHours ? "busy" : "available";

    availability.events.push({
      date: start,
      startDate: start,
      endDate: end,
      title: title || "Scheduled session",
      description: notes || "Booking created",
      type: "booking",
    });

    await availability.save();

    res.json({
      success: true,
      message: "Freelancer booked successfully",
      data: {
        availability,
        bookingDetails: {
          startDate: start,
          endDate: end,
          durationDays,
          hoursPerDay: normalizedHoursPerDay,
          totalBookingHours: bookingHours,
          remainingHours: availability.totalAvailableHours - availability.totalBookedHours,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error booking freelancer" });
  }
};

/**
 * POST /api/availability/add-event
 * Add calendar event (holiday, unavailable, etc)
 */
exports.addCalendarEvent = async (req, res) => {
  try {
    const { date, title, description, eventType } = req.body;

    const freelancerId = getCurrentUserId(req);
    let availability = await Availability.findOne({ freelancer: freelancerId });

    if (!availability) {
      availability = new Availability({ freelancer: freelancerId });
    }

    availability.events.push({
      date,
      title,
      description,
      type: eventType,
    });

    await availability.save();

    res.json({
      success: true,
      message: "Calendar event added",
      data: availability,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error adding calendar event" });
  }
};

/**
 * GET /api/availability/check-availability
 * Check if freelancer is available for specific date range
 */
exports.checkAvailability = async (req, res) => {
  try {
    const { freelancerId, startDate, endDate } = req.query;

    if (!freelancerId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: "Missing required parameters" });
    }

    const availability = await Availability.findOne({ freelancer: freelancerId });

    if (!availability) {
      return res.status(404).json({ success: false, message: "Availability not found" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const conflicts = (availability.bookedSlots || []).filter((booking) => {
      if (booking.status === "cancelled") return false;
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      return start <= bookingEnd && end >= bookingStart;
    });

    const unavailableEvents = (availability.events || []).filter((event) => {
      const eventStart = new Date(event.startDate || event.date);
      const eventEnd = new Date(event.endDate || event.date);
      return start <= eventEnd && end >= eventStart && event.type === "unavailable";
    });

    const isAvailable = conflicts.length === 0 && unavailableEvents.length === 0;

    res.json({
      success: true,
      data: {
        freelancerId,
        dateRange: { startDate, endDate },
        isAvailable,
        conflicts,
        unavailableEvents,
        availableHours: availability.totalAvailableHours - availability.totalBookedHours,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error checking availability" });
  }
};

/**
 * PUT /api/availability/:availabilityId
 * Update availability status (available, busy, away)
 */
exports.updateAvailabilityStatus = async (req, res) => {
  try {
    const { availabilityId } = req.params;
    const { status } = req.body;

    if (!["available", "busy", "away"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const availability = await Availability.findByIdAndUpdate(
      availabilityId,
      { status },
      { new: true }
    );

    if (!availability) {
      return res.status(404).json({ success: false, message: "Availability not found" });
    }

    res.json({
      success: true,
      message: "Status updated",
      data: availability,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error updating status" });
  }
};
