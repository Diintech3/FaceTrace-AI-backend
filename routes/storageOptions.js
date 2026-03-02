// Alternative: Memory Storage (Image disk pe save nahi hogi)
// Agar ye use karna hai to searchRoutes.js mein replace karo

const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Memory storage - image RAM mein rahegi, disk pe nahi
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({ storage: memoryStorage });

// Ya phir disk storage with auto-delete (current implementation)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadDisk = multer({ storage: diskStorage });

// Memory storage use karne ke liye:
// router.post('/search/image', uploadMemory.single('image'), searchController.searchByImage);

// Disk storage use karne ke liye (current):
// router.post('/search/image', uploadDisk.single('image'), searchController.searchByImage);
