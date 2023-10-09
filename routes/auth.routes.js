const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const User = require("../models/User.model");

const { isAuthenticated } = require("../middleware/jwt.middleware.js");

const saltRounds = 10;

router.post("/signup", (req, res, next) => {
  const { username, password, name, email } = req.body;

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

  // This regular expression check that the email is of a valid format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ errorMessage: "Provide a valid email address." });
    return;
  }

  const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
  if (!passwordRegex.test(password)) {
    res.status(400).json({
      errorMessage:
        "Password must have at least 6 characters and contain at least one number, one lowercase and one uppercase letter.",
    });
    return;
  }

  User.findOne({
    $or: [{ username: username }, { email: email }],
  })
    .then((foundUser) => {
      if (foundUser) {
        res.status(400).json({ errorMessage: "User already exists." });
        return;
      }
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashedPassword = bcrypt.hashSync(password, salt);
      return User.create({ username, password: hashedPassword, name, email });
    })
    .then((createdUser) => {
      // Deconstruct the newly created user object to omit the password
      // We should never expose passwords publicly
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
    .catch((err) => next(err)); // In this case, we send error handling to the error handling middleware.
});

// POST  /auth/login - Verifies email and password and returns a JWT
router.post("/login", (req, res, next) => {
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
    .catch((err) => next(err)); // In this case, we send error handling to the error handling middleware.
});

// GET  /auth/verify  -  Used to verify JWT stored on the client
router.get("/verify", isAuthenticated, (req, res, next) => {
  // If JWT token is valid the payload gets decoded by the
  // isAuthenticated middleware and is made available on `req.payload`
  console.log(`req.payload`, req.payload);

  // Send back the token payload object containing the user data
  res.status(200).json(req.payload);
});

router.post("/google-auth", (req, res, next) => {
  const { email, username, name, password } = req.body;

  // Check the users collection if a user with the same email exists
  User.findOne({ email: email })
    .then((foundUser) => {
      if (!foundUser) {
        User.create({ email, username, name, password })
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
    .catch((err) => console.log(err));
});

module.exports = router;
