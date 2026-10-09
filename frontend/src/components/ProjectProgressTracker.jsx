import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * ProjectProgressTracker - Track project milestones and deliverables
 * Shows overall completion, logs, and deliverables
 */
export function ProjectProgressTracker({ projectId }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [newLog, setNewLog] = useState({ description: '', percentageCompleted: 0 });
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:5000/api/progress/${projectId}`
        );
        setProject(response.data.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch project');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const handleAddLog = async () => {
    if (!newLog.description) {
      alert('Please enter a description');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        `http://localhost:5000/api/progress/${projectId}/add-log`,
        newLog,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Refresh project data
      const response = await axios.get(`http://localhost:5000/api/progress/${projectId}`);
      setProject(response.data.data);
      setNewLog({ description: '', percentageCompleted: 0 });
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add progress log');
    } finally {
      setSubmitting(false);
    }
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

  if (!project) {
    return <div className="text-gray-500">Project not found</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{project.gig?.title || 'Project'}</h2>
            <p className="text-gray-600 mt-1">
              Status: <span className="font-semibold capitalize">{project.status}</span>
            </p>
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50"
          >
            <option>not-started</option>
            <option>in-progress</option>
            <option>on-hold</option>
            <option>completed</option>
          </select>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="p-6 border-b border-gray-200">
        <p className="text-gray-600 mb-2">Overall Completion</p>
        <div className="relative">
          <div className="flex items-center">
            <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-full flex items-center justify-center transition-all duration-500"
                style={{ width: `${project.overallCompletion}%` }}
              >
                {project.overallCompletion > 10 && (
                  <span className="text-white font-bold text-sm">
                    {project.overallCompletion}%
                  </span>
                )}
              </div>
            </div>
            <span className="ml-4 font-bold text-gray-900 text-xl">
              {project.overallCompletion}%
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['overview', 'milestones', 'logs', 'deliverables', 'issues'].map((tab) => (
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

      {/* Tab Content */}
      <div className="p-6">
        {/* Milestones Tab */}
        {activeTab === 'milestones' && (
          <div className="space-y-4">
            {project.milestones && project.milestones.length > 0 ? (
              project.milestones.map((milestone, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      milestone.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {milestone.status}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="font-semibold text-gray-900">{milestone.completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${milestone.completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {milestone.targetDate && (
                    <p className="text-sm text-gray-600 mt-3">
                      Target: {new Date(milestone.targetDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No milestones set</p>
            )}
          </div>
        )}

        {/* Progress Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            {/* Add New Log */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Add Progress Update</h3>
              <textarea
                value={newLog.description}
                onChange={(e) => setNewLog({ ...newLog, description: e.target.value })}
                placeholder="Describe what you've completed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                rows="3"
              />
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Completion %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newLog.percentageCompleted}
                    onChange={(e) => setNewLog({ ...newLog, percentageCompleted: parseInt(e.target.value) })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
                <button
                  onClick={handleAddLog}
                  disabled={submitting}
                  className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submitting ? 'Saving...' : 'Add Update'}
                </button>
              </div>
            </div>

            {/* Logs List */}
            <div className="space-y-3">
              {project.progressLogs && project.progressLogs.length > 0 ? (
                project.progressLogs.map((log, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-gray-900">{log.description}</p>
                      <span className="text-sm text-gray-600">
                        {new Date(log.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">Completion:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${log.percentageCompleted}%` }}
                        ></div>
                      </div>
                      <span className="font-semibold text-gray-900">{log.percentageCompleted}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No progress logs yet</p>
              )}
            </div>
          </div>
        )}

        {/* Deliverables Tab */}
        {activeTab === 'deliverables' && (
          <div className="space-y-3">
            {project.deliverables && project.deliverables.length > 0 ? (
              project.deliverables.map((deliverable, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{deliverable.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      deliverable.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : deliverable.status === 'submitted'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {deliverable.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{deliverable.description}</p>
                  {deliverable.url && (
                    <a href={deliverable.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                      View Deliverable →
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No deliverables yet</p>
            )}
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <div className="space-y-3">
            {project.issues && project.issues.length > 0 ? (
              project.issues.map((issue, idx) => (
                <div key={idx} className={`border-l-4 rounded-lg p-4 ${
                  issue.severity === 'high'
                    ? 'border-l-red-500 bg-red-50'
                    : issue.severity === 'medium'
                    ? 'border-l-yellow-500 bg-yellow-50'
                    : 'border-l-green-500 bg-green-50'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{issue.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded capitalize font-semibold ${
                      issue.severity === 'high'
                        ? 'bg-red-200 text-red-800'
                        : issue.severity === 'medium'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-green-200 text-green-800'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm">{issue.description}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No issues reported</p>
            )}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-gray-600 mb-2">Start Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(project.projectStartDate).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-gray-600 mb-2">Deadline</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(project.projectDeadline).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-gray-600 mb-2">Milestones</p>
              <p className="text-lg font-semibold text-gray-900">
                {project.milestones?.length || 0} Total
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-gray-600 mb-2">Issues</p>
              <p className="text-lg font-semibold text-gray-900">
                {project.issues?.length || 0} Open
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectProgressTracker;
