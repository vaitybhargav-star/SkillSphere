import React, { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * RecommendedGigs - AI-powered gig recommendations for a freelancer
 * Shows gigs matching freelancer's skills and budget preferences
 */
export function RecommendedGigs({ freelancerId }) {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    if (!freelancerId) return;

    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/matching/find-gigs/${freelancerId}?limit=${limit}`);
        setGigs(response.data.data.recommendedGigs || []);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch gig recommendations');
        setGigs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [freelancerId, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Recommended Gigs for You</h2>
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <option value={5}>Top 5</option>
          <option value={10}>Top 10</option>
          <option value={20}>Top 20</option>
        </select>
      </div>

      {gigs.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No gigs match your skills at the moment</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {gigs.map((gig) => (
            <div
              key={gig.gigId}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{gig.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{gig.category}</p>
                </div>
                <div className="text-right">
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {gig.matchScore}% Match
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-700 text-sm mb-4 line-clamp-2">{gig.description}</p>

              {/* Budget & Details */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-600">Budget:</span>
                  <p className="font-semibold text-gray-900">
                    ${gig.budget.toLocaleString()}
                    {gig.budgetType === 'hourly' && '/hr'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Deadline:</span>
                  <p className="font-semibold text-gray-900">
                    {gig.deadline ? new Date(gig.deadline).toLocaleDateString() : 'Flexible'}
                  </p>
                </div>
              </div>

              {/* Skills Required */}
              {gig.skills && gig.skills.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Required Skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {gig.skills.slice(0, 4).map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                    {gig.skills.length > 4 && (
                      <span className="inline-block text-gray-600 text-xs px-2 py-1">
                        +{gig.skills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Match Breakdown */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs">
                <p className="font-semibold text-gray-900 mb-2">Match Breakdown:</p>
                <div className="flex justify-between text-gray-700">
                  <span>Skills: {parseFloat(gig.breakdown.skillScore).toFixed(1)}%</span>
                  <span>Budget: {parseFloat(gig.breakdown.budgetMatch).toFixed(1)}%</span>
                </div>
              </div>

              {/* Action Button */}
              <button className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
                View & Submit Proposal
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecommendedGigs;
