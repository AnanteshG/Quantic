const path = require("path");

// Load environment variables from the single .env file at the project root
require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
  override: true, // This will force variables from .env to be used
});



const CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  SENDER_EMAIL: process.env.SENDER_EMAIL,
  SENDER_PASSWORD: process.env.SENDER_PASSWORD,
  SMTP_SERVER: process.env.SMTP_SERVER || "smtp.gmail.com",
  SMTP_PORT: process.env.SMTP_PORT || "587",
  UNSUBSCRIBE_SECRET: process.env.UNSUBSCRIBE_SECRET,
  APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  TEST_MODE: process.env.TEST_MODE === "true",
  FIREBASE: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  },
};

function log(message, level = "INFO") {
  const timestamp = new Date().toISOString();
  const levelEmoji = {
    INFO: "ℹ️",
    WARN: "⚠️",
    ERROR: "❌",
    DEBUG: "🔍"
  };
  
  const emoji = levelEmoji[level] || "ℹ️";
  console.log(`${emoji} [${timestamp}] ${level}: ${message}`);
}

function validateConfig() {
  log("Environment variables check:");
  for (const key in CONFIG) {
    if (key === "FIREBASE") {
      log("Firebase Config: Loaded");
    } else if (CONFIG[key]) {
      log(`${key}: SET`);
    } else {
      log(`${key}: NOT SET`, "WARN");
    }
  }

  const required = [
    "GEMINI_API_KEY",
    "SENDER_EMAIL",
    "SENDER_PASSWORD",
    "UNSUBSCRIBE_SECRET",
    "APP_URL",
  ];
  const missing = required.filter((key) => !CONFIG[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
  log("Configuration validated successfully");
}

module.exports = { CONFIG, validateConfig, log };
