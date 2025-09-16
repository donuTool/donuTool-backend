import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import mongoose from "mongoose";
import User from "./models/user.js";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.post("/auth/google/token", async (req, res) => {
  const { code, redirectUri, buttonClickCounts, buttonsSetting, isDarkMode, addressOfNewTab } = req.body;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    let user = await User.findOne({ googleId: userData.id });
    if (!user) {
      user = await User.create({
        googleId: userData.id,
        buttonClickCounts,
        buttonsSetting,
        isDarkMode,
        addressOfNewTab,
      });
    }

    res.json({
      token: tokenData.id_token,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to exchange code for token" });
  }
});

app.get("/api/user/:googleId", async (req, res) => {
  const { googleId } = req.params;
  console.log("요청된 googleId:", googleId);

  try {
    const user = await User.findOne({ googleId });
    console.log("찾은 user:", user);

    if (!user) return res.status(404).json({ error: "Failed to get user" });

    res.json(user);
  } catch (error) {
    console.error("DB 조회 에러:", error);
    res.status(500).json({ error: "DB error" });
  }
});

app.put("/api/user/:googleId", async (req, res) => {
  try {
    const updated = await User.findOneAndUpdate(
      { googleId: req.params.googleId },
      {
        buttonClickCounts: req.body.buttonClickCounts,
        buttonsSetting: req.body.buttonsSetting,
        isDarkMode: req.body.isDarkMode,
        addressOfNewTab: req.body.addressOfNewTab,
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
