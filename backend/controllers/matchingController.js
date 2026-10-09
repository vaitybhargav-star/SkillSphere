/**
 * AI-Powered Job Matching Controller
 * Uses skill similarity scoring and freelancer recommendations
 * Enhanced with HuggingFace ML-based semantic matching
 */

const Gig = require("../models/Gig");
const User = require("../models/User");
const FreelancerProfile = require("../models/FreelancerProfile");
const Review = require("../models/Review");
const Proposal = require("../models/Proposal");
const { calculateMLSkillSimilarity, batchCalculateSkillSimilarity } = require("../utils/huggingfaceMatching");

/**
 * Calculate skill similarity score between gig and freelancer
 * @param {Array} gigSkills - Skills required for gig
 * @param {Array} freelancerSkills - Freelancer's skills
 * @returns {Number} Similarity score 0-1
 */
function normalizeSkillNames(skills) {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((skill) => {
      if (!skill) return "";
      if (typeof skill === "string") return skill.toLowerCase().trim();
      if (typeof skill === "object" && skill.name) return String(skill.name).toLowerCase().trim();
      return String(skill).toLowerCase().trim();
    })
    .filter(Boolean);
}

function calculateSkillSimilarity(gigSkills, freelancerSkills) {
  const gigNames = normalizeSkillNames(gigSkills);
  const freelancerNames = normalizeSkillNames(freelancerSkills);
  if (gigNames.length === 0 || freelancerNames.length === 0) return 0;

  const matchedSkills = gigNames.filter((skill) => freelancerNames.includes(skill));
  return matchedSkills.length / gigNames.length;
}

/**
 * Calculate rating score (0-1)
 * @param {Number} rating - Rating 1-5
 * @returns {Number} Normalized score 0-1
 */
function normalizeRating(rating) {
  return rating ? (rating - 1) / 4 : 0;
}

/**
 * Calculate experience match (0-1)
 * @param {Number} gigExperience - Required experience level (beginner/intermediate/expert)
 * @param {Number} freelancerExperience - Freelancer experience in years
 * @returns {Number} Experience match score 0-1
 */
function calculateExperienceMatch(gigExperience, freelancerExperience) {
  const experienceLevels = { beginner: 0, intermediate: 3, expert: 10 };
  const required = experienceLevels[gigExperience] || 0;

  if (freelancerExperience >= required) return 1;
  return Math.max(0, freelancerExperience / (required || 1));
}

/**
 * GET /api/matching/recommend/:gigId
 * Get AI-recommended freelancers for a specific gig
 * Enhanced with HuggingFace ML-based semantic skill matching
 */
exports.getRecommendedFreelancers = async (req, res) => {
  try {
    const { gigId } = req.params;
    const { limit = 10, useML = true } = req.query;

    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ success: false, message: "Gig not found" });
    }

    const freelancerProfiles = await FreelancerProfile.find().populate("user", "fullName email profileImage location status isDeleted");

    // Get ML-based similarities if enabled
    let mlSimilarities = {};
    if (useML === "true" || useML === true) {
      try {
       const sourceSkills = (gig.skillEmbeddings && gig.skillEmbeddings.length > 0) ? gig.skillEmbeddings : (gig.skills || []);
       const mlResults = await batchCalculateSkillSimilarity(sourceSkills, freelancerProfiles);
       mlResults.forEach((result) => {
         mlSimilarities[result.freelancerId.toString()] = result.mlSimilarity;
       });
      } catch (error) {
        console.warn("⚠️ ML similarity calculation failed, falling back to basic matching:", error.message);
      }
    }

    const scoredFreelancers = await Promise.all(
      freelancerProfiles.map(async (profile) => {
        const freelancer = profile.user;
        if (!freelancer || freelancer.status !== "active" || freelancer.isDeleted) return null;

        const reviews = await Review.find({ reviewee: freelancer._id });
        const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0;

        const skillScore = calculateSkillSimilarity(gig.skills, profile.skills);
        const ratingScore = normalizeRating(avgRating);
        const experienceScore = calculateExperienceMatch(gig.requiredExperience, profile.experience);

        // Location scoring: prefer geo-based proximity when coordinates exist, fallback to substring match
        let locationScore = 0;
        try {
          if (gig.geoLocation && Array.isArray(gig.geoLocation.coordinates) && gig.geoLocation.coordinates.length === 2 && profile.geoLocation && Array.isArray(profile.geoLocation.coordinates) && profile.geoLocation.coordinates.length === 2) {
            // haversine distance (km)
            const toRad = (deg) => (deg * Math.PI) / 180;
            const [gigLon, gigLat] = gig.geoLocation.coordinates;
            const [freelancerLon, freelancerLat] = profile.geoLocation.coordinates;
            const R = 6371; // Earth radius km
            const dLat = toRad(freelancerLat - gigLat);
            const dLon = toRad(freelancerLon - gigLon);
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(gigLat)) * Math.cos(toRad(freelancerLat)) * Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distanceKm = R * c;

            // Normalize location score: within gig.radius km -> higher score
            const radiusKm = gig.radius || 50;
            const proximity = Math.max(0, (radiusKm - distanceKm) / radiusKm); // 1.0 for same location, 0 for distance >= radius
            locationScore = proximity * 0.15; // up to 0.15 bonus for proximity
          } else if (gig.location && profile.location) {
            const gigLocation = gig.location.toLowerCase().trim();
            const freelancerLocation = profile.location.toLowerCase().trim();
            if (gigLocation && freelancerLocation && freelancerLocation.includes(gigLocation)) {
              locationScore = 0.05;
            }
          }
        } catch (e) {
          console.warn('Location scoring failed:', e.message);
        }

        // Use ML-based similarity if available, otherwise use basic skill matching
        const mlScore = mlSimilarities[profile._id.toString()] || skillScore;
        const finalSkillScore = useML === "true" || useML === true ? mlScore * 0.7 + skillScore * 0.3 : skillScore;

        const matchScore = finalSkillScore * 0.45 + ratingScore * 0.3 + experienceScore * 0.2 + locationScore;

        const hasProposal = await Proposal.exists({ gig: gigId, freelancer: freelancer._id });

        return {
          freelancerId: freelancer._id,
          name: freelancer.fullName,
          email: freelancer.email,
          profileImage: freelancer.profileImage,
          title: profile.title,
          skills: profile.skills,
          hourlyRate: profile.hourlyRate,
          experience: profile.experience,
          rating: Number(avgRating.toFixed(2)),
          reviewCount: reviews.length,
          matchScore: Number((matchScore * 100).toFixed(2)),
          skillMatch: Number((finalSkillScore * 100).toFixed(2)),
          hasApplied: Boolean(hasProposal),
          breakdown: {
            skillScore: Number((finalSkillScore * 100).toFixed(2)),
            mlScore: Number((mlScore * 100).toFixed(2)),
            ratingScore: Number((ratingScore * 100).toFixed(2)),
            experienceScore: Number((experienceScore * 100).toFixed(2)),
            locationScore: Number((locationScore * 100).toFixed(2)),
          },
        };
      })
    );

    const recommendations = scoredFreelancers
      .filter(Boolean)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, Number(limit));

    res.json({
      success: true,
      data: {
        gigId,
        gigTitle: gig.title,
        recommendedFreelancers: recommendations,
        count: recommendations.length,
        mlEnabled: useML === "true" || useML === true,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching recommendations" });
  }
};

/**
 * GET /api/matching/find-gigs/:freelancerId
 * Get AI-recommended gigs for a freelancer
 * Enhanced with HuggingFace ML-based semantic skill matching
 */
exports.getRecommendedGigs = async (req, res) => {
  try {
    const { freelancerId } = req.params;
    const { limit = 10, useML = true } = req.query;

    const freelancer = await User.findById(freelancerId).select("-password");
    if (!freelancer || freelancer.role !== "freelancer") {
      return res.status(404).json({ success: false, message: "Freelancer not found" });
    }

    const profile = await FreelancerProfile.findOne({ user: freelancerId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Freelancer profile not found" });
    }

    const gigs = await Gig.find({ status: "open" }).populate("client", "fullName");

    // Calculate ML-based similarities if enabled
    let mlSimilarities = {};
    if (useML === "true" || useML === true) {
      try {
        const gigsList = gigs.map((gig) => ({
          _id: gig._id.toString(),
          skills: (gig.skillEmbeddings && gig.skillEmbeddings.length > 0) ? gig.skillEmbeddings : (gig.skills || []),
        }));

        // Get ML similarity for each gig
        for (let i = 0; i < gigsList.length; i++) {
          const mlSimilarity = await calculateMLSkillSimilarity(gigsList[i].skills, (profile.skillEmbeddings && profile.skillEmbeddings.length > 0) ? profile.skillEmbeddings : (profile.skills || []));
          mlSimilarities[gigsList[i]._id] = mlSimilarity;
        }
      } catch (error) {
        console.warn("⚠️ ML similarity calculation failed, falling back to basic matching:", error.message);
      }
    }

    const scoredGigs = gigs.map((gig) => {
      const skillScore = calculateSkillSimilarity(gig.skills, profile.skills);
      const budgetMatch = profile.hourlyRate && gig.budget ? Math.min(gig.budget / (profile.hourlyRate * 8), 1) : 0.5;
      const clientMatch = gig.client && gig.client.fullName ? 0.05 : 0;

      // Use ML-based similarity if available
      const mlScore = mlSimilarities[gig._id.toString()] || skillScore;
      const finalSkillScore = useML === "true" || useML === true ? mlScore * 0.7 + skillScore * 0.3 : skillScore;

      const matchScore = finalSkillScore * 0.55 + budgetMatch * 0.35 + clientMatch * 0.1;

      return {
        gigId: gig._id,
        title: gig.title,
        description: gig.description.substring(0, 120),
        category: gig.category,
        budget: gig.budget,
        budgetType: gig.budgetType,
        skills: gig.skills,
        deadline: gig.deadline,
        location: gig.location,
        client: gig.client?.fullName || "Unknown",
        matchScore: Number((matchScore * 100).toFixed(2)),
        skillMatch: Number((finalSkillScore * 100).toFixed(2)),
        breakdown: {
          skillScore: Number((finalSkillScore * 100).toFixed(2)),
          mlScore: Number((mlScore * 100).toFixed(2)),
          budgetMatch: Number((budgetMatch * 100).toFixed(2)),
          clientMatch: Number((clientMatch * 100).toFixed(2)),
        },
      };
    });

    const recommendations = scoredGigs.sort((a, b) => b.matchScore - a.matchScore).slice(0, Number(limit));

    res.json({
      success: true,
      data: {
        freelancerId,
        freelancerName: freelancer.fullName,
        recommendedGigs: recommendations,
        count: recommendations.length,
        mlEnabled: useML === "true" || useML === true,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching gig recommendations" });
  }
};

/**
 * GET /api/matching/trending-skills
 * Get trending skills across the platform
 */
exports.getTrendingSkills = async (req, res) => {
  try {
    // Get all gigs and count skill frequency
    const gigs = await Gig.find({ status: "open" });

    const skillFrequency = {};
    gigs.forEach((gig) => {
      gig.skills.forEach((skill) => {
        skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
      });
    });

    // Sort by frequency
    const trendingSkills = Object.entries(skillFrequency)
      .map(([skill, count]) => ({
        skill,
        count,
        demand: count > 10 ? "High" : count > 5 ? "Medium" : "Low",
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    res.json({
      success: true,
      data: {
        trendingSkills,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching trending skills" });
  }
};
