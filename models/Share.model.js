const { Schema, model } = require("mongoose");

const shareSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "users" },
    postId: {
      type: Schema.Types.ObjectId,
      ref: "posts",
    },
    content: { type: String },
  },
  {
    timestamps: true,
  }
);

const Share = model("share", shareSchema);

module.exports = Share;
