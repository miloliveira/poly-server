// Express
const express = require("express");
const router = express.Router();

// Default route, responds with a message
router.get("/", (req, res, next) => {
  res.json("All good in here");
});

module.exports = router;
