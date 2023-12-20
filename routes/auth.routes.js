// Express
const express = require("express");
const router = express.Router();
// Authentication
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// Models
const User = require("../models/User.model");
// Middleware
const { isAuthenticated } = require("../middleware/jwt.middleware.js");
// Setting the number of salt rounds for bcrypt password hashing
const saltRounds = 10;

// POST /auth/signup - User registration
router.post("/signup", (req, res, next) => {
  // Extract from request body
  const { username, password, name, email } = req.body;
  // Validation checks for required fields
  if (!username) {
    return res.status(400).json({ errorMessage: "Please provide username" });
  }
  if (!password) {
    return res.status(400).json({ errorMessage: "Please provide password" });
  }
  if (!name) {
    return res.status(400).json({ errorMessage: "Please provide name" });
  } else if (!email) {
    return res.status(400).json({ errorMessage: "Please provide email" });
  }

  // Regular expression check for a valid email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ errorMessage: "Provide a valid email address." });
    return;
  }
  // Regular expression check for a valid password format
  const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
  if (!passwordRegex.test(password)) {
    res.status(400).json({
      errorMessage:
        "Password must have at least 6 characters and contain at least one number, one lowercase and one uppercase letter.",
    });
    return;
  }
  // Find user by username or email
  User.findOne({
    $or: [{ username: username }, { email: email }],
  })
    .then((foundUser) => {
      // Send error message if user already exists
      if (foundUser) {
        res.status(400).json({ errorMessage: "User already exists." });
        return;
      }
      // Hash password and create new user with new hashed password
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashedPassword = bcrypt.hashSync(password, salt);
      return User.create({ username, password: hashedPassword, name, email });
    })
    .then((createdUser) => {
      // Deconstruct the newly created user object to omit the password
      const { username, name, _id, email } = createdUser;

      // Create a new object that doesn't expose the password
      const user = { username, email, name, _id };

      const payload = { _id, username, email, name };

      // Create a JSON Web Token and sign it
      const authToken = jwt.sign(payload, process.env.TOKEN_SECRET, {
        algorithm: "HS256",
        expiresIn: "6h",
      });
      // Send a json response containing the user object
      res.status(200).json({ authToken: authToken });
    })
    .catch((err) => next(err)); // Pass the error to the error handling middleware
});

// POST /auth/login - User login
router.post("/login", (req, res, next) => {
  // Extract loginName and password from request body
  const { loginName, password } = req.body;

  // Check if email or password are provided as empty string
  if (loginName === "" || password === "") {
    res
      .status(400)
      .json({ errorMessage: "Provide username or email and password." });
    return;
  }

  // Check the users collection if a user with the same email exists
  User.findOne({
    $or: [{ username: loginName }, { email: loginName }],
  })
    .then((foundUser) => {
      if (!foundUser) {
        // If the user is not found, send an error response
        res.status(401).json({ errorMessage: "User not found." });
        return;
      }

      // Compare the provided password with the one saved in the database
      const passwordCorrect = bcrypt.compareSync(password, foundUser.password);

      if (passwordCorrect) {
        // Deconstruct the user object to omit the password
        const { _id, username, name, email } = foundUser;

        // Create an object that will be set as the token payload
        const payload = { _id, username, email, name };

        // Create a JSON Web Token and sign it
        const authToken = jwt.sign(payload, process.env.TOKEN_SECRET, {
          algorithm: "HS256",
          expiresIn: "6h",
        });

        // Send the token as the response
        res.status(200).json({ authToken: authToken });
      } else {
        res
          .status(401)
          .json({ errorMessage: "Unable to authenticate the user" });
      }
    })
    .catch((err) => next(err)); // Pass the error to the error handling middleware
});

// GET /auth/verify - Verify JWT stored on the client
router.get("/verify", isAuthenticated, (req, res, next) => {
  // If JWT token is valid the payload gets decoded by the
  // isAuthenticated middleware and is made available on `req.payload`
  console.log(`req.payload`, req.payload);

  // Send back the token payload object containing the user data
  res.status(200).json(req.payload);
});

// POST /auth/google-auth - Google authentication
router.post("/google-auth", (req, res, next) => {
  // Extract from request body
  const { email, username, name, password, imageUrl } = req.body;

  // Check the users collection if a user with the same email exists
  User.findOne({ email: email })
    .then((foundUser) => {
      if (!foundUser) {
        User.create({ email, username, name, password, imageUrl })
          .then((createdUser) => {
            const { _id, username, email, name } = createdUser;
            const payload = { _id, username, email, name };
            const authToken = jwt.sign(payload, process.env.TOKEN_SECRET, {
              algorithm: "HS256",
              expiresIn: "6h",
            });

            res.status(200).json({ authToken: authToken });
          })
          .catch((error) => console.log(error));
      } else {
        const { _id, username, email, name } = foundUser;
        const payload = { _id, username, email, name };
        const authToken = jwt.sign(payload, process.env.TOKEN_SECRET, {
          algorithm: "HS256",
          expiresIn: "6h",
        });

        res.status(200).json({ authToken: authToken });
      }
    })
    .catch((err) => next(err)); // Pass the error to the error handling middleware
});

module.exports = router;
