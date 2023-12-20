// Dependencies
const { Schema, model } = require("mongoose");

// Define the Post schema
const postSchema = new Schema(
  {
    content: {
      type: String,
      required: [true, "Post content is required"],
    },
    user: { type: Schema.Types.ObjectId, ref: "users" },
    likes: [{ type: Schema.Types.ObjectId, ref: "users" }],
    shares: [{ type: Schema.Types.ObjectId, ref: "share" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "comments" }],
    imageUrl: { type: String },
  },
  {
    timestamps: true,
  }
);
// Create a Post model based on the schema
const Post = model("posts", postSchema);

// Export the Post model
module.exports = Post;
