// Express
const express = require("express");
const router = express.Router();
// Models
const Post = require("../models/Post.model");
const User = require("../models/User.model");
const Comment = require("../models/Comment.model");
const Share = require("../models/Share.model");
// Middleware
const { isAuthenticated } = require("../middleware/jwt.middleware");
const fileUploader = require("../config/cloudinary");

// GET/posts - Get all posts, including user, comments, and shares
router.get("/posts", async (req, res, next) => {
  try {
    // Find all posts, populate user, comments, and shares, and sort by createdAt
    const allPosts = await Post.find({})
      .populate({ path: "user", select: "name imageUrl" })
      .populate({
        path: "comments",
        populate: { path: "user", select: "name imageUrl" },
      })
      .populate("shares")
      .sort({
        createdAt: -1,
      });
    // Respond with all posts
    res.status(200).json(allPosts);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// GET/post/:postId - Get a single post by ID
router.get("/post/:postId", (req, res, next) => {
  try {
    // Extract postId from request parameters
    const { postId } = req.params;
    // Find the post by ID, populate user, and respond with the post
    Post.findById(postId)
      .populate("user")
      .then((post) => {
        res.status(200).json(post);
      });
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// POST/create-post/:userId - Create a new post
router.post("/create-post/:userId", isAuthenticated, async (req, res, next) => {
  try {
    // Extract userId from request parameters
    const { userId } = req.params;
    // Extract content and imageUrl from request body
    const { content, imageUrl } = req.body;
    // Extract current user ID from the payload
    const currentUser = req.payload._id;
    let image;
    // Check if the current user has permission to create a post for the specified user
    if (currentUser != userId) {
      return res.status(400).json({
        errorMessage: "This user does not have permition to perform this task",
      });
    }
    // Check if content is provided
    if (!content) {
      return res
        .status(400)
        .json({ errorMessage: "Please provide the post content" });
    }
    // Find the user to associate the post with
    const thisUser = await User.findById(userId);
    // Create and save the new post
    const createdPost = await Post.create({
      user: userId,
      content: content,
      imageUrl,
    });
    const savedPost = await createdPost.save();
    // Associate the post with the user's posts
    await thisUser.posts.push(createdPost);
    await thisUser.save();
    // Respond with the savedPost
    res.status(201).json(savedPost);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// PUT/post-update/:postId - Update a post by ID
router.put("/post-update/:postId", isAuthenticated, async (req, res, next) => {
  try {
    // Extract postId from request parameters
    const { postId } = req.params;
    // Extract current user ID from the payload
    const currentUser = req.payload._id;
    // Extract content and imageUrl from request body
    const { content, imageUrl } = req.body;
    let updatedPost;
    //Find post by ID
    const thisPost = await Post.findById(postId);
    // Check if the current user has permission to update the post
    if (currentUser != thisPost.user) {
      return res.status(400).json({
        errorMessage: "This user does not have permition to perform this task",
      });
    } else {
      // Check if content is provided
      if (!content) {
        return res
          .status(400)
          .json({ errorMessage: "Please provide the post content" });
      }
      // Update the post
      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { content, imageUrl },
        { new: true }
      );
      // Respond with updatedPost
      res.status(200).json(updatedPost);
    }
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});
// PUT/post-like/:postId - Handle liking a specific post
router.put("/post-like/:postId", isAuthenticated, async (req, res, next) => {
  try {
    // Extract postId from request parameters
    const { postId } = req.params;
    // Extract current user ID from the payload
    const currentUser = req.payload._id;
    // Check if the user has already liked the post
    const checkUser = await User.findById(currentUser);
    if (checkUser.likedPosts.includes(postId)) {
      return res
        .status(400)
        .json({ errorMessage: "You liked this game before" });
    }
    // Update user's liked posts and post's likes
    const thisUser = await User.findByIdAndUpdate(currentUser, {
      $push: { likedPosts: postId },
    });
    await Post.findByIdAndUpdate(postId, { $push: { likes: currentUser } });
    // Respond with thisUser
    res.status(200).json(thisUser);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// PUT/post-dislike/:postId - Handle disliking a specific post
router.put("/post-dislike/:postId", isAuthenticated, async (req, res, next) => {
  try {
    // Extract postId from request parameters
    const { postId } = req.params;
    // Extract current user ID from the payload
    const currentUser = req.payload._id;
    // Update user's liked posts and post's likes
    const thisUser = await User.findByIdAndUpdate(
      currentUser,
      {
        $pull: { likedPosts: postId },
      },
      { new: true }
    );
    // Find post by ID and update likes
    await Post.findByIdAndUpdate(postId, { $pull: { likes: currentUser } });
    // Respond with thisUser
    res.status(200).json(thisUser);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// DELETE/post-delete/:postId - delete a specific post
router.delete(
  "/post-delete/:postId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      // Extract postId from request parameters
      const { postId } = req.params;
      // Extract current user ID from the payload
      const currentUser = req.payload._id;
      // Find post by ID
      const thisPost = await Post.findById(postId);
      // Check if the current user has permission to delete the post
      if (thisPost.user != currentUser) {
        return res.status(400).json({
          errorMessage:
            "This user does not have permition to perform this task",
        });
      }
      // Update user's posts
      await User.findByIdAndUpdate(currentUser, {
        $pull: { posts: postId },
      });

      // Remove the post from all users' likedPosts
      const allUsers = await User.find({});
      for (let i = 0; i < allUsers.length; i++) {
        await User.findByIdAndUpdate(allUsers[i], {
          $pull: { likedPosts: postId },
        });
      }

      // Delete the comments associated with the post
      const commentsToDelete = await thisPost.comments;
      for (let i = 0; i < commentsToDelete.length; i++) {
        await Comment.findByIdAndDelete(commentsToDelete[i]);
      }

      // Delete the post and respond with deletedPost
      const deletedPost = await Post.findByIdAndDelete(postId);
      res.status(200).json(deletedPost);
    } catch (error) {
      next(error); // Pass the error to the error handling middleware
    }
  }
);
// POST/share-post/:postId - Share a specific post
router.post("/share-post/:postId", isAuthenticated, async (req, res, next) => {
  try {
    // Extract userId from request parameters
    const { postId } = req.params;
    // Extract current user ID from the payload
    const currentUser = req.payload._id;
    // Extract followUserId from request body
    const { userId, content } = req.body;
    // Find all existing shares
    const allShares = await Share.find({});
    // Check if the current user has permission to share the post
    if (currentUser !== userId) {
      return res.status(400).json({
        errorMessage: "This user does not have permition to perform this task.",
      });
    }
    // Check if the post has already been shared by the user
    for (let i = 0; i < allShares.length; i++) {
      if (allShares[i].postId == postId && allShares[i].userId == userId) {
        return res
          .status(400)
          .json({ errorMessage: "This post has already been shared." });
      }
    }
    // Create a new share and update post and user
    const newShare = await Share.create({ postId, userId, content });
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $push: { shares: newShare._id } },
      { new: true }
    );
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $push: { sharedPosts: newShare._id } },
      { new: true }
    );
    // Respond with newShare
    res.status(200).json(newShare);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});
// DELETE/delete-share/:shareId - Delete a specific share
router.delete(
  "/delete-share/:shareId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      // Extract shareId from request parameters
      const { shareId } = req.params;
      // Extract current user ID from the payload
      const currentUser = req.payload._id;
      // Extract userId and postId from request body
      const { userId, postId } = req.body;
      // Check if the current user has permission to delete the share
      if (currentUser !== userId) {
        return res.status(400).json({
          errorMessage:
            "This user does not have permition to perform this task.",
        });
      }
      // Find the user and post associated with the share
      const user = await User.findById(userId);
      const post = await Post.findById(postId);
      // Check if the share is associated with the user and post
      if (user.sharedPosts.includes(shareId) && post.shares.includes(shareId)) {
        // Remove share from user and post
        await user.sharedPosts.pull(shareId);
        const updatedUser = await user.save();
        await post.shares.pull(shareId);
        const updatedPost = await post.save();
        // Delete the share and respond with shareToDelete
        const shareToDelete = await Share.findByIdAndDelete(shareId);
        return res.status(200).json(shareToDelete);
      } else {
        return res
          .status(400)
          .json({ errorMessage: "This action cannot be completed" });
      }
    } catch (error) {
      next(error); // Pass the error to the error handling middleware
    }
  }
);
module.exports = router;
