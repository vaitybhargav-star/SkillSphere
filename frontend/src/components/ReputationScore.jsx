import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * ReputationScore - Display user reputation with trust level
 * Shows weighted reputation score and reviews
 */
export function ReputationScore({ userId }) {
  const [reputation, setReputation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchReputation = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:5000/api/reviews/analytics/reputation/${userId}`
        );
        setReputation(response.data.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch reputation');
      } finally {
        setLoading(false);
      }
    };

    fetchReputation();
  }, [userId]);

  const getTrustLevelColor = (level) => {
    switch (level) {
      case 'Top Rated':
        return 'from-green-400 to-emerald-600';
      case 'Excellent':
        return 'from-blue-400 to-blue-600';
      case 'Good':
        return 'from-yellow-400 to-yellow-600';
      case 'New':
        return 'from-gray-400 to-gray-600';
      default:
        return 'from-gray-300 to-gray-500';
    }
  };

  const getTrustLevelBadgeColor = (level) => {
    switch (level) {
      case 'Top Rated':
        return 'bg-green-100 text-green-800';
      case 'Excellent':
        return 'bg-blue-100 text-blue-800';
      case 'Good':
        return 'bg-yellow-100 text-yellow-800';
      case 'New':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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

  if (!reputation) {
    return <div className="text-gray-500">No reputation data available</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header with Trust Level */}
      <div className={`bg-gradient-to-r ${getTrustLevelColor(reputation.trustLevel)} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-90">Trust Level</p>
            <h2 className="text-3xl font-bold">{reputation.trustLevel}</h2>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium opacity-90">Reputation Score</p>
            <p className="text-4xl font-bold">{reputation.reputationScore.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-600 text-sm mb-1">Average Rating</p>
            <p className="text-2xl font-bold text-yellow-500">⭐ {reputation.averageRating.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Total Reviews</p>
            <p className="text-2xl font-bold text-blue-600">{reputation.reviewsCount}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm mb-1">Verified Reviews</p>
            <p className="text-2xl font-bold text-green-600">{reputation.verifiedReviewsCount}</p>
          </div>
        </div>
      </div>

      {/* Recent Reviews */}
      {reputation.recentReviews && reputation.recentReviews.length > 0 && (
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Reviews</h3>
          <div className="space-y-3">
            {reputation.recentReviews.map((review, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {Array(review.rating)
                        .fill(0)
                        .map((_, i) => (
                          <span key={i}>⭐</span>
                        ))}
                    </p>
                    {review.reviewer && (
                      <p className="text-sm text-gray-600 mt-1">by {review.reviewer.fullName}</p>
                    )}
                  </div>
                  {review.verified && (
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-semibold">
                      ✓ Verified
                    </span>
                  )}
                </div>
                {review.comment && (
                  <p className="text-gray-700 text-sm">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust Info */}
      <div className="p-6 bg-blue-50 border-t border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-2">What This Means</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>
            {reputation.trustLevel === 'Top Rated' &&
              '🏆 This user is consistently rated 5-star by clients'}
          </li>
          <li>
            {reputation.trustLevel === 'Excellent' &&
              '✨ This user has excellent ratings and client feedback'}
          </li>
          <li>
            {reputation.trustLevel === 'Good' &&
              '👍 This user has good ratings and positive client feedback'}
          </li>
          <li>
            {reputation.trustLevel === 'New' &&
              '👤 This user is new and building their reputation'}
          </li>
        </ul>
      </div>
    </div>
  );
}

export default ReputationScore;
