const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

const resumeUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only PDF, DOC, DOCX or TXT files are allowed'));
    }
    cb(null, true);
  }
});

const attachmentUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

const uploadHandler = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    // If cloudinary configured, upload there
    if (cloudinary.config().api_key) {
      const streamifier = require('streamifier');
      const streamUpload = (buffer) => {
        return new Promise((resolve, reject) => {
          const options = {
            folder: 'skillsphere/profile-images',
            transformation: [
              { width: 800, height: 800, crop: 'limit' },
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ],
            resource_type: 'image',
            use_filename: true,
            unique_filename: true,
          };

          const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (result) resolve(result);
            else reject(error);
          });
          streamifier.createReadStream(buffer).pipe(stream);
        });
      };

      const result = await streamUpload(req.file.buffer);
      // Return secure URL and public_id so frontend/backend can manage or delete later
      return res.status(200).json({ success: true, url: result.secure_url, public_id: result.public_id });
    }

    // Fallback: save locally
    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    const outPath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(outPath, req.file.buffer);

    const url = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${filename}`;
    return res.status(200).json({ success: true, url });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const resumeUploadHandler = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    if (cloudinary.config().api_key) {
      const streamifier = require('streamifier');
      const streamUpload = (buffer) => {
        return new Promise((resolve, reject) => {
          const options = {
            folder: 'skillsphere/resumes',
            resource_type: 'raw',
            use_filename: true,
            unique_filename: true,
          };

          const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (result) resolve(result);
            else reject(error);
          });
          streamifier.createReadStream(buffer).pipe(stream);
        });
      };

      const result = await streamUpload(req.file.buffer);
      return res.status(200).json({ success: true, url: result.secure_url, public_id: result.public_id });
    }

    const ext = path.extname(req.file.originalname) || '.pdf';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    const outPath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(outPath, req.file.buffer);

    const url = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${filename}`;
    return res.status(200).json({ success: true, url });
  } catch (err) {
    console.error('Resume upload error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const attachmentUploadHandler = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    if (cloudinary.config().api_key) {
      const streamifier = require('streamifier');
      const streamUpload = (buffer) => {
        return new Promise((resolve, reject) => {
          const options = {
            folder: 'skillsphere/attachments',
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true,
          };

          const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (result) resolve(result);
            else reject(error);
          });
          streamifier.createReadStream(buffer).pipe(stream);
        });
      };

      const result = await streamUpload(req.file.buffer);
      return res.status(200).json({
        success: true,
        url: result.secure_url,
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
      });
    }

    const ext = path.extname(req.file.originalname) || path.extname(req.file.originalname) || '';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    const outPath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(outPath, req.file.buffer);

    const url = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${filename}`;
    return res.status(200).json({
      success: true,
      url,
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err) {
    console.error('Attachment upload error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const signUpload = (req, res) => {
  try {
    // Debug log to help trace client sign requests (avoid logging secrets)
    const userId = req.user && (req.user.id || req.user._id) ? (req.user.id || req.user._id) : 'unauthenticated';
    const folder = req.query.folder || 'skillsphere/profile-images';
    console.log(`[uploadsController] signUpload requested by user=${userId}, folder=${folder}`);

    if (!cloudinary.config().api_key) return res.status(500).json({ success: false, message: 'Cloudinary not configured' });

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = {
      folder,
      timestamp,
      use_filename: true,
      unique_filename: true,
    };

    // Use Cloudinary helper to create signature
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

    return res.status(200).json({ success: true, signature, timestamp, api_key: process.env.CLOUDINARY_API_KEY, cloud_name: process.env.CLOUDINARY_CLOUD_NAME, folder });
  } catch (err) {
    console.error('Sign upload error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  upload,
  resumeUpload,
  attachmentUpload,
  uploadHandler,
  resumeUploadHandler,
  attachmentUploadHandler,
  signUpload,
};