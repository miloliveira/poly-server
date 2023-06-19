const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "username is required."],
      unique: true,
    },
    username: {
      type: String,
      required: [true, "username is required."],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required."],
    },
    name: {
      type: String,
      required: [true, "Name is required."],
    },
    about: {
      type: String,
    },
    location: {
      type: String,
    },
    education: {
      type: String,
    },
    occupation: {
      type: String,
    },

    imageUrl: {
      type: String,
      default:
        "https://res.cloudinary.com/diytoukff/image/upload/v1669067970/appcrud/profile_tumbnail_wyvxv8.png",
    },
    posts: [
      {
        type: Schema.Types.ObjectId,
        ref: "posts",
      },
    ],
    likedPosts: [
      {
        type: Schema.Types.ObjectId,
        ref: "posts",
      },
    ],
    following: [
      {
        type: Schema.Types.ObjectId,
        ref: "users",
      },
    ],
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: "users",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const User = model("users", userSchema);

module.exports = User;
