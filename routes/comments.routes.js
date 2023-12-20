// Express
const express = require("express");
const router = express.Router();
// Models
const Post = require("../models/Post.model");
const Comment = require("../models/Comment.model.js");
// Middleware
const { isAuthenticated } = require("../middleware/jwt.middleware");

// GET/comments/:postId - Retrieve comments for a specific post
router.get("/comments/:postId", async (req, res, next) => {
  try {
    // Extract postId from request parameters
    const { postId } = req.params;
    // Find comments for the specified post and populate user information
    const commentsList = await Comment.find({ post: postId }).populate({
      path: "user",
      select: "name imageUrl",
    });
    // Respond with the commentsList object
    res.status(200).json(commentsList);
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
});

// POST/create-comment/:postId - Create a new comment for a specific post
router.post(
  "/create-comment/:postId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      // Extract current user ID from the payload
      const currentUser = req.payload._id;
      // Extract postId from request parameters
      const { postId } = req.params;
      // Extract content from request body
      const { content } = req.body;
      // Check if the comment content is provided
      if (!content) {
        return res
          .status(400)
          .json({ errorMessage: "Please provide the comment content" });
      }
      // Find the post to associate the comment with
      const post = await Post.findById(postId);
      // Create a new comment and save it
      const newComment = await Comment.create({
        content: content,
        user: currentUser,
        post: postId,
      });
      const savedComment = await newComment.save();
      // Update the post with the new comment
      const pushComment = await post.comments.push(savedComment);
      const updatedPost = await post.save();
      // Respond with the updatedPost object
      res.status(201).json(updatedPost);
    } catch (error) {
      next(error); // Pass the error to the error handling middleware
    }
  }
);
// PUT/comment-update/:commentId - Update an existing comment
router.put(
  "/comment-update/:commentId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      // Extract commentId from request parameters
      const { commentId } = req.params;
      // Extract current user ID from the payload
      const currentUser = req.payload._id;
      // Extract content from request body
      const { content } = req.body;

      let updatedComment;
      // Find the comment with the specified commentId
      const thisComment = await Comment.findById(commentId);
      // Check if the current user has permission to update the comment
      if (currentUser != thisComment.user) {
        return res.status(400).json({
          errorMessage:
            "This user does not have permition to perform this task",
        });
      } else {
        // Check if the updated comment content is provided
        if (!content) {
          return res
            .status(400)
            .json({ errorMessage: "Please provide the comment content" });
        }
        // Update the comment with new content
        updatedComment = await Comment.findByIdAndUpdate(
          commentId,
          { content },
          { new: true }
        );
        // Respond with the updatedComment object
        res.status(200).json(updatedComment);
      }
    } catch (error) {
      next(error); // Pass the error to the error handling middleware
    }
  }
);

// DELETE/comment/:commentId - Delete a comment
router.delete(
  "/comment/:commentId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      // Extract current user ID from the payload
      const currentUser = req.payload._id;
      // Extract commentId from request parameters
      const { commentId } = req.params;
      // Find the comment to be deleted
      const comment = await Comment.findById(commentId);
      // Check if the current user has permission to delete the comment
      if (currentUser != comment.user) {
        return res.status(400).json({
          errorMessage:
            "This user does not have permition to perform this task",
        });
      }
      // Get the post associated with the comment
      const postId = await comment.post;
      // Update the post by removing the comment reference
      const updatePost = await Post.findByIdAndUpdate(postId, {
        $pull: { comments: commentId },
      });
      // Delete the comment
      const deletedComment = await Comment.findByIdAndDelete(commentId);
      // Respond with the deletedComment
      res.status(200).json(deletedComment);
    } catch (error) {
      next(error); // Pass the error to the error handling middleware
    }
  }
);

module.exports = router;
