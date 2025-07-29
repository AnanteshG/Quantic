#!/usr/bin/env node

/**
 * Setup script for QuanticDaily Newsletter System
 * Run this to set up the newsletter automation
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🚀 Setting up QuanticDaily Newsletter System...\n");

// Check if Python is available
try {
  execSync("python --version", { stdio: "pipe" });
  console.log("✅ Python is available");
} catch (error) {
  console.log("❌ Python not found. Please install Python 3.8+ first.");
  process.exit(1);
}

// Check if ai-news-scraper directory exists
const scraperDir = path.join(__dirname, "..", "ai-news-scraper");
if (!fs.existsSync(scraperDir)) {
  console.log("❌ ai-news-scraper directory not found");
  console.log("Please make sure the ai-news-scraper is in the project root");
  process.exit(1);
}
console.log("✅ AI News Scraper found");

// Check for .env file
const envFile = path.join(__dirname, "..", ".env");
if (!fs.existsSync(envFile)) {
  console.log("⚠️  .env file not found");
  console.log("📝 Creating .env file from template...");

  const envExample = path.join(__dirname, "..", ".env.example");
  if (fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envFile);
    console.log(
      "✅ .env file created. Please edit it with your email credentials."
    );
  }
} else {
  console.log("✅ .env file exists");
}

// Install Python dependencies for the scraper
console.log("\n📦 Installing Python dependencies...");
try {
  execSync("pip install -r requirements.txt", {
    cwd: scraperDir,
    stdio: "inherit",
  });
  console.log("✅ Python dependencies installed");
} catch (error) {
  console.log(
    "⚠️  Error installing Python dependencies. You may need to install them manually."
  );
}

// Create initial subscribers file if it doesn't exist
const subscribersFile = path.join(__dirname, "..", "subscribers.json");
if (!fs.existsSync(subscribersFile)) {
  fs.writeFileSync(subscribersFile, JSON.stringify([], null, 2));
  console.log("✅ Created initial subscribers.json file");
}

console.log("\n🎉 Setup complete!\n");

console.log("Next steps:");
console.log("1. Edit .env file with your email credentials");
console.log("2. Test the newsletter: npm run newsletter:test");
console.log("3. Start the web server: npm run dev");
console.log("4. Start weekly automation: npm run newsletter:schedule\n");

console.log("📖 For detailed instructions, see NEWSLETTER_README.md");
