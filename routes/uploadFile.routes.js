// Express
const express = require("express");
const router = express.Router();
// Models
const User = require("../models/User.model");
const Post = require("../models/Post.model");
const Comment = require("../models/Comment.model");
// Middleware
const { isAuthenticated } = require("../middleware/jwt.middleware");
// File uploader configuration
const fileUploader = require("../config/cloudinary");

// POST/upload - handle file upload
router.post("/upload", fileUploader.single("imageUrl"), (req, res, next) => {
  // Check if a file is uploaded
  if (!req.file) {
    next(new Error("No file uploaded"));
    return;
  }
  // Respond with the file URL
  res.json({ fileUrl: req.file.path });
});

module.exports = router;
