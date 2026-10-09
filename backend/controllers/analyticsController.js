/**
 * Freelancer Analytics Dashboard Controller
 * Provides comprehensive analytics for freelancers
 */

const User = require("../models/User");
const FreelancerProfile = require("../models/FreelancerProfile");
const Gig = require("../models/Gig");
const Proposal = require("../models/Proposal");
const Review = require("../models/Review");
const Payment = require("../models/Payment");
const ProjectProgress = require("../models/ProjectProgress");

/**
 * GET /api/analytics/freelancer/:freelancerId/overview
 * Get freelancer dashboard overview
 */
exports.getFreelancerOverview = async (req, res) => {
  try {
    const { freelancerId } = req.params;

    const user = await User.findById(freelancerId);
    if (!user || user.role !== "freelancer") {
      return res.status(404).json({ success: false, message: "Freelancer not found" });
    }

    // Get profile
    const profile = await FreelancerProfile.findOne({ user: freelancerId });

    // Get proposals
    const proposals = await Proposal.find({ freelancer: freelancerId });
    const acceptedProposals = proposals.filter((p) => p.status === "accepted");

    // Get projects
    const projects = await ProjectProgress.find({ freelancer: freelancerId });
    const completedProjects = projects.filter((p) => p.status === "completed");

    // Get reviews
    const reviews = await Review.find({ reviewee: freelancerId });
    const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2) : 0;

    // Get payments
    const payments = await Payment.find({ freelancer: freelancerId, status: "paid" });
    const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);

    // Get profile views (placeholder - would need tracking)
    const profileViews = Math.floor(Math.random() * 100) + 10; // Mock data

    res.json({
      success: true,
      data: {
        freelancerId,
        freelancerName: user.fullName,
        profileImage: user.profileImage,
        profileTitle: profile?.title || "",
        profileCompletion: calculateProfileCompletion(profile),

        // Stats
        stats: {
          profileViews,
          totalProposals: proposals.length,
          acceptedProposals: acceptedProposals.length,
          totalProjects: projects.length,
          completedProjects: completedProjects.length,
          totalReviews: reviews.length,
          averageRating: parseFloat(avgRating),
          totalEarnings: totalEarnings.toFixed(2),
        },

        // Success rates
        successRates: {
          proposalAcceptanceRate: proposals.length > 0 ? ((acceptedProposals.length / proposals.length) * 100).toFixed(1) : 0,
          projectCompletionRate: projects.length > 0 ? ((completedProjects.length / projects.length) * 100).toFixed(1) : 0,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching overview" });
  }
};

/**
 * GET /api/analytics/freelancer/:freelancerId/earnings
 * Get detailed earnings analytics
 */
exports.getEarningsAnalytics = async (req, res) => {
  try {
    const { freelancerId } = req.params;
    const { period = "monthly" } = req.query; // monthly, yearly

    const payments = await Payment.find({
      freelancer: freelancerId,
      status: "paid",
    }).sort({ createdAt: -1 });

    // Group earnings by month/year
    const earningsData = {};

    payments.forEach((payment) => {
      const date = new Date(payment.createdAt);
      const key = period === "monthly" ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : date.getFullYear().toString();

      if (!earningsData[key]) {
        earningsData[key] = { period: key, amount: 0, transactionCount: 0 };
      }

      earningsData[key].amount += payment.amount;
      earningsData[key].transactionCount += 1;
    });

    const earningsTimeline = Object.values(earningsData).sort((a, b) => a.period.localeCompare(b.period));

    // Calculate statistics
    const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);
    const avgTransactionAmount = payments.length > 0 ? (totalEarnings / payments.length).toFixed(2) : 0;
    const highestEarningMonth = earningsTimeline.length > 0 ? earningsTimeline.reduce((max, e) => (e.amount > max.amount ? e : max)) : null;

    res.json({
      success: true,
      data: {
        freelancerId,
        totalEarnings: totalEarnings.toFixed(2),
        totalTransactions: payments.length,
        averageTransactionAmount: parseFloat(avgTransactionAmount),
        highestEarningPeriod: highestEarningMonth,
        earningsTimeline,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching earnings" });
  }
};

/**
 * GET /api/analytics/freelancer/:freelancerId/proposals
 * Get proposal analytics
 */
exports.getProposalAnalytics = async (req, res) => {
  try {
    const { freelancerId } = req.params;

    const proposals = await Proposal.find({ freelancer: freelancerId }).populate("gig", "title category");

    const stats = {
      total: proposals.length,
      pending: proposals.filter((p) => p.status === "pending").length,
      accepted: proposals.filter((p) => p.status === "accepted").length,
      rejected: proposals.filter((p) => p.status === "rejected").length,
    };

    const acceptanceRate = stats.total > 0 ? ((stats.accepted / stats.total) * 100).toFixed(1) : 0;

    // Group by category
    const byCategory = {};
    proposals.forEach((p) => {
      const category = p.gig?.category || "Unknown";
      if (!byCategory[category]) {
        byCategory[category] = { category, count: 0, accepted: 0 };
      }
      byCategory[category].count += 1;
      if (p.status === "accepted") {
        byCategory[category].accepted += 1;
      }
    });

    res.json({
      success: true,
      data: {
        freelancerId,
        stats,
        acceptanceRate: parseFloat(acceptanceRate),
        byCategory: Object.values(byCategory),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching proposal analytics" });
  }
};

/**
 * GET /api/analytics/freelancer/:freelancerId/reviews
 * Get client feedback analytics
 */
exports.getReviewAnalytics = async (req, res) => {
  try {
    const { freelancerId } = req.params;

    const reviews = await Review.find({ reviewee: freelancerId })
      .populate("reviewer", "fullName")
      .sort({ createdAt: -1 });

    if (reviews.length === 0) {
      return res.json({
        success: true,
        data: {
          freelancerId,
          reviews: [],
          analytics: {
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: {},
          },
        },
      });
    }

    // Calculate stats
    const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2);
    const avgQuality = (
      reviews.reduce((sum, r) => sum + (r.qualityRating || r.rating), 0) / reviews.length
    ).toFixed(2);

    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    // Recent reviews
    const recentReviews = reviews.slice(0, 5);

    res.json({
      success: true,
      data: {
        freelancerId,
        analytics: {
          totalReviews: reviews.length,
          averageRating: parseFloat(avgRating),
          averageQualityRating: parseFloat(avgQuality),
          ratingDistribution,
          percentagePositive: ((ratingDistribution[5] + ratingDistribution[4]) / reviews.length * 100).toFixed(1),
        },
        recentReviews,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching review analytics" });
  }
};

/**
 * GET /api/analytics/freelancer/:freelancerId/projects
 * Get project completion analytics
 */
exports.getProjectAnalytics = async (req, res) => {
  try {
    const { freelancerId } = req.params;

    const projects = await ProjectProgress.find({ freelancer: freelancerId }).populate("gig", "title");

    const stats = {
      total: projects.length,
      notStarted: projects.filter((p) => p.status === "not-started").length,
      inProgress: projects.filter((p) => p.status === "in-progress").length,
      onHold: projects.filter((p) => p.status === "on-hold").length,
      completed: projects.filter((p) => p.status === "completed").length,
      cancelled: projects.filter((p) => p.status === "cancelled").length,
    };

    // Calculate average completion time
    const completedProjects = projects.filter((p) => p.status === "completed");
    let avgCompletionTime = 0;

    if (completedProjects.length > 0) {
      const totalTime = completedProjects.reduce((sum, p) => {
        const start = new Date(p.projectStartDate);
        const end = new Date(p.updatedAt);
        return sum + (end - start);
      }, 0);

      avgCompletionTime = Math.round(totalTime / completedProjects.length / (1000 * 60 * 60 * 24)); // days
    }

    res.json({
      success: true,
      data: {
        freelancerId,
        stats,
        completionRate: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0,
        averageCompletionTime: `${avgCompletionTime} days`,
        recentProjects: projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching project analytics" });
  }
};

/**
 * Helper function to calculate profile completion percentage
 */
function calculateProfileCompletion(profile) {
  if (!profile) return 0;

  let completed = 0;
  let total = 10;

  if (profile.title) completed++;
  if (profile.bio) completed++;
  if (profile.skills && profile.skills.length > 0) completed++;
  if (profile.languages && profile.languages.length > 0) completed++;
  if (profile.education && profile.education.length > 0) completed++;
  if (profile.workExperience && profile.workExperience.length > 0) completed++;
  if (profile.hourlyRate) completed++;
  if (profile.milestoneRate) completed++;
  if (profile.experience) completed++;

  return Math.round((completed / total) * 100);
}

/**
 * GET /api/analytics/freelancer/:freelancerId/full-dashboard
 * Get complete dashboard with all analytics
 */
exports.getFullDashboard = async (req, res) => {
  try {
    const { freelancerId } = req.params;

    // Get all analytics in parallel
    const [overview, earnings, proposals, reviews, projects] = await Promise.all([
      exports.getFreelancerOverview({ params: { freelancerId } }, res),
      exports.getEarningsAnalytics({ params: { freelancerId }, query: { period: "monthly" } }, res),
      exports.getProposalAnalytics({ params: { freelancerId } }, res),
      exports.getReviewAnalytics({ params: { freelancerId } }, res),
      exports.getProjectAnalytics({ params: { freelancerId } }, res),
    ].map((p) => p.catch((err) => console.error(err))));

    // Combine results
    res.json({
      success: true,
      data: {
        freelancerId,
        dashboard: {
          overview: overview?.data || {},
          earnings: earnings?.data || {},
          proposals: proposals?.data || {},
          reviews: reviews?.data || {},
          projects: projects?.data || {},
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching full dashboard" });
  }
};
