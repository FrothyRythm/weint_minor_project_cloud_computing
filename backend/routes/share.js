// Express router for creating and resolving file sharing links
const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, shareController.createShare);
router.get('/:token', shareController.resolveShare);

module.exports = router;
