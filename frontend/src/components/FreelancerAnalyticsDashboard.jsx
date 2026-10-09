import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * FreelancerAnalyticsDashboard - Comprehensive analytics dashboard for freelancers
 * Shows earnings, proposals, reviews, and project analytics
 */
export function FreelancerAnalyticsDashboard({ freelancerId }) {
  const [overview, setOverview] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [proposals, setProposals] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [projects, setProjects] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!freelancerId) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        const [overviewRes, earningsRes, proposalsRes, reviewsRes, projectsRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/analytics/freelancer/${freelancerId}/overview`),
          axios.get(`http://localhost:5000/api/analytics/freelancer/${freelancerId}/earnings?period=monthly`),
          axios.get(`http://localhost:5000/api/analytics/freelancer/${freelancerId}/proposals`),
          axios.get(`http://localhost:5000/api/analytics/freelancer/${freelancerId}/reviews`),
          axios.get(`http://localhost:5000/api/analytics/freelancer/${freelancerId}/projects`),
        ]);

        setOverview(overviewRes.data.data);
        setEarnings(earningsRes.data.data);
        setProposals(proposalsRes.data.data);
        setReviews(reviewsRes.data.data);
        setProjects(projectsRes.data.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [freelancerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Track your performance and earnings</p>
          </div>
          {overview?.stats.averageRating && (
            <div className="text-right">
              <div className="text-4xl font-bold text-yellow-500">⭐ {overview.stats.averageRating}</div>
              <p className="text-gray-600">{overview.stats.totalReviews} reviews</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm mb-2">Profile Views</p>
            <p className="text-3xl font-bold text-blue-600">{overview.stats.profileViews}</p>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm mb-2">Completed Projects</p>
            <p className="text-3xl font-bold text-green-600">{overview.stats.completedProjects}</p>
            <p className="text-xs text-gray-500 mt-1">{overview.successRates.projectCompletionRate}% completion rate</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm mb-2">Accepted Proposals</p>
            <p className="text-3xl font-bold text-purple-600">{overview.stats.acceptedProposals}</p>
            <p className="text-xs text-gray-500 mt-1">{overview.successRates.proposalAcceptanceRate}% acceptance</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600 text-sm mb-2">Total Earnings</p>
            <p className="text-3xl font-bold text-yellow-600">${overview.stats.totalEarnings}</p>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b border-gray-200">
          {['overview', 'earnings', 'proposals', 'reviews', 'projects'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium capitalize border-b-2 transition ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Completion</h3>
                <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all"
                    style={{ width: `${overview.profileCompletion}%` }}
                  ></div>
                </div>
                <p className="mt-2 text-gray-600">{overview.profileCompletion}% complete</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-2">Total Proposals</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.stats.totalProposals}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-2">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {overview.stats.totalProjects - overview.stats.completedProjects}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Earnings Tab */}
          {activeTab === 'earnings' && earnings && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-2">Total Earnings</p>
                  <p className="text-3xl font-bold text-green-600">${earnings.totalEarnings}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-2">Transactions</p>
                  <p className="text-3xl font-bold text-blue-600">{earnings.totalTransactions}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-2">Average Transaction</p>
                  <p className="text-3xl font-bold text-purple-600">${earnings.averageTransactionAmount}</p>
                </div>
              </div>

              {earnings.highestEarningPeriod && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">🏆 Best Performing Period</h4>
                  <p className="text-gray-700">
                    <span className="font-semibold">{earnings.highestEarningPeriod.period}:</span> ${earnings.highestEarningPeriod.amount}
                  </p>
                </div>
              )}

              {/* Earnings Timeline */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Monthly Earnings</h4>
                <div className="space-y-2">
                  {earnings.earningsTimeline.map((month, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="w-32">
                        <p className="text-sm text-gray-600">{month.period}</p>
                      </div>
                      <div className="flex-1 ml-4">
                        <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-green-500 h-full flex items-center justify-end pr-2"
                            style={{
                              width: `${(month.amount / Math.max(...earnings.earningsTimeline.map((m) => m.amount))) * 100}%`,
                            }}
                          >
                            {month.amount > 500 && (
                              <span className="text-white text-xs font-semibold">${month.amount}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="w-32 text-right">
                        <p className="text-sm font-semibold text-gray-900">${month.amount}</p>
                        <p className="text-xs text-gray-600">{month.transactionCount} txns</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Proposals Tab */}
          {activeTab === 'proposals' && proposals && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Total</p>
                  <p className="text-3xl font-bold text-gray-900">{proposals.stats.total}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{proposals.stats.pending}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Accepted</p>
                  <p className="text-3xl font-bold text-green-600">{proposals.stats.accepted}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Rejected</p>
                  <p className="text-3xl font-bold text-red-600">{proposals.stats.rejected}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-600 mb-2">Acceptance Rate</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="bg-blue-200 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full flex items-center justify-center"
                        style={{ width: `${proposals.acceptanceRate}%` }}
                      >
                        <span className="text-white font-semibold text-sm">{proposals.acceptanceRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* By Category */}
              {proposals.byCategory && proposals.byCategory.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">By Category</h4>
                  <div className="space-y-2">
                    {proposals.byCategory.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-gray-700">{cat.category}</span>
                        <span className="text-sm text-gray-600">{cat.count} proposals ({cat.accepted} accepted)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && reviews && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-2">Average Rating</p>
                  <p className="text-3xl font-bold text-yellow-600">⭐ {reviews.analytics.averageRating}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-2">Total Reviews</p>
                  <p className="text-3xl font-bold text-blue-600">{reviews.analytics.totalReviews}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm mb-2">Positive</p>
                  <p className="text-3xl font-bold text-green-600">{reviews.analytics.percentagePositive}%</p>
                </div>
              </div>

              {/* Rating Distribution */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Rating Distribution</h4>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-4">
                      <span className="w-8 font-semibold text-gray-700">⭐{rating}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div
                          className="bg-yellow-500 h-full"
                          style={{
                            width: `${
                              (reviews.analytics.ratingDistribution[rating] /
                                reviews.analytics.totalReviews) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="w-12 text-right text-gray-700 font-semibold">
                        {reviews.analytics.ratingDistribution[rating]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && projects && (
            <div className="space-y-6">
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{projects.stats.total}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{projects.stats.completed}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{projects.stats.inProgress}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">On Hold</p>
                  <p className="text-2xl font-bold text-yellow-600">{projects.stats.onHold}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Cancelled</p>
                  <p className="text-2xl font-bold text-red-600">{projects.stats.cancelled}</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-green-600">{projects.completionRate}%</p>
                </div>
                <div className="bg-green-200 rounded-full h-3 overflow-hidden">
                  <div className="bg-green-600 h-full" style={{ width: `${projects.completionRate}%` }}></div>
                </div>
              </div>

              {projects.averageCompletionTime && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-gray-600 mb-2">Average Completion Time</p>
                  <p className="text-2xl font-bold text-blue-600">{projects.averageCompletionTime}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FreelancerAnalyticsDashboard;
