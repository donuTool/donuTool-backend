import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import mongoose from "mongoose";
import User from "./models/user.js";
import { issueToken, requireAuth } from "./middlewares/auth.js";
import { pickUserSettings } from "./utils/pickUserSettings.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.post("/auth/google/token", async (req, res) => {
  const { code, redirectUri } = req.body;
  if (typeof code !== "string" || typeof redirectUri !== "string") {
    return res.status(400).json({ error: "Invalid request" });
  }

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
    if (!tokenRes.ok) {
      return res.status(401).json({ error: "Failed to exchange code for token" });
    }
    const tokenData = await tokenRes.json();

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) {
      return res.status(401).json({ error: "Failed to fetch Google user" });
    }
    const userData = await userRes.json();
    if (!userData.id) {
      return res.status(401).json({ error: "Failed to fetch Google user" });
    }

    let user = await User.findOne({ googleId: userData.id });
    if (!user) {
      user = await User.create({
        googleId: userData.id,
        ...pickUserSettings(req.body),
      });
    }

    res.json({
      token: issueToken(user.googleId),
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to exchange code for token" });
  }
});

app.get("/api/user/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ googleId: req.googleId });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

app.put("/api/user/me", requireAuth, async (req, res) => {
  const settings = pickUserSettings(req.body);
  if (Object.keys(settings).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    const updated = await User.findOneAndUpdate(
      { googleId: req.googleId },
      { $set: settings },
      { new: true },
    );
    if (!updated) return res.status(404).json({ error: "User not found" });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
