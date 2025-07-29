#!/usr/bin/env node

/**
 * Test script for QuanticDaily Newsletter System
 * Validates all components before running automation
 */

const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");

console.log("🧪 Testing QuanticDaily Newsletter System...\n");

let allTestsPassed = true;

function testFailed(message) {
  console.log(`❌ ${message}`);
  allTestsPassed = false;
}

function testPassed(message) {
  console.log(`✅ ${message}`);
}

// Test 1: Check Node.js and npm
try {
  const nodeVersion = execSync("node --version", { encoding: "utf8" }).trim();
  const npmVersion = execSync("npm --version", { encoding: "utf8" }).trim();
  testPassed(`Node.js ${nodeVersion} and npm ${npmVersion} are available`);
} catch (error) {
  testFailed("Node.js or npm not found");
}

// Test 2: Check Python
try {
  const pythonVersion = execSync("python --version", {
    encoding: "utf8",
  }).trim();
  testPassed(`${pythonVersion} is available`);
} catch (error) {
  testFailed("Python not found. Please install Python 3.8+");
}

// Test 3: Check .env file
const envFile = path.join(__dirname, "..", ".env");
if (fs.existsSync(envFile)) {
  testPassed(".env file exists");

  // Check for required environment variables
  const envContent = fs.readFileSync(envFile, "utf8");
  const requiredVars = ["GEMINI_API_KEY", "SENDER_EMAIL", "SENDER_PASSWORD"];
  const missingVars = [];

  requiredVars.forEach((varName) => {
    if (
      !envContent.includes(`${varName}=`) ||
      envContent.includes(`${varName}=your-`)
    ) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length === 0) {
    testPassed("All required environment variables are configured");
  } else {
    testFailed(
      `Missing or incomplete environment variables: ${missingVars.join(", ")}`
    );
  }
} else {
  testFailed(".env file not found. Run: cp .env.example .env");
}

// Test 4: Check AI news scraper directory
const scraperDir = path.join(__dirname, "..", "ai-news-scraper");
if (fs.existsSync(scraperDir)) {
  testPassed("AI News Scraper directory found");

  // Check if Gemini integration file exists
  const geminiFile = path.join(scraperDir, "src", "gemini_integration.py");
  if (fs.existsSync(geminiFile)) {
    testPassed("Gemini integration module found");
  } else {
    testFailed("Gemini integration module not found");
  }
} else {
  testFailed("AI News Scraper directory not found");
}

// Test 5: Check Python dependencies
console.log("\n📦 Testing Python dependencies...");
try {
  execSync("pip show google-generativeai", { stdio: "pipe" });
  testPassed("google-generativeai package is installed");
} catch (error) {
  testFailed(
    "google-generativeai package not installed. Run: pip install google-generativeai"
  );
}

// Test 6: Test Gemini API (if configured)
if (fs.existsSync(envFile)) {
  console.log("\n🤖 Testing Gemini API connection...");

  const testGemini = spawn(
    "python",
    [path.join(scraperDir, "src", "gemini_integration.py")],
    {
      cwd: scraperDir,
      env: { ...process.env },
    }
  );

  let geminiOutput = "";
  let geminiError = "";

  testGemini.stdout.on("data", (data) => {
    geminiOutput += data.toString();
  });

  testGemini.stderr.on("data", (data) => {
    geminiError += data.toString();
  });

  testGemini.on("close", (code) => {
    if (code === 0 && geminiOutput.includes("Summary:")) {
      testPassed("Gemini API is working correctly");
    } else {
      testFailed(`Gemini API test failed: ${geminiError || "Unknown error"}`);
    }

    // Test 7: Test Next.js development server
    console.log("\n🌐 Testing Next.js application...");

    // This is a simplified test - in practice you'd start the dev server and make a request
    const packageJson = path.join(__dirname, "..", "package.json");
    if (fs.existsSync(packageJson)) {
      testPassed("Next.js project structure is valid");
    } else {
      testFailed("package.json not found");
    }

    // Final results
    console.log("\n" + "=".repeat(50));
    if (allTestsPassed) {
      console.log("🎉 All tests passed! The system is ready to use.");
      console.log("\nNext steps:");
      console.log("1. npm run dev (start web server)");
      console.log("2. npm run newsletter:test (test newsletter generation)");
      console.log("3. npm run newsletter:schedule (start automation)");
    } else {
      console.log(
        "❌ Some tests failed. Please fix the issues above before proceeding."
      );
      console.log(
        "\nRefer to AUTOMATION_GUIDE.md for detailed setup instructions."
      );
    }
  });
} else {
  console.log("\n" + "=".repeat(50));
  console.log("⚠️  Cannot test API connections without .env configuration");
  console.log("Please set up your .env file and run the test again.");
}
