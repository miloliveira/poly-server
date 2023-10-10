const { Schema, model } = require("mongoose");

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
const Post = model("posts", postSchema);

module.exports = Post;
