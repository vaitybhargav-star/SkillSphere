import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * RecommendedFreelancers - AI-powered freelancer recommendations for a gig
 * Shows top matching freelancers with skill scores and ratings
 */
export function RecommendedFreelancers({ gigId, onInvite }) {
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    if (!gigId) return;

    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/matching/recommend/${gigId}?limit=${limit}`);
        setFreelancers(response.data.data.recommendedFreelancers || []);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch recommendations');
        setFreelancers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [gigId, limit]);

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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Recommended Freelancers</h2>
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

      {freelancers.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No freelancers found matching your gig</p>
      ) : (
        <div className="space-y-4">
          {freelancers.map((freelancer) => (
            <div
              key={freelancer.freelancerId}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {freelancer.profileImage && (
                      <img
                        src={freelancer.profileImage}
                        alt={freelancer.name}
                        className="w-12 h-12 rounded-full mr-3 object-cover"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{freelancer.name}</h3>
                      <p className="text-sm text-gray-600">{freelancer.title}</p>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(freelancer.skills) && freelancer.skills.slice(0, 5).map((skill, idx) => {
                        const label = typeof skill === 'string' ? skill : skill.name || skill;
                        const level = typeof skill === 'object' ? skill.level || '' : '';
                        return (
                          <span
                            key={idx}
                            className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                          >
                            {label}{level ? ` (${level})` : ''}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Hourly Rate:</span>
                      <p className="font-semibold text-gray-900">${freelancer.hourlyRate}/hr</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Experience:</span>
                      <p className="font-semibold text-gray-900">{freelancer.experience} yrs</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Rating:</span>
                      <p className="font-semibold text-yellow-500">⭐ {freelancer.rating}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Reviews:</span>
                      <p className="font-semibold text-gray-900">{freelancer.reviewCount}</p>
                    </div>
                  </div>
                </div>

                {/* Match Score Card */}
                <div className="ml-6 text-right">
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                    <p className="text-gray-600 text-sm mb-2">Match Score</p>
                    <p className="text-4xl font-bold text-green-600">{freelancer.matchScore}%</p>
                    <div className="mt-4 space-y-1 text-xs">
                      <p className="text-gray-600">Skill: <span className="font-semibold text-gray-900">{freelancer.skillMatch}%</span></p>
                      <p className="text-gray-600">Rating: <span className="font-semibold text-gray-900">{parseFloat(freelancer.breakdown.ratingScore).toFixed(1)}%</span></p>
                      <p className="text-gray-600">Exp: <span className="font-semibold text-gray-900">{parseFloat(freelancer.breakdown.experienceScore).toFixed(1)}%</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 flex justify-end gap-2">
                {freelancer.hasApplied ? (
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-medium cursor-not-allowed"
                  >
                    Already Applied
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onInvite?.(freelancer.freelancerId)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${onInvite ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-600 text-white cursor-not-allowed opacity-60'}`}
                    disabled={!onInvite}
                  >
                    Invite to Bid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecommendedFreelancers;
