const request = require('supertest');
const createApp = require('../app');

// Mock cloudinary to avoid network calls in tests
jest.mock('cloudinary', () => ({
  v2: {
    config: () => ({}),
    uploader: {
      upload_stream: (options, cb) => {
        // simulate immediate successful upload
        setImmediate(() => cb(null, { secure_url: 'http://example.com/fake-upload', public_id: 'fake_id' }));
        // return a writable stream-like object
        const stream = require('stream').Writable();
        stream._write = (chunk, enc, next) => next();
        return stream;
      },
    },
  },
}));
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Gig = require('../models/Gig');
const Proposal = require('../models/Proposal');
const ProjectProgress = require('../models/ProjectProgress');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const generateToken = require('../utils/generateToken');
const sendDeadlineRemindersTask = require('../jobs/deadlineReminders');

let app;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  await connectDB();
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (connectDB.__mongod) await connectDB.__mongod.stop();
});

describe('Project progress tracker - uploads and reminders', () => {
  test('file upload attaches to progress log and returns URL', async () => {
    // create users
    const freelancer = await User.create({ fullName: 'FL', email: 'fl@example.com', password: 'pass', role: 'freelancer' });
    const client = await User.create({ fullName: 'CL', email: 'cl@example.com', password: 'pass', role: 'client' });

    // mark users verified so login works in tests
    await User.findByIdAndUpdate(freelancer._id, { isVerified: true });
    await User.findByIdAndUpdate(client._id, { isVerified: true });
    // ensure passwords are bcrypt-hashed (login expects hashed password)
    const hashed = await bcrypt.hash('pass', 10);
    await User.findByIdAndUpdate(freelancer._id, { password: hashed });
    await User.findByIdAndUpdate(client._id, { password: hashed });

    // create gig
    const gig = await Gig.create({ title: 'Test Gig', description: 'desc', budget: 100, client: client._id, geoLocation: { type: 'Point', coordinates: [0, 0] } });

    // create proposal
    const proposal = await Proposal.create({ gig: gig._id, freelancer: freelancer._id, client: client._id, proposalText: 'ok', bidAmount: 100, status: 'accepted' });

    // create project progress
    const progress = await ProjectProgress.create({ gig: gig._id, proposal: proposal._id, freelancer: freelancer._id, client: client._id, milestones: [], status: 'in-progress' });

    // login to obtain a real token (ensures auth middleware populates req.user correctly)
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'fl@example.com', password: 'pass' });
    expect(loginRes.statusCode).toBe(200);
    const token = loginRes.body.token;
    expect(token).toBeTruthy();

    const res = await request(app)
      .post(`/api/progress/${progress._id}/upload`)
      .set('Authorization', `Bearer ${token}`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('hello world'), 'test.txt');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.file).toBeDefined();
    expect(res.body.file.url).toBeDefined();

    const updated = await ProjectProgress.findById(progress._id);
    expect(updated.progressLogs.length).toBeGreaterThan(0);
    const latest = updated.progressLogs[updated.progressLogs.length - 1];
    expect(latest.filesUploaded && latest.filesUploaded.length).toBeGreaterThan(0);
  }, 20000);

  test('deadline reminders task marks reminders sent and creates notifications', async () => {
    // create users and project
    const freelancer = await User.create({ fullName: 'Rem FL', email: 'remfl@example.com', password: 'pass', role: 'freelancer' });
    const client = await User.create({ fullName: 'Rem CL', email: 'remcl@example.com', password: 'pass', role: 'client' });

    const gig = await Gig.create({ title: 'Reminder Gig', description: 'desc', budget: 200, client: client._id, geoLocation: { type: 'Point', coordinates: [0, 0] } });
    const proposal = await Proposal.create({ gig: gig._id, freelancer: freelancer._id, client: client._id, proposalText: 'ok', bidAmount: 200, status: 'accepted' });

    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const progress = await ProjectProgress.create({ gig: gig._id, proposal: proposal._id, freelancer: freelancer._id, client: client._id, projectDeadline: deadline, deadlineReminderSent: false, status: 'in-progress' });

    const result = await sendDeadlineRemindersTask();
    expect(result.success).toBe(true);
    expect(result.processed).toBeGreaterThanOrEqual(1);

    const updated = await ProjectProgress.findById(progress._id);
    expect(updated.deadlineReminderSent).toBe(true);

    const clientNotifs = await Notification.find({ recipient: client._id, type: 'deadline_reminder' });
    const flNotifs = await Notification.find({ recipient: freelancer._id, type: 'deadline_reminder' });
    expect(clientNotifs.length).toBeGreaterThanOrEqual(1);
    expect(flNotifs.length).toBeGreaterThanOrEqual(1);
  });

  test('completing milestone releases escrow payment', async () => {
    // Setup users
    const freelancer = await User.create({ fullName: 'MS FL', email: 'msfl@example.com', password: 'pass', role: 'freelancer' });
    const client = await User.create({ fullName: 'MS CL', email: 'mscl@example.com', password: 'pass', role: 'client' });

    // ensure users are verified for login
    await User.findByIdAndUpdate(freelancer._id, { isVerified: true });
    await User.findByIdAndUpdate(client._id, { isVerified: true });
    // ensure passwords are bcrypt-hashed (login expects hashed password)
    const hashed2 = await bcrypt.hash('pass', 10);
    await User.findByIdAndUpdate(freelancer._id, { password: hashed2 });
    await User.findByIdAndUpdate(client._id, { password: hashed2 });

    // create gig with milestone
    const gig = await Gig.create({ title: 'Milestone Gig', description: 'desc', budget: 300, client: client._id, geoLocation: { type: 'Point', coordinates: [0, 0] }, milestones: [{ title: 'M1', paymentAmount: 75, dueDate: new Date(Date.now() + 2*24*60*60*1000) }] });

    // create proposal accepted
    const proposal = await Proposal.create({ gig: gig._id, freelancer: freelancer._id, client: client._id, proposalText: 'ok', bidAmount: 300, status: 'accepted' });

    // create project progress
    const progress = await ProjectProgress.create({ gig: gig._id, proposal: proposal._id, freelancer: freelancer._id, client: client._id, milestones: gig.milestones, status: 'in-progress' });

    // create a held payment for milestone
    const payment = await Payment.create({ user: client._id, gig: gig._id, amount: 75, currency: 'USD', provider: 'escrow', status: 'paid', escrowStatus: 'held', relatedMilestoneId: progress._id });

    // login as client to get token for authenticated client actions
    const loginResClient = await request(app).post('/api/auth/login').send({ email: 'mscl@example.com', password: 'pass' });
    expect(loginResClient.statusCode).toBe(200);
    const token = loginResClient.body.token;
    expect(token).toBeTruthy();

    const res = await request(app)
      .post(`/api/progress/${gig._id}/complete-milestone`)
      .set('Authorization', `Bearer ${token}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ milestoneIndex: 0 });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedPayment = await Payment.findById(payment._id);
    expect(updatedPayment.escrowStatus).toBe('released');

    const updatedProgress = await ProjectProgress.findById(progress._id);
    expect(updatedProgress.milestones[0].status).toBe('completed');
  });
});
