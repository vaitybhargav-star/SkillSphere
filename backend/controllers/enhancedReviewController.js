/**
 * Enhanced Review Controller with Fraud Detection
 */

const Review = require("../models/Review");
const User = require("../models/User");
const Gig = require("../models/Gig");
const Proposal = require("../models/Proposal");
const Payment = require("../models/Payment");

/**
 * Calculate fraud confidence score
 * Returns 0-1 confidence that review is fraudulent
 */
function calculateFraudScore(reviewData, reviewerData, revieweeData, allReviews) {
  let fraudScore = 0;
  const fraudReasons = [];

  // Check 1: Suspicious timing (review within 5 minutes of transaction)
  if (reviewData.timeSinceTransaction && reviewData.timeSinceTransaction < 5) {
    fraudScore += 0.2;
    fraudReasons.push("suspicious_timing");
  }

  // Check 2: Reviewer has no history with platform (new user giving 5-star review)
  if (!reviewerData || reviewerData.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
    if (reviewData.rating >= 4) {
      fraudScore += 0.15;
      fraudReasons.push("new_reviewer_high_rating");
    }
  }

  // Check 3: Pattern matching (identical or very similar reviews)
  const similarReviews = allReviews.filter(
    (r) =>
      r.comment &&
      reviewData.comment &&
      r._id.toString() !== reviewData._id.toString() &&
      levenshteinDistance(r.comment, reviewData.comment) < 10
  );

  if (similarReviews.length > 0) {
    fraudScore += 0.25;
    fraudReasons.push("identical_to_other_review");
  }

  // Check 4: All ratings are suspiciously consistent (all 5 stars from same reviewer)
  const reviewerReviews = allReviews.filter(
    (r) => r.reviewer.toString() === reviewData.reviewer.toString()
  );

  if (reviewerReviews.length > 2 && reviewerReviews.every((r) => r.rating === 5)) {
    fraudScore += 0.15;
    fraudReasons.push("all_5_star_reviews");
  }

  // Check 5: Reviewer and reviewee from same location/IP (potential fake)
  if (reviewerData && revieweeData && reviewerData.location === revieweeData.location) {
    fraudScore += 0.1;
    fraudReasons.push("same_location");
  }

  // Check 6: Review comment too generic or too short for 5-star
  if (reviewData.rating === 5 && reviewData.comment && reviewData.comment.length < 20) {
    fraudScore += 0.1;
    fraudReasons.push("generic_comment");
  }

  return {
    score: Math.min(fraudScore, 1),
    reasons: fraudReasons,
  };
}

/**
 * Simple string distance algorithm (Levenshtein distance)
 */
function levenshteinDistance(str1, str2) {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  return track[str2.length][str1.length];
}

/**
 * POST /api/reviews
 * Create a new review with fraud detection
 */
exports.createReview = async (req, res) => {
  try {
    const {
      gigId,
      proposalId,
      revieweeId,
      rating,
      qualityRating,
      communicationRating,
      deadlineRating,
      professionalismRating,
      comment,
    } = req.body;

    // Validate input
    if (!revieweeId || !rating) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Check if user can review (must have completed transaction)
    if (gigId) {
      const gig = await Gig.findById(gigId);
      if (gig.client.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: "Unauthorized to review this gig" });
      }
    }

    // Create review
    const newReview = new Review({
      gig: gigId,
      proposal: proposalId,
      reviewer: req.user.id,
      reviewee: revieweeId,
      rating,
      qualityRating: qualityRating || rating,
      communicationRating: communicationRating || rating,
      deadlineRating: deadlineRating || rating,
      professionalismRating: professionalismRating || rating,
      comment,
      transactionVerified: !!gigId || !!proposalId,
    });

    // Run fraud detection
    const allReviews = await Review.find();
    const reviewer = await User.findById(req.user.id);
    const reviewee = await User.findById(revieweeId);

    const fraudAnalysis = calculateFraudScore(
      newReview.toObject(),
      reviewer,
      reviewee,
      allReviews
    );

    newReview.fraudConfidence = fraudAnalysis.score;
    newReview.fraudReasons = fraudAnalysis.reasons;

    // Flag if fraud confidence > 0.6
    if (fraudAnalysis.score > 0.6) {
      newReview.flaggedAsFraud = true;
    }

    // Auto-verify review if transaction is verified and not flagged as fraud
    if (newReview.transactionVerified && !newReview.flaggedAsFraud) {
      newReview.verified = true;
    }

    await newReview.save();

    // Update reviewer's reputation based on review quality
    if (reviewer) {
      await updateReviewerReputation(reviewer._id, newReview);
    }

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: newReview,
      fraudCheck: {
        flagged: newReview.flaggedAsFraud,
        confidence: fraudAnalysis.score,
        reasons: fraudAnalysis.reasons,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error creating review" });
  }
};

/**
 * GET /api/reviews/:userId
 * Get all reviews for a user with analytics
 */
exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all reviews for user
    const reviews = await Review.find({ reviewee: userId })
      .populate("reviewer", "fullName profileImage")
      .sort({ createdAt: -1 });

    if (reviews.length === 0) {
      return res.json({
        success: true,
        data: {
          userId,
          reviews: [],
          analytics: {
            totalReviews: 0,
            averageRating: 0,
            distribution: {},
            weightedScore: 0,
            flaggedReviewsCount: 0,
          },
        },
      });
    }

    // Filter out fraudulent reviews for analytics
    const verifiedReviews = reviews.filter((r) => !r.flaggedAsFraud);

    // Calculate analytics
    const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2);
    const avgQuality = (
      verifiedReviews.reduce((sum, r) => sum + (r.qualityRating || r.rating), 0) /
      (verifiedReviews.length || 1)
    ).toFixed(2);

    // Calculate weighted score (considering review weight and fraud detection)
    const weightedScore = (
      verifiedReviews.reduce((sum, r) => sum + r.rating * (r.reviewWeight || 1), 0) /
      (verifiedReviews.reduce((sum, r) => sum + (r.reviewWeight || 1), 0) || 1)
    ).toFixed(2);

    // Rating distribution
    const distribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    res.json({
      success: true,
      data: {
        userId,
        reviews: verifiedReviews,
        flaggedReviews: reviews.filter((r) => r.flaggedAsFraud),
        analytics: {
          totalReviews: reviews.length,
          verifiedReviews: verifiedReviews.length,
          flaggedReviewsCount: reviews.filter((r) => r.flaggedAsFraud).length,
          averageRating: avgRating,
          averageQualityRating: avgQuality,
          weightedScore,
          distribution,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching reviews" });
  }
};

/**
 * POST /api/reviews/:reviewId/report
 * Report a review as inappropriate
 */
exports.reportReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { reportedAsInappropriate: true },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.json({
      success: true,
      message: "Review reported successfully",
      data: review,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error reporting review" });
  }
};

/**
 * PUT /api/reviews/:reviewId/helpful
 * Mark review as helpful or unhelpful
 */
exports.markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { helpful } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (helpful) {
      review.helpfulVotes += 1;
    } else {
      review.unhelpfulVotes += 1;
    }

    await review.save();

    res.json({
      success: true,
      message: "Vote recorded",
      data: review,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error voting on review" });
  }
};

/**
 * GET /api/reviews/analytics/reputation/:userId
 * Get comprehensive reputation analytics for a user
 */
exports.getReputationAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ reviewee: userId }).populate("reviewer");

    if (reviews.length === 0) {
      return res.json({
        success: true,
        data: {
          userId,
          reputationScore: 0,
          trustLevel: "New",
          reviews: 0,
        },
      });
    }

    const verifiedReviews = reviews.filter((r) => !r.flaggedAsFraud);
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

    // Calculate reputation tier
    let trustLevel = "New";
    if (reviews.length >= 10 && avgRating >= 4.5) trustLevel = "Top Rated";
    else if (reviews.length >= 5 && avgRating >= 4) trustLevel = "Excellent";
    else if (reviews.length >= 3 && avgRating >= 3.5) trustLevel = "Good";

    // Weighted reputation score
    const reputationScore = Math.round(
      (avgRating * reviews.length + 50) / (reviews.length + 10) * 10
    ) / 10;

    res.json({
      success: true,
      data: {
        userId,
        reputationScore,
        trustLevel,
        reviewsCount: reviews.length,
        verifiedReviewsCount: verifiedReviews.length,
        averageRating: avgRating.toFixed(2),
        recentReviews: verifiedReviews.slice(0, 5),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching reputation analytics" });
  }
};

/**
 * POST /api/reviews/analytics/detailed/:userId
 * Get detailed multi-dimensional analytics for a freelancer
 */
exports.getDetailedAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ reviewee: userId }).populate("reviewer");
    const verifiedReviews = reviews.filter((r) => !r.flaggedAsFraud);

    if (reviews.length === 0) {
      return res.json({
        success: true,
        data: {
          userId,
          totalReviews: 0,
          analyticsDetails: {
            overallRating: { average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
            qualityRating: { average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
            communicationRating: { average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
            deadlineRating: { average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
            professionalismRating: { average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
            helpfulnessRatio: 0,
            fraudStatus: { totalFlagged: 0, flaggedPercentage: 0 },
          },
        },
      });
    }

    // Helper function to calculate distribution
    const getDistribution = (reviews, fieldName) => {
      return {
        1: reviews.filter((r) => r[fieldName] === 1).length,
        2: reviews.filter((r) => r[fieldName] === 2).length,
        3: reviews.filter((r) => r[fieldName] === 3).length,
        4: reviews.filter((r) => r[fieldName] === 4).length,
        5: reviews.filter((r) => r[fieldName] === 5).length,
      };
    };

    // Helper function to calculate average
    const getAverage = (reviews, fieldName) => {
      if (reviews.length === 0) return 0;
      const sum = reviews.reduce((acc, r) => acc + (r[fieldName] || 0), 0);
      return (sum / reviews.length).toFixed(2);
    };

    // Calculate helpfulness ratio
    const totalVotes = verifiedReviews.reduce((sum, r) => sum + r.helpfulVotes + r.unhelpfulVotes, 0);
    const helpfulnessRatio = totalVotes > 0 
      ? (verifiedReviews.reduce((sum, r) => sum + r.helpfulVotes, 0) / totalVotes * 100).toFixed(2)
      : 0;

    // Fraud statistics
    const flaggedCount = reviews.filter((r) => r.flaggedAsFraud).length;
    const fraudPercentage = ((flaggedCount / reviews.length) * 100).toFixed(2);

    res.json({
      success: true,
      data: {
        userId,
        totalReviews: reviews.length,
        verifiedReviews: verifiedReviews.length,
        analyticsDetails: {
          overallRating: {
            average: getAverage(verifiedReviews, "rating"),
            distribution: getDistribution(verifiedReviews, "rating"),
          },
          qualityRating: {
            average: getAverage(verifiedReviews, "qualityRating"),
            distribution: getDistribution(verifiedReviews, "qualityRating"),
          },
          communicationRating: {
            average: getAverage(verifiedReviews, "communicationRating"),
            distribution: getDistribution(verifiedReviews, "communicationRating"),
          },
          deadlineRating: {
            average: getAverage(verifiedReviews, "deadlineRating"),
            distribution: getDistribution(verifiedReviews, "deadlineRating"),
          },
          professionalismRating: {
            average: getAverage(verifiedReviews, "professionalismRating"),
            distribution: getDistribution(verifiedReviews, "professionalismRating"),
          },
          helpfulnessRatio: parseFloat(helpfulnessRatio),
          fraudStatus: {
            totalFlagged: flaggedCount,
            flaggedPercentage: parseFloat(fraudPercentage),
          },
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching detailed analytics" });
  }
};

/**
 * Helper: Update reviewer reputation based on review quality
 * Improves reviewer credibility when they leave detailed, helpful reviews
 */
async function updateReviewerReputation(reviewerId, review) {
  try {
    const reviewer = await User.findById(reviewerId);
    if (!reviewer) return;

    // Calculate review quality score (0-1)
    let qualityScore = 0;
    if (review.comment && review.comment.length > 100) qualityScore += 0.3; // Detailed review
    if (review.qualityRating && review.communicationRating && review.deadlineRating) qualityScore += 0.3; // Multi-dimensional
    if (!review.flaggedAsFraud) qualityScore += 0.4; // Not fraudulent

    // Update reviewer's credibility
    if (!reviewer.reviewerStats) {
      reviewer.reviewerStats = {
        totalReviewsGiven: 0,
        averageReviewQuality: 0,
        credibilityScore: 0.5, // Start at 0.5
      };
    }

    reviewer.reviewerStats.totalReviewsGiven += 1;
    // Gradually improve credibility based on review quality
    reviewer.reviewerStats.credibilityScore = Math.min(
      1,
      (reviewer.reviewerStats.credibilityScore + qualityScore) / 2
    );
    reviewer.reviewerStats.averageReviewQuality = (
      (reviewer.reviewerStats.averageReviewQuality * (reviewer.reviewerStats.totalReviewsGiven - 1) + qualityScore) /
      reviewer.reviewerStats.totalReviewsGiven
    ).toFixed(2);

    await reviewer.save();
  } catch (error) {
    console.error("Error updating reviewer reputation:", error);
  }
}

/**
 * GET /api/reviews/reputation/badge/:userId
 * Get reputation badge tier for a user
 */
exports.getReputationBadge = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ reviewee: userId });
    const verifiedReviews = reviews.filter((r) => !r.flaggedAsFraud);

    if (reviews.length === 0) {
      return res.json({
        success: true,
        data: {
          userId,
          badge: "NEW",
          color: "#999999",
          description: "New to the platform",
          requiredReviews: 3,
          requiredRating: 3.5,
        },
      });
    }

    const avgRating = verifiedReviews.length > 0
      ? verifiedReviews.reduce((sum, r) => sum + r.rating, 0) / verifiedReviews.length
      : 0;

    let badge = "NEW";
    let color = "#999999";
    let description = "New to the platform";

    if (verifiedReviews.length >= 50 && avgRating >= 4.8) {
      badge = "PLATINUM";
      color = "#E5E4E2";
      description = "Elite performer with exceptional service";
    } else if (verifiedReviews.length >= 25 && avgRating >= 4.7) {
      badge = "GOLD";
      color = "#FFD700";
      description = "Outstanding performer";
    } else if (verifiedReviews.length >= 10 && avgRating >= 4.5) {
      badge = "SILVER";
      color = "#C0C0C0";
      description = "Trusted and reliable";
    } else if (verifiedReviews.length >= 5 && avgRating >= 4.0) {
      badge = "BRONZE";
      color = "#CD7F32";
      description = "Good performer";
    } else if (verifiedReviews.length >= 3 && avgRating >= 3.5) {
      badge = "ESTABLISHED";
      color = "#4169E1";
      description = "Established member";
    }

    res.json({
      success: true,
      data: {
        userId,
        badge,
        color,
        description,
        stats: {
          reviews: verifiedReviews.length,
          averageRating: avgRating.toFixed(2),
          nextBadgeRequires: getNextBadgeRequirements(verifiedReviews.length, avgRating),
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching reputation badge" });
  }
};

/**
 * Helper: Calculate what's needed for next badge
 */
function getNextBadgeRequirements(reviewCount, avgRating) {
  if (reviewCount < 3) {
    return { reviews: 3 - reviewCount, rating: 3.5 };
  } else if (reviewCount < 5) {
    return { reviews: 5 - reviewCount, rating: 4.0 };
  } else if (reviewCount < 10) {
    return { reviews: 10 - reviewCount, rating: 4.5 };
  } else if (reviewCount < 25) {
    return { reviews: 25 - reviewCount, rating: 4.7 };
  } else if (reviewCount < 50) {
    return { reviews: 50 - reviewCount, rating: 4.8 };
  }
  return { reviews: 0, rating: 0 };
}
