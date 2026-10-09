const ProjectProgress = require('../models/ProjectProgress');
const { createNotification } = require('../controllers/notificationController');

/**
 * Send deadline reminders for projects whose deadline is within reminderWindowHours
 * and haven't had a reminder sent yet.
 */
const sendDeadlineRemindersTask = async (opts = {}) => {
  const reminderWindowHours = Number(process.env.DEADLINE_REMINDER_WINDOW_HOURS || 48); // default 48 hours
  const now = new Date();
  const windowEnd = new Date(now.getTime() + reminderWindowHours * 60 * 60 * 1000);

  try {
    const projects = await ProjectProgress.find({
      projectDeadline: { $exists: true, $lte: windowEnd, $gte: now },
      deadlineReminderSent: false,
      status: { $nin: ['completed','cancelled'] }
    }).populate('client freelancer', 'fullName email');

    for (const proj of projects) {
      const title = `Upcoming deadline for project ${proj._id}`;
      const message = `Project deadline is on ${proj.projectDeadline.toISOString()}. Please review progress and deliverables.`;

      try {
        if (proj.client) {
          await createNotification({ recipient: proj.client._id, type: 'deadline_reminder', title, message, sendEmail: true, metadata: { projectId: proj._id.toString() } });
        }
        if (proj.freelancer) {
          await createNotification({ recipient: proj.freelancer._id, type: 'deadline_reminder', title, message, sendEmail: true, metadata: { projectId: proj._id.toString() } });
        }
      } catch (notifyErr) {
        console.warn('Failed to send deadline notification for project', proj._id, notifyErr.message);
      }

      proj.deadlineReminderSent = true; // mark as sent to avoid repeats
      await proj.save();
    }

    return { success: true, processed: projects.length };
  } catch (err) {
    console.error('Deadline reminders task failed:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = sendDeadlineRemindersTask;
