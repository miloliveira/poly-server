// Express
const express = require("express");
const router = express.Router();
// Authentication
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// Models
const User = require("../models/User.model");
const Post = require("../models/Post.model");
const Comment = require("../models/Comment.model");
const Share = require("../models/Share.model");
// Middleware
const { isAuthenticated } = require("../middleware/jwt.middleware");
// Setting the number of salt rounds for bcrypt password hashing
const saltRounds = 10;

// GET/in/:userId - Get user details by ID
router.get("/in/:userId", async (req, res, next) => {
  try {
    // Extract userId from request parameters
    const { userId } = req.params;
    // Find user by ID
    const user = await User.findById(userId);
    // Populate user details with related data
    await user.populate({
      path: "posts",
      populate: [
        { path: "user", select: "name imageUrl" },
        {
          path: "comments",
          populate: { path: "user", select: "name imageUrl" },
        },
      ],
    });
    await user.populate({
      path: "likedPosts",
      populate: [
        { path: "user", select: "name imageUrl" },
        {
          path: "comments",
          populate: { path: "user", select: "name imageUrl" },
        },
      ],
    });
    await user.populate({ path: "followers", select: "name imageUrl" });
    await user.populate({ path: "following", select: "name imageUrl" });
    // Create an object with selected user details
    const objectUser = {
      id: userId,
      username: user.username,
      name: user.name,
      posts: user.posts,
      likedPosts: user.likedPosts,
      education: user.education,
      occupation: user.occupation,
      about: user.about,
      location: user.location,
      imageUrl: user.imageUrl,
      followers: user.followers,
      following: user.following,
    };
    // Respond with the user details object
    res.status(200).json(objectUser);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// GET/check-share/:userId - Check shared posts for a user ID
router.get("/check-share/:userId", async (req, res, next) => {
  try {
    // Extract userId from request parameters
    const { userId } = req.params;
    // Find user by ID
    const user = await User.findById(userId);
    // Populate sharedPosts field in the user object
    await user.populate("sharedPosts");
    // Extract post IDs from sharedPosts
    const sharedPostIds = user.sharedPosts.map((share) => share.postId);
    // Create an object with shared post details
    const objectUser = {
      id: userId,
      shares: user.sharedPosts,
      sharedPostsIds: sharedPostIds,
    };
    // Respond with the object containing shared post details
    res.status(200).json(objectUser);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// GET/check-follow/:userId - Check following for a user ID
router.get("/check-follow/:userId", async (req, res, next) => {
  try {
    // Extract userId from request parameters
    const { userId } = req.params;
    // Find user by ID
    const user = await User.findById(userId);
    // Create an object with user's following
    const objectUser = {
      id: userId,
      following: user.following,
    };
    // Respond with the object containing user's following
    res.status(200).json(objectUser);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// GET/in/:userId/follow - Check if the current user is following another user
router.get("/in/:userId/follow", isAuthenticated, async (req, res, next) => {
  try {
    // Extract userId from request parameters
    const { userId } = req.params;
    // Extract current user ID from the payload
    const currentUser = req.payload._id;
    // Extract followUserId from request body
    const { followUserId } = req.body;
    // Check if the current user has permission to perform this task
    if (currentUser != userId) {
      return res.status(401).json({
        errorMessage: "This user does not have permition to perform this task",
      });
    }
    // Find the user with the specified userId
    const checkUser = await User.findById(userId);
    // Respond with true if the current user is following followUserId, otherwise false
    if (checkUser.following.includes(followUserId)) {
      await res.status(200).json(true);
    } else {
      await res.status(200).json(false);
    }
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// PUT/in/:userId/follow - Follow or unfollow another user
router.put("/in/:userId/follow", isAuthenticated, async (req, res, next) => {
  try {
    // Extract userId from request parameters
    const { userId } = req.params;
    // Extract current user ID from the payload
    const currentUser = req.payload._id;
    // Extract followUserId from request body
    const { followUserId } = req.body;
    // Check if the current user has permission to perform this task
    if (currentUser != userId) {
      return await res.status(401).json({
        errorMessage: "This user does not have permition to perform this task",
      });
    }
    // Find the user with the specified userId
    const checkUser = await User.findById(userId);
    // If the user is already following, unfollow; otherwise, follow
    if (checkUser.following.includes(followUserId)) {
      const thisUser = await User.findByIdAndUpdate(userId, {
        $pull: { following: followUserId },
      });

      await User.findByIdAndUpdate(
        followUserId,
        {
          $pull: { followers: userId },
        },
        { new: true }
      );
      // Respond with the updated user object
      res.status(200).json(thisUser);
    } else {
      const thisUser = await User.findByIdAndUpdate(userId, {
        $push: { following: followUserId },
      });

      await User.findByIdAndUpdate(
        followUserId,
        {
          $push: { followers: userId },
        },
        { new: true }
      );
      // Respond with the updated user object
      await res.status(200).json(thisUser);
    }
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// PUT/profile-edit/:userId - Edit user profile information
router.put("/profile-edit/:userId", isAuthenticated, async (req, res, next) => {
  try {
    // Extract userId from request parameters
    const { userId } = req.params;
    // Extract current user ID from the payload
    const currentUser = req.payload._id;
    // Extract updated user information from request body
    const { username, name, imageUrl, education, occupation, location, about } =
      await req.body;
    const thisUsernameExists = await User.findOne({ username: username });
    // Check if the current user has permission to edit this profile
    if (currentUser != userId) {
      return res.status(401).json({
        errorMessage: "This user does not have permition to edit this profile",
      });
    }
    // Check if the new username is already taken
    else if (thisUsernameExists && thisUsernameExists._id != userId) {
      res.status(400).json({
        errorMessage: "This username is already taken",
      });
    } else {
      // Update the user's profile with the new informatio
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { username, name, imageUrl, education, occupation, location, about },
        { new: true }
      );
      // Respond with the updated user object
      res.status(200).json(updatedUser);
    }
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// PUT/edit-password/:userId - Edit user password
router.put(
  "/edit-password/:userId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      // Extract userId from request parameters
      const { userId } = req.params;
      // Extract current user ID from the payload
      const currentUser = req.payload._id;
      // Extract new password from request body
      const { newPassword } = await req.body;
      // Check if the current user has permission to edit this profile
      if (currentUser != userId) {
        return res.status(401).json({
          errorMessage:
            "This user does not have permition to edit this profile",
        });
      } else {
        // Validate the new password against a regex pattern
        const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
        if (!passwordRegex.test(newPassword)) {
          return res.status(400).json({
            errorMessage:
              "Password must have at least 6 characters and contain at least one number, one lowercase and one uppercase letter.",
          });
        }
        // Generate salt and hash the new password
        const salt = bcrypt.genSaltSync(saltRounds);
        const hashedPassword = bcrypt.hashSync(newPassword, salt);
        // Update the user's password with the hashed password
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { password: hashedPassword },
          { new: true }
        );
        // Respond with the updated user object
        await res.status(200).json(updatedUser);
      }
    } catch (error) {
      next(error); // Pass the error to the error handling middleware
    }
  }
);

// DELETE/profile-delete/:userId - Delete user profile
router.delete(
  "/profile-delete/:userId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      // Extract userId from request parameters
      const { userId } = req.params;
      // Extract current user ID from the payload
      const currentUser = req.payload._id;
      // Check if the current user has permission to perform this task
      if (currentUser != userId) {
        return await res.status(401).json({
          errorMessage:
            "This user does not have permition to perform this task",
        });
      }
      // Find the user and populate the posts
      const user = await User.findById(userId);
      const userToDeleteComment = await User.findById(userId).populate("posts");
      // Extract posts  and delete comments associated with each post
      const postsToDeleteComments = await userToDeleteComment.posts;
      for (i = 0; i < postsToDeleteComments.length; i++) {
        await Comment.findByIdAndDelete(postsToDeleteComments[i].comments);
      }

      // Extract and delete each user's posts
      const posts = await user.posts;
      for (i = 0; i < posts.length; i++) {
        await Post.findByIdAndDelete(posts[i]);
      }
      // Delete the user
      const deletedUser = await User.findByIdAndDelete(userId);
      // Respond with the deleted user object
      await res.status(200).json(deletedUser);
    } catch (error) {
      next(error); // Pass the error to the error handling middleware
    }
  }
);

// GET/in/:userId/shareActivity - Get user's complete share activity
router.get("/in/:userId/shareActivity", async (req, res, next) => {
  try {
    // Extract userId from request parameters
    const { userId } = req.params;
    // Find shares associated with the user
    const sharesArray = await Share.find({ userId: userId });

    let userShareActivity = [];
    // Populate post details for each share
    for (let i = 0; i < sharesArray.length; i++) {
      let response = await Post.findById(sharesArray[i].postId)
        .populate({ path: "user", select: "name imageUrl" })
        .populate({
          path: "comments",
          populate: { path: "user", select: "name imageUrl" },
        })
        .populate({
          path: "shares",
          populate: { path: "userId", select: "_id name" },
          match: { userId: userId }, // Match the userId in shares
        });

      if (!userShareActivity.includes(response)) {
        userShareActivity.push(response);
      }
    }
    // Remove duplicates from userShareActivity array
    let newArr = await userShareActivity.map(JSON.stringify);
    let uniqueArr = new Set(newArr);
    let resArr = Array.from(uniqueArr, JSON.parse);
    // Respond with the unique share activity array
    res.status(200).json(resArr);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// GET/in/:userId/shareActivity/:qty - Get user's share activity with quantity limit
router.get("/in/:userId/shareActivity/:qty", async (req, res, next) => {
  try {
    // Extract userId and qty from request parameters
    const { userId, qty } = req.params;

    // Find shares associated with the user, limit by qty, and sort by createdAt
    const sharesArray = await Share.find({ userId: userId })
      .limit(qty)
      .sort({ createdAt: -1 });

    let userShareActivity = [];
    // Populate post details for each share
    for (let i = 0; i < sharesArray.length; i++) {
      let response = await Post.findById(sharesArray[i].postId)
        .populate({ path: "user", select: "name imageUrl" })
        .populate({
          path: "comments",
          populate: { path: "user", select: "name imageUrl" },
        })
        .populate({
          path: "shares",
          populate: { path: "userId", select: "_id name" },

          match: { userId: userId }, // Match the userId in shares
        });
      if (!userShareActivity.includes(response)) {
        userShareActivity.push(response);
      }
    }
    // Remove duplicates from userShareActivity array
    let newArr = await userShareActivity.map(JSON.stringify);
    let uniqueArr = new Set(newArr);
    let resArr = Array.from(uniqueArr, JSON.parse);
    // Respond with the unique share activity array
    res.status(200).json(resArr);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// GET/in/:userId/postActivity - Get user's complete post activity
router.get("/in/:userId/postActivity", async (req, res, next) => {
  try {
    // Extract userId from request parameters
    const { userId } = req.params;
    // Find posts associated with the user, populate user and comments, and sort by createdAt
    const userPostsActivity = await Post.find({ user: userId })
      .populate({ path: "user", select: "name imageUrl" })
      .populate({
        path: "comments",
        populate: { path: "user", select: "name imageUrl" },
      })
      .sort({
        createdAt: -1,
      });
    // Respond with the user's post activity
    res.status(200).json(userPostsActivity);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// GET/in/:userId/postActivity/:qty - Get user's post activity with quantity limit
router.get("/in/:userId/postActivity/:qty", async (req, res, next) => {
  try {
    // Extract userId and qty from request parameters
    const { userId, qty } = req.params;
    // Find posts associated with the user, populate user and comments, sort by createdAt, and limit by qty
    const userPostsActivity = await Post.find({ user: userId })
      .populate({ path: "user", select: "name imageUrl" })
      .populate({
        path: "comments",
        populate: { path: "user", select: "name imageUrl" },
      })
      .sort({ createdAt: -1 })
      .limit(qty);
    // Respond with the user's post activity limited by qty
    res.status(200).json(userPostsActivity);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// GET/in/:userId/likeActivity - Get user's complete like activity
router.get("/in/:userId/likeActivity", async (req, res, next) => {
  try {
    // Extract userId from request parameters
    const { userId } = req.params;
    // Find posts liked by the user, populate user and comments, and sort by createdAt
    const userLikeActivity = await Post.find({ likes: userId })
      .populate({ path: "user", select: "name imageUrl" })
      .populate({
        path: "comments",
        populate: { path: "user", select: "name imageUrl" },
      })
      .sort({
        createdAt: -1,
      });
    // Respond with the user's like activity
    await res.status(200).json(userLikeActivity);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// GET/in/:userId/likeActivity/:qty - Get user's like activity with quantity limit
router.get("/in/:userId/likeActivity/:qty", async (req, res, next) => {
  try {
    // Extract userId and qty from request parameters
    const { userId, qty } = req.params;
    // Find posts liked by the user, populate user and comments, sort by createdAt, and limit by qty
    const userLikeActivity = await Post.find({ likes: userId })
      .populate({ path: "user", select: "name imageUrl" })
      .populate({
        path: "comments",
        populate: { path: "user", select: "name imageUrl" },
      })
      .sort({ createdAt: -1 })
      .limit(qty);
    // Respond with the user's like activity limited by qty
    res.status(200).json(userLikeActivity);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// GET/in/:userId/commentActivity - Get user's complete comment activity
router.get("/in/:userId/commentActivity", async (req, res, next) => {
  try {
    // Extract userId from request parameters
    const { userId } = req.params;
    // Find all comments by the user, sort by createdAt
    const allComments = await Comment.find({ user: userId }).sort({
      createdAt: -1,
    });

    // Populate post details for each comment
    let commentsArray = [];
    for (let i = 0; i < allComments.length; i++) {
      let response = await Post.findById(allComments[i].post)
        .populate({ path: "user", select: "name imageUrl" })
        .populate({
          path: "comments",
          populate: { path: "user", select: "name imageUrl" },
        });

      if (!commentsArray.includes(response)) {
        commentsArray.push(response);
      }
    }
    // Remove duplicates from commentsArray
    let newArr = await commentsArray.map(JSON.stringify);
    let uniqueArr = new Set(newArr);
    let resArr = Array.from(uniqueArr, JSON.parse);
    // Respond with the user's comment activity
    res.status(200).json(resArr);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// GET/in/:userId/commentActivity/:qty - Get user's comment activity with quantity limit
router.get("/in/:userId/commentActivity/:qty", async (req, res, next) => {
  try {
    // Extract userId and qty from request parameters
    const { userId, qty } = req.params;
    // Find all comments by the user, limit by qty, and sort by createdAt
    const allComments = await Comment.find({ user: userId })
      .limit(qty)
      .sort({ createdAt: -1 });

    // Populate post details for each comment
    let commentsArray = [];
    for (let i = 0; i < allComments.length; i++) {
      let response = await Post.findById(allComments[i].post)
        .populate({ path: "user", select: "name imageUrl" })
        .populate({
          path: "comments",
          populate: { path: "user", select: "name imageUrl" },
        });

      if (!commentsArray.includes(response)) {
        commentsArray.push(response);
      }
    }
    // Remove duplicates from commentsArray
    let newArr = await commentsArray.map(JSON.stringify);
    let uniqueArr = new Set(newArr);
    let resArr = Array.from(uniqueArr, JSON.parse);
    // Respond with the user's comment activity limited by qty
    res.status(200).json(resArr);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

module.exports = router;
