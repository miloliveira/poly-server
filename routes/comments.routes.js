const express = require("express");
const router = express.Router();

const Post = require("../models/Post.model");
const Comment = require("../models/Comment.model.js");

const { isAuthenticated } = require("../middleware/jwt.middleware");

router.get("/comments/:postId", async (req, res, next) => {
  try {
    const { postId } = req.params;

    const commentsList = await Comment.find({ post: postId }).populate({
      path: "user",
      select: "name imageUrl",
    });
    res.status(200).json(commentsList);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.post(
  "/create-comment/:postId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      const currentUser = req.payload._id;
      const { postId } = req.params;
      const { content } = req.body;

      if (!content) {
        return res
          .status(400)
          .json({ errorMessage: "Please provide the comment content" });
      }

      const post = await Post.findById(postId);

      const newComment = await Comment.create({
        content: content,
        user: currentUser,
        post: postId,
      });

      const savedComment = await newComment.save();

      const pushComment = await post.comments.push(savedComment);

      const updatedPost = await post.save();
      res.status(201).json(updatedPost);
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

router.put(
  "/comment-update/:commentId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { commentId } = req.params;
      const currentUser = req.payload._id;
      const { content } = req.body;
      let updatedComment;
      const thisComment = await Comment.findById(commentId);

      if (currentUser != thisComment.user) {
        return res.status(400).json({
          errorMessage:
            "This user does not have permition to perform this task",
        });
      } else {
        if (!content) {
          return res
            .status(400)
            .json({ errorMessage: "Please provide the comment content" });
        }

        updatedComment = await Comment.findByIdAndUpdate(
          commentId,
          { content },
          { new: true }
        );
        res.status(200).json(updatedComment);
      }
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

router.delete(
  "/comment/:commentId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      const currentUser = req.payload._id;
      const { commentId } = req.params;

      const comment = await Comment.findById(commentId);

      if (currentUser != comment.user) {
        return res.status(400).json({
          errorMessage:
            "This user does not have permition to perform this task",
        });
      }

      const postId = await comment.post;

      const updatePost = await Post.findByIdAndUpdate(postId, {
        $pull: { comments: commentId },
      });

      const deletedComment = await Comment.findByIdAndDelete(commentId);

      res.status(200).json(deletedComment);
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

module.exports = router;
