import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import mongoose from "mongoose";
import User from "./models/user.js";

dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.post("/auth/google/token", async (req, res) => {
  const { code, redirectUri, buttonsSetting, isDarkMode } = req.body;
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
        buttonsSetting,
        isDarkMode,
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
  try {
    const user = await User.findOne({ googleId: req.params.googleId });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

app.put("/api/user/:googleId", async (req, res) => {
  try {
    const updated = await User.findOneAndUpdate({ googleId: req.params.googleId }, { buttonsSetting: req.body.buttonsSetting, isDarkMode: req.body.isDarkMode }, { new: true });
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.listen(3001, () => console.log("🚀 Server running on http://localhost:3001"));
