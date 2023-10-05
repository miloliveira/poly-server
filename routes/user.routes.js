const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require("jsonwebtoken");
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
    res.status(200).json(objectUser);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get("/in/:userId/follow", isAuthenticated, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUser = req.payload._id;
    const { followUserId } = req.body;
    if (currentUser != userId) {
      return res.status(401).json({
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
    const thisUsernameExists = await User.findOne({ username: username });

    if (currentUser != userId) {
      return res.status(401).json({
        errorMessage: "This user does not have permition to edit this profile",
      });
    } else if (thisUsernameExists && thisUsernameExists._id != userId) {
      res.status(400).json({
        errorMessage: "This username is already taken",
      });
    } else {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { username, name, imageUrl, education, occupation, location, about },
        { new: true }
      );

      res.status(200).json(updatedUser);
    }
  } catch (error) {
    res.status(400).json(error);
  }
});

router.put(
  "/edit-password/:userId",
  isAuthenticated,
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const currentUser = req.payload._id;
      const { newPassword } = await req.body;

      if (currentUser != userId) {
        return res.status(401).json({
          errorMessage:
            "This user does not have permition to edit this profile",
        });
      } else {
        const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
        if (!passwordRegex.test(newPassword)) {
          return res.status(400).json({
            errorMessage:
              "Password must have at least 6 characters and contain at least one number, one lowercase and one uppercase letter.",
          });
        }
        const salt = bcrypt.genSaltSync(saltRounds);
        const hashedPassword = bcrypt.hashSync(newPassword, salt);

        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { password: hashedPassword },
          { new: true }
        );
        await res.status(200).json(updatedUser);
      }
    } catch (error) {
      await res.status(400).json(error);
    }
  }
);

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

router.get("/in/:userId/postActivity", async (req, res, next) => {
  try {
    const { userId } = req.params;

    const userPostsActivity = await Post.find({ user: userId })
      .populate({ path: "user", select: "name imageUrl" })
      .populate({
        path: "comments",
        populate: { path: "user", select: "name imageUrl" },
      })
      .sort({
        createdAt: -1,
      });

    res.status(200).json(userPostsActivity);
  } catch (error) {
    res.status(400).json(error);
    console.log(error);
  }
});

router.get("/in/:userId/postActivity/:qty", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { qty } = req.params;

    const userPostsActivity = await Post.find({ user: userId })
      .populate({ path: "user", select: "name imageUrl" })
      .populate({
        path: "comments",
        populate: { path: "user", select: "name imageUrl" },
      })
      .sort({ createdAt: -1 })
      .limit(qty);

    res.status(200).json(userPostsActivity);
  } catch (error) {
    res.status(400).json(error);
    console.log(error);
  }
});

router.get("/in/:userId/likeActivity", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const userLikeActivity = await Post.find({ likes: userId })
      .populate({ path: "user", select: "name imageUrl" })
      .populate({
        path: "comments",
        populate: { path: "user", select: "name imageUrl" },
      })
      .sort({
        updatedAt: -1,
      });
    //console.log(userLikeActivity);
    await res.status(200).json(userLikeActivity);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get("/in/:userId/likeActivity/:qty", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { qty } = req.params;
    const userLikeActivity = await Post.find({ likes: userId })
      .populate({ path: "user", select: "name imageUrl" })
      .populate({
        path: "comments",
        populate: { path: "user", select: "name imageUrl" },
      })
      .sort({ updatedAt: -1 })
      .limit(qty);

    res.status(200).json(userLikeActivity);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get("/in/:userId/commentActivity", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const allComments = await Comment.find({ user: userId }).sort({
      updatedAt: -1,
    });

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
    let newArr = await commentsArray.map(JSON.stringify);
    let uniqueArr = new Set(newArr);
    let resArr = Array.from(uniqueArr, JSON.parse);

    res.status(200).json(resArr);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get("/in/:userId/commentActivity/:qty", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { qty } = req.params;
    const allComments = await Comment.find({ user: userId })
      .limit(qty)
      .sort({ updatedAt: -1 });

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
    let newArr = await commentsArray.map(JSON.stringify);
    let uniqueArr = new Set(newArr);
    let resArr = Array.from(uniqueArr, JSON.parse);

    res.status(200).json(resArr);
  } catch (error) {
    res.status(400).json(error);
  }
});

module.exports = router;
