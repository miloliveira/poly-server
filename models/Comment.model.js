const { Schema, model } = require("mongoose");

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

const Comment = model("comments", commentSchema);

module.exports = Comment;
