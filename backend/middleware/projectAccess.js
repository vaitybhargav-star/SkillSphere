const ProjectProgress = require('../models/ProjectProgress');

/**
 * Ensure the authenticated user is a participant (client or freelancer) of the project.
 * Looks for params: projectId, gigId, or proposalId in body.
 */
const ensureProjectParticipant = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    const { projectId, gigId } = req.params;
    let project = null;

    if (projectId) {
      project = await ProjectProgress.findById(projectId);
    } else if (gigId) {
      project = await ProjectProgress.findOne({ gig: gigId });
    } else if (req.body && req.body.proposalId) {
      project = await ProjectProgress.findOne({ proposal: req.body.proposalId });
    }

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isClient = project.client && project.client.toString() === userId.toString();
    const isFreelancer = project.freelancer && project.freelancer.toString() === userId.toString();

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ success: false, message: 'Forbidden: not participating in this project' });
    }

    // attach project to request for downstream handlers
    req.project = project;
    next();
  } catch (err) {
    console.error('Project access middleware error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { ensureProjectParticipant };