const express = require('express');
const router = express.Router();
const socialMediaController = require('../controllers/socialMediaController');
const rateLimiter = require('../middleware/rateLimiter');

router.post('/extract-url', rateLimiter, socialMediaController.extractFromUrl);
router.post('/find-profiles', rateLimiter, socialMediaController.findAllProfiles);

module.exports = router;
