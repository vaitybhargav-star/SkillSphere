const express = require('express');
const router = express.Router();
const { upload, resumeUpload, attachmentUpload, uploadHandler, resumeUploadHandler, attachmentUploadHandler, signUpload } = require('../controllers/uploadsController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Signed params endpoint for direct client uploads to Cloudinary
router.get('/sign', protect, signUpload);

// Allow authenticated users to upload profile images; restrict to client/freelancer if desired
router.post('/', protect, upload.single('file'), uploadHandler);

// Allow authenticated users to upload resume documents
router.post('/resume', protect, resumeUpload.single('file'), resumeUploadHandler);
router.post('/attachment', protect, attachmentUpload.single('file'), attachmentUploadHandler);

module.exports = router;
