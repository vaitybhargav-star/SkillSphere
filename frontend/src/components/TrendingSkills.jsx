import React, { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * TrendingSkills - Display trending skills on the platform
 * Shows demand levels and skill frequency
 */
export function TrendingSkills() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrendingSkills = async () => {
      try {
        setLoading(true);
        const response = await api.get('/matching/trending/skills');
        setSkills(response.data.data.trendingSkills || []);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch trending skills');
        setSkills([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingSkills();
  }, []);

  const getDemandColor = (demand) => {
    switch (demand) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMaxCount = () => {
    return Math.max(...skills.map((s) => s.count), 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
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

  const maxCount = getMaxCount();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Trending Skills</h2>

      {skills.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No trending skills data available</p>
      ) : (
        <div className="space-y-4">
          {skills.map((skill, index) => (
            <div key={index} className="flex items-center gap-4">
              {/* Rank */}
              <div className="flex-shrink-0 w-8">
                <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
              </div>

              {/* Skill Name */}
              <div className="w-32">
                <h3 className="font-semibold text-gray-900">{skill.skill}</h3>
              </div>

              {/* Progress Bar */}
              <div className="flex-1">
                <div className="bg-gray-200 rounded-full h-8 overflow-hidden relative">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full flex items-center justify-center transition-all duration-500 ease-out"
                    style={{
                      width: `${(skill.count / maxCount) * 100}%`,
                      minWidth: skill.count > 0 ? '40px' : '0px',
                    }}
                  >
                    <span className="text-white text-sm font-semibold">
                      {skill.count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Demand Badge */}
              <div className="w-24 text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getDemandColor(skill.demand)}`}>
                  {skill.demand} Demand
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-3 font-semibold">Demand Levels:</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-700">High Demand</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Medium Demand</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Low Demand</span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-2">💡 Insights</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Top skill: <span className="font-semibold">{skills[0]?.skill}</span> with <span className="font-semibold">{skills[0]?.count}</span> active gigs</li>
          <li>• Update your profile with trending skills to increase visibility</li>
          <li>• High demand skills command higher rates</li>
        </ul>
      </div>
    </div>
  );
}

export default TrendingSkills;
