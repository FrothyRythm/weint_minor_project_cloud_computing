// Express router for file upload, metadata management, and S3 URLs
const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', fileController.listFiles);
router.post('/upload-url', fileController.getUploadUrl);
router.post('/confirm-upload', fileController.confirmUpload);
router.get('/download-url/:id', fileController.getDownloadUrl);
router.delete('/:id', fileController.deleteFile);
router.get('/usage', fileController.getUsage);

module.exports = router;
