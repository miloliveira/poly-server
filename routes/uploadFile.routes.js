const express = require("express");
const router = express.Router();
const User = require("../models/User.model");
const Post = require("../models/Post.model");
const Comment = require("../models/Comment.model");
const { isAuthenticated } = require("../middleware/jwt.middleware");

const fileUploader = require("../config/cloudinary");

router.post("/upload", fileUploader.single("imageUrl"), (req, res, next) => {
  if (!req.file) {
    next(new Error("No file uploaded"));
    return;
  }
  res.json({ fileUrl: req.file.path });
});

module.exports = router;
