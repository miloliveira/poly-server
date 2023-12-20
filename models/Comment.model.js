// Dependencies
const { Schema, model } = require("mongoose");

// Define the Comment schema
const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: [true],
    },
    user: { type: Schema.Types.ObjectId, ref: "users" },
    post: { type: Schema.Types.ObjectId, ref: "posts" },
  },
  {
    timestamps: true,
  }
);
// Create a Comment model based on the schema
const Comment = model("comments", commentSchema);

// Export the Comment model
module.exports = Comment;
