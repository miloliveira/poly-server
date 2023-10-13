const express = require("express");
const router = express.Router();
const Post = require("../models/Post.model");
const User = require("../models/User.model");
const Comment = require("../models/Comment.model");
const Share = require("../models/Share.model");
const { isAuthenticated } = require("../middleware/jwt.middleware");
const fileUploader = require("../config/cloudinary");

router.get("/posts", async (req, res, next) => {
  try {
    const allPosts = await Post.find({})
      .populate({ path: "user", select: "name imageUrl" })
      .populate({
        path: "comments",
        populate: { path: "user", select: "name imageUrl" },
      })
      .sort({
        createdAt: -1,
      });

    res.status(200).json(allPosts);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get("/post/:postId", (req, res, next) => {
  try {
    const { postId } = req.params;
    Post.findById(postId)
      .populate("user")
      .then((post) => {
        res.status(200).json(post);
      });
  } catch (error) {
    res.status(400).json(error);
  }
});

router.post("/create-post/:userId", isAuthenticated, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { content, imageUrl } = req.body;
    const currentUser = req.payload._id;
    let image;
    /* if (!imageUrl) {
        image =
          "https://res.cloudinary.com/diytoukff/image/upload/v1668075402/appcrud/WIN_20220622_10_10_32_Pro_sljpcp.jpg";
      } else {
        image = imageUrl;
      } */

    if (currentUser != userId) {
      return res.status(400).json({
        errorMessage: "This user does not have permition to perform this task",
      });
    }

    if (!content) {
      return res
        .status(400)
        .json({ errorMessage: "Please provide the post content" });
    }

    const thisUser = await User.findById(userId);

    const createdPost = await Post.create({
      user: userId,
      content: content,
      imageUrl,
    });

    const savedPost = await createdPost.save();
    await thisUser.posts.push(createdPost);
    await thisUser.save();
    res.status(201).json(savedPost);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.put("/post-update/:postId", isAuthenticated, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const currentUser = req.payload._id;
    const { content, imageUrl } = req.body;
    let updatedPost;
    const thisPost = await Post.findById(postId);

    if (currentUser != thisPost.user) {
      return res.status(400).json({
        errorMessage: "This user does not have permition to perform this task",
      });
    } else {
      if (!content) {
        return res
          .status(400)
          .json({ errorMessage: "Please provide the post content" });
      }

      updatedPost = await Post.findByIdAndUpdate(
        postId,
        { content, imageUrl },
        { new: true }
      );
      res.status(200).json(updatedPost);
    }
  } catch (error) {
    res.json(error);
  }
});

router.put("/post-like/:postId", isAuthenticated, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const currentUser = req.payload._id;
    const checkUser = await User.findById(currentUser);

    if (checkUser.likedPosts.includes(postId)) {
      return res
        .status(400)
        .json({ errorMessage: "You liked this game before" });
    }
    const thisUser = await User.findByIdAndUpdate(currentUser, {
      $push: { likedPosts: postId },
    });
    await Post.findByIdAndUpdate(postId, { $push: { likes: currentUser } });
    res.status(200).json(thisUser);
  } catch (error) {
    res.json(error);
  }
});

router.put("/post-dislike/:postId", isAuthenticated, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const currentUser = req.payload._id;

    const thisUser = await User.findByIdAndUpdate(
      currentUser,
      {
        $pull: { likedPosts: postId },
      },
      { new: true }
    );

    await Post.findByIdAndUpdate(postId, { $pull: { likes: currentUser } });

    res.status(200).json(thisUser);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get("/testing", isAuthenticated, async (req, res, next) => {
  try {
    const currentUser = req.payload;
    if (currentUser) res.json(currentUser);
    else {
      res.json("No current user");
    }
  } catch (error) {
    res.json(error);
  }
});

router.delete(
  "/post-delete/:postId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { postId } = req.params;
      const currentUser = req.payload._id;
      const thisPost = await Post.findById(postId);

      if (thisPost.user != currentUser) {
        return res.status(400).json({
          errorMessage:
            "This user does not have permition to perform this task",
        });
      }

      await User.findByIdAndUpdate(currentUser, {
        $pull: { posts: postId },
      });

      const allUsers = await User.find({});

      for (let i = 0; i < allUsers.length; i++) {
        await User.findByIdAndUpdate(allUsers[i], {
          $pull: { likedPosts: postId },
        });
      }

      const commentsToDelete = await thisPost.comments;

      for (let i = 0; i < commentsToDelete.length; i++) {
        await Comment.findByIdAndDelete(commentsToDelete[i]);
      }

      const deletedPost = await Post.findByIdAndDelete(postId);
      res.status(200).json(deletedPost);
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

router.post("/share-post/:postId", isAuthenticated, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const currentUser = req.payload._id;
    const { userId, content } = req.body;

    const allShares = await Share.find({});

    if (currentUser !== userId) {
      return res.status(400).json({
        errorMessage: "This user does not have permition to perform this task.",
      });
    }

    for (let i = 0; i < allShares.length; i++) {
      if (allShares[i].postId == postId && allShares[i].userId == userId) {
        return res
          .status(400)
          .json({ errorMessage: "This post has already been shared." });
      }
    }

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
    res.status(200).json(newShare);
  } catch (error) {
    console.log(error);
  }
});

router.delete(
  "/delete-share/:shareId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { shareId } = req.params;
      const currentUser = req.payload._id;
      const { userId, postId } = req.body;

      if (currentUser !== userId) {
        return res.status(400).json({
          errorMessage:
            "This user does not have permition to perform this task.",
        });
      }

      const user = await User.findById(userId);
      const post = await Post.findById(postId);

      if (user.sharedPosts.includes(shareId) && post.shares.includes(shareId)) {
        await user.sharedPosts.pull(shareId);
        const updatedUser = await user.save();
        await post.shares.pull(shareId);
        const updatedPost = await post.save();

        const shareToDelete = await Share.findByIdAndDelete(shareId);
        return res.status(200).json(shareToDelete);
      } else {
        return res
          .status(400)
          .json({ errorMessage: "This action cannot be completed" });
      }
    } catch (error) {
      console.log(error);
    }
  }
);
module.exports = router;
