const express = require("express");
const router = express.Router();
const User = require("../models/User.model");
const Post = require("../models/Post.model");
const Comment = require("../models/Comment.model");
const { isAuthenticated } = require("../middleware/jwt.middleware");

router.get("/in/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    await user.populate({
      path: "posts",
      populate: ["user", { path: "comments", populate: "user" }],
    });
    await user.populate({
      path: "likedPosts",
      populate: ["user", { path: "comments", populate: "user" }],
    });
    await user.populate("followers");
    /* await user.populate("following");
    await user.populate("likedPosts");
   */
    const objectUser = await {
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
    await res.status(200).json(objectUser);
  } catch (error) {
    await res.status(400).json(error);
  }
});

router.get("/in/:userId/follow", isAuthenticated, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUser = req.payload._id;
    const { followUserId } = req.body;
    if (currentUser != userId) {
      return await res.status(401).json({
        errorMessage: "This user does not have permition to perform this task",
      });
    }
    const checkUser = await User.findById(userId);

    if (checkUser.following.includes(followUserId)) {
      await res.status(200).json(true);
    } else {
      await res.status(200).json(false);
    }
  } catch (error) {
    await res.status(400).json(error);
  }
});

router.put("/in/:userId/follow", isAuthenticated, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUser = req.payload._id;
    const { followUserId } = req.body;

    if (currentUser != userId) {
      return await res.status(401).json({
        errorMessage: "This user does not have permition to perform this task",
      });
    }

    const checkUser = await User.findById(userId);

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
      await res.status(200).json(thisUser);
    }
  } catch (error) {
    await res.status(400).json(error);
  }
});

router.put("/profile-edit/:userId", isAuthenticated, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUser = req.payload._id;
    const { username, name, imageUrl, education, occupation, location, about } =
      await req.body;

    if (currentUser != userId) {
      return await res.status(401).json({
        errorMessage: "This user does not have permition to edit this profile",
      });
    } else {
      const allUsers = await User.find({});

      allUsers.forEach((el) => {
        if (el.username == username && el._id != userId) {
          return res.status(400).json({
            errorMessage: "This username is already taken",
          });
        }
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { username, name, imageUrl, education, occupation, location, about },
        { new: true }
      );

      await res.status(200).json(updatedUser);
    }
  } catch (error) {
    await res.status(400).json(error);
  }
});

router.delete(
  "/profile-delete/:userId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const currentUser = req.payload._id;

      if (currentUser != userId) {
        return await res.status(401).json({
          errorMessage:
            "This user does not have permition to perform this task",
        });
      }
      const user = await User.findById(userId);
      const userToDeleteComment = await User.findById(userId).populate("posts");

      const postsToDeleteComments = await userToDeleteComment.posts;

      for (i = 0; i < postsToDeleteComments.length; i++) {
        await Comment.findByIdAndDelete(postsToDeleteComments[i].comments);
      }

      const posts = await user.posts;

      for (i = 0; i < posts.length; i++) {
        await Post.findByIdAndDelete(posts[i]);
      }

      const deletedUser = await User.findByIdAndDelete(userId);

      await res.status(200).json(deletedUser);
    } catch (error) {
      await res.status(400).json(error);
    }
  }
);

module.exports = router;
