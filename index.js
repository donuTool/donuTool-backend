import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import mongoose from "mongoose";
import User from "./models/user.js";
import { issueToken, requireAuth } from "./middlewares/auth.js";
import {
  pickUserSettings,
  sanitizeClickCounts,
} from "./utils/pickUserSettings.js";

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const MAX_CLICKS_PER_REQUEST = 1000;

const app = express();
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({ ok: isDbConnected });
});

app.post("/auth/google/token", async (req, res) => {
  const { code, redirectUri } = req.body ?? {};
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
      // 처음 가입할 때는 게스트로 쓰던 설정과 클릭 횟수를 그대로 가져온다
      const buttonClickCounts = sanitizeClickCounts(req.body.buttonClickCounts);
      user = await User.create({
        googleId: userData.id,
        ...pickUserSettings(req.body),
        ...(buttonClickCounts && { buttonClickCounts }),
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

// 버튼 클릭 횟수를 서버에서 더한다. body: { counts: { goBack: 3, newTab: 1 } }
// 기기 여러 대에서 동시에 써도 서로의 횟수를 덮어쓰지 않는다
app.post("/api/user/me/clicks", requireAuth, async (req, res) => {
  const counts = sanitizeClickCounts(req.body?.counts, {
    min: 1,
    max: MAX_CLICKS_PER_REQUEST,
  });
  if (!counts || Object.keys(counts).length === 0) {
    return res.status(400).json({ error: "Invalid counts" });
  }

  const increments = Object.fromEntries(
    Object.entries(counts).map(([id, count]) => [`buttonClickCounts.${id}`, count]),
  );

  try {
    const updated = await User.findOneAndUpdate(
      { googleId: req.googleId },
      { $inc: increments },
      { new: true, projection: { buttonClickCounts: 1 } },
    );
    if (!updated) return res.status(404).json({ error: "User not found" });

    res.json({ buttonClickCounts: updated.buttonClickCounts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to record clicks" });
  }
});

// 통계(클릭 횟수) 초기화
app.delete("/api/user/me/stats", requireAuth, async (req, res) => {
  try {
    const updated = await User.findOneAndUpdate(
      { googleId: req.googleId },
      { $set: { buttonClickCounts: {} } },
      { new: true },
    );
    if (!updated) return res.status(404).json({ error: "User not found" });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to reset stats" });
  }
});

// 회원 탈퇴: 저장된 모든 데이터를 삭제한다
app.delete("/api/user/me", requireAuth, async (req, res) => {
  try {
    await User.deleteOne({ googleId: req.googleId });
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// DB 연결이 된 뒤에만 요청을 받는다. 연결에 실패하면 프로세스를 종료해 재시작되게 한다
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });
