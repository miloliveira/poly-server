// Dependencies
const { Schema, model } = require("mongoose");

// Define the Share schema
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
// Create a Share model based on the schema
const Share = model("share", shareSchema);

// Export the Share model
module.exports = Share;
