const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
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
        "https://res.cloudinary.com/diytoukff/image/upload/v1668075402/appcrud/WIN_20220622_10_10_32_Pro_sljpcp.jpg",
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
