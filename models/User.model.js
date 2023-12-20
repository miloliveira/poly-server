// Dependencies
const { Schema, model } = require("mongoose");

// Define the User schema
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
        "https://res.cloudinary.com/diytoukff/image/upload/v1701795277/go4thbfxtd3fm39yk6vu.png",
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
    sharedPosts: [
      {
        type: Schema.Types.ObjectId,
        ref: "share",
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
// Create a User model based on the schema
const User = model("users", userSchema);
// Export the User model
module.exports = User;
