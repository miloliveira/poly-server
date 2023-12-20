// Load environment variables/settings
require("dotenv").config();

// Connect to the database
require("./db");

// Express application setup
const express = require("express");
const app = express();

// Run middleware setup exported from the config folder
require("./config")(app);

// Routes for the main application
const indexRoutes = require("./routes/index.routes");
app.use("/api", indexRoutes);

// Authentication routes
const authRoutes = require("./routes/auth.routes");
app.use("/auth", authRoutes);

// Routes for handling posts
const postRoutes = require("./routes/posts.routes");
app.use("/", postRoutes);

// Routes for handling comments
const commentsRoutes = require("./routes/comments.routes");
app.use("/", commentsRoutes);

// Routes for user-related operations
const userRoutes = require("./routes/user.routes");
app.use("/", userRoutes);

// Routes for handling file uploads
const uploadFileRoutes = require("./routes/uploadFile.routes");
app.use("/", uploadFileRoutes);

// Include error handling
require("./error-handling")(app);

module.exports = app;
