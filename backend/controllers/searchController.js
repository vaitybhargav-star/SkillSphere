/**
 * Advanced Search Controller
 * Handles location-based, skill-based, and filter-based searches
 */

const Gig = require("../models/Gig");
const FreelancerProfile = require("../models/FreelancerProfile");
const User = require("../models/User");
const Review = require("../models/Review");

const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Search gigs with multiple filters
 * GET /api/search/gigs?
 *   q=search_term&
 *   skills=React,Node&
 *   minBudget=100&
 *   maxBudget=5000&
 *   minRating=4&
 *   location=New York&
 *   experience=intermediate&
 *   sort=newest
 */
exports.searchGigs = async (req, res) => {
  try {
    const {
      q,
      skills,
      minBudget,
      maxBudget,
      minRating,
      location,
      experience,
      sort = "newest",
      limit = 20,
      page = 1,
    } = req.query;

    const filters = { status: "open" };
    const normalizedLimit = Math.max(1, parseInt(limit, 10) || 20);
    const normalizedPage = Math.max(1, parseInt(page, 10) || 1);

    // Text search
    if (q) {
      filters.$text = { $search: q };
    }

    // Skills filter
    if (skills) {
      const skillArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (skillArray.length > 0) {
        filters.skills = {
          $elemMatch: {
            $regex: skillArray.map((skill) => escapeRegExp(skill)).join("|"),
            $options: "i",
          },
        };
      }
    }

    // Budget filter
    const normalizedMinBudget = parseNumber(minBudget);
    const normalizedMaxBudget = parseNumber(maxBudget);
    if (normalizedMinBudget !== null || normalizedMaxBudget !== null) {
      filters.budget = {};
      if (normalizedMinBudget !== null) filters.budget.$gte = normalizedMinBudget;
      if (normalizedMaxBudget !== null) filters.budget.$lte = normalizedMaxBudget;
    }

    // Experience level filter
    if (experience) {
      filters.requiredExperience = experience.toLowerCase();
    }

    // Location filter (simple string match)
    if (location) {
      filters.location = { $regex: location, $options: "i" };
    }

    // Rating filter (minimum required freelancer rating for the gig)
    const normalizedMinRating = parseNumber(minRating);
    if (normalizedMinRating !== null) {
      filters.minRating = { $gte: normalizedMinRating };
    }

    // Pagination
    const skip = (normalizedPage - 1) * normalizedLimit;

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };
    if (sort === "budget-high") sortOption = { budget: -1 };
    if (sort === "budget-low") sortOption = { budget: 1 };

    // Execute query
    const gigs = await Gig.find(filters)
      .populate("client", "fullName email profileImage")
      .sort(sortOption)
      .skip(skip)
      .limit(normalizedLimit);

    const total = await Gig.countDocuments(filters);

    res.json({
      success: true,
      data: {
        gigs,
        pagination: {
          total,
          page: normalizedPage,
          pages: Math.ceil(total / normalizedLimit),
          limit: normalizedLimit,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Search failed", error: error.message });
  }
};

/**
 * Search freelancers with filters
 * GET /api/search/freelancers?
 *   q=search_term&
 *   skills=React,Node&
 *   minRate=50&
 *   maxRate=150&
 *   minRating=4&
 *   location=New York&
 *   minExperience=2&
 *   sort=rating
 */
exports.searchFreelancers = async (req, res) => {
  try {
    const {
      q,
      skills,
      minRate,
      maxRate,
      minRating,
      minExperience,
      location,
      available,
      sort = "rating",
      limit = 20,
      page = 1,
    } = req.query;

    const filters = { verified: true };
    const normalizedLimit = Math.max(1, parseInt(limit, 10) || 20);
    const normalizedPage = Math.max(1, parseInt(page, 10) || 1);

    // Search by name, title, bio, skills, or location
    if (q) {
      const matchingUsers = await User.find({ fullName: { $regex: q, $options: "i" } }).select("_id").lean();
      const userIds = matchingUsers.map((user) => user._id);

      filters.$or = [
        { title: { $regex: q, $options: "i" } },
        { bio: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
        { "skills.name": { $regex: q, $options: "i" } },
      ];

      if (userIds.length > 0) {
        filters.$or.unshift({ user: { $in: userIds } });
      }
    }

    // Skills filter
    if (skills) {
      const skillArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (skillArray.length > 0) {
        filters["skills.name"] = {
          $regex: skillArray.map((skill) => escapeRegExp(skill)).join("|"),
          $options: "i",
        };
      }
    }

    // Rate filter
    const normalizedMinRate = parseNumber(minRate);
    const normalizedMaxRate = parseNumber(maxRate);
    if (normalizedMinRate !== null || normalizedMaxRate !== null) {
      filters.hourlyRate = {};
      if (normalizedMinRate !== null) filters.hourlyRate.$gte = normalizedMinRate;
      if (normalizedMaxRate !== null) filters.hourlyRate.$lte = normalizedMaxRate;
    }

    // Experience filter
    const normalizedMinExperience = parseNumber(minExperience);
    if (normalizedMinExperience !== null) {
      filters.experience = { $gte: normalizedMinExperience };
    }

    // Location filter
    if (location) {
      filters.location = { $regex: location, $options: "i" };
    }

    // Availability filter
    if (available === "true") {
      filters.availability = true;
    }

    // Pagination
    const skip = (normalizedPage - 1) * normalizedLimit;

    // Sorting
    let sortOption = { rating: -1 };
    if (sort === "rate-low") sortOption = { hourlyRate: 1 };
    if (sort === "rate-high") sortOption = { hourlyRate: -1 };
    if (sort === "experience") sortOption = { experience: -1 };
    if (sort === "recent") sortOption = { createdAt: -1 };

    // Execute query
    const profiles = await FreelancerProfile.find(filters)
      .populate("user", "fullName email profileImage status")
      .sort(sortOption)
      .skip(skip)
      .limit(normalizedLimit)
      .lean();

    // Get ratings for each freelancer
    const profilesWithRatings = await Promise.all(
      profiles.map(async (profile) => {
        const reviews = await Review.find({ reviewee: profile.user._id }).select("rating");
        const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2) : 0;
        return {
          ...profile,
          averageRating: Number(avgRating),
          reviewCount: reviews.length,
        };
      })
    );

    // Filter by minimum rating if specified
    let filtered = profilesWithRatings;
    const normalizedMinRating = parseNumber(minRating);
    if (normalizedMinRating !== null) {
      filtered = profilesWithRatings.filter((p) => p.averageRating >= normalizedMinRating);
    }

    const total = filtered.length;

    res.json({
      success: true,
      data: {
        freelancers: filtered.slice(skip, skip + normalizedLimit),
        pagination: {
          total,
          page: normalizedPage,
          limit: normalizedLimit,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Search failed", error: error.message });
  }
};

/**
 * Get filter options and suggestions
 * GET /api/search/filters
 */
exports.getFilterOptions = async (req, res) => {
  try {
    const gigs = await Gig.find({ status: "open" }).select("skills location budget requiredExperience").lean();
    const freelancerProfiles = await FreelancerProfile.find({ verified: true }).select("skills location experience hourlyRate rating").lean();

    const skillsSet = new Set();
    gigs.forEach((gig) => {
      gig.skills.forEach((skill) => skillsSet.add(skill));
    });
    freelancerProfiles.forEach((profile) => {
      profile.skills?.forEach((skill) => skillsSet.add(skill.name));
    });

    const skills = Array.from(skillsSet).sort();
    const categories = await Gig.distinct("category");

    const locations = Array.from(
      new Set([
        ...gigs.map((gig) => gig.location).filter(Boolean),
        ...freelancerProfiles.map((profile) => profile.location).filter(Boolean),
      ])
    ).sort();

    const budgetStats = await Gig.aggregate([
      { $match: { status: "open" } },
      {
        $group: {
          _id: null,
          minBudget: { $min: "$budget" },
          maxBudget: { $max: "$budget" },
          avgBudget: { $avg: "$budget" },
        },
      },
    ]);

    const hourlyRateStats = await FreelancerProfile.aggregate([
      { $match: { verified: true } },
      {
        $group: {
          _id: null,
          minRate: { $min: "$hourlyRate" },
          maxRate: { $max: "$hourlyRate" },
          avgRate: { $avg: "$hourlyRate" },
        },
      },
    ]);

    const budget = budgetStats.length > 0 ? budgetStats[0] : { minBudget: 100, maxBudget: 10000, avgBudget: 2000 };
    const hourlyRate = hourlyRateStats.length > 0 ? hourlyRateStats[0] : { minRate: 20, maxRate: 300, avgRate: 75 };

    res.json({
      success: true,
      data: {
        skills,
        categories,
        locations,
        experience: ["beginner", "intermediate", "expert"],
        budget,
        hourlyRate,
        ratings: [1, 2, 3, 4, 5],
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch filter options" });
  }
};
