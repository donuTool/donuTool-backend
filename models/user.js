import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  buttonClickCounts: { type: Object },
  buttonsSetting: { type: Array },
  isDarkMode: { type: Boolean },
  addressOfNewTab: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
