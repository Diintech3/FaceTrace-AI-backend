const express = require('express');
const router = express.Router();
const multer = require('multer');
const searchController = require('../controllers/searchController');
const websiteController = require('../controllers/websiteController');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Routes
router.post('/search/username', searchController.searchByUsername);
router.post('/search/image', upload.single('image'), searchController.searchByImage);
router.post('/search/url', searchController.searchByUrl);
router.post('/search/images', searchController.imageSearch);
router.post('/search/news', searchController.newsSearch);
router.post('/search/phone', searchController.validatePhone);
router.post('/search/ip', searchController.lookupIP);
router.post('/search/website', websiteController.analyzeWebsite);

module.exports = router;
