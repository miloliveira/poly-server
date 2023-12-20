// Dependencies
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary with API credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    // Define allowed formats and folder for uploaded images
    allowed_formats: ["jpg", "img", "jpeg", "gif", "png"],
    // Specify the folder in which uploaded images will be stored on Cloudinary
    folder: "appcrud",
  },
});

// Export multer middleware with Cloudinary storage
module.exports = multer({ storage });
