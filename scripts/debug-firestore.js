#!/usr/bin/env node

/**
 * Debug script to test Firestore connection and list all subscribers
 */

const https = require("https");

// Configuration from environment variables
const CONFIG = {
  FIREBASE: {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  },
};

console.log("🔍 Firestore Debug Tool");
console.log("========================");
console.log(`Firebase Project ID: ${CONFIG.FIREBASE.projectId || "NOT SET"}`);
console.log(
  `Firebase API Key: ${
    CONFIG.FIREBASE.apiKey
      ? "SET (length: " + CONFIG.FIREBASE.apiKey.length + ")"
      : "NOT SET"
  }`
);
console.log("");

if (!CONFIG.FIREBASE.projectId || !CONFIG.FIREBASE.apiKey) {
  console.error("❌ Firebase configuration is missing!");
  console.log("Make sure these environment variables are set:");
  console.log("- NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  console.log("- NEXT_PUBLIC_FIREBASE_API_KEY");
  process.exit(1);
}

// Helper function to make HTTP requests
function makeHttpRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    };

    console.log(`📡 Making request to: ${urlObj.hostname}${urlObj.pathname}`);

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        console.log(`📨 Response status: ${res.statusCode}`);
        console.log(`📊 Response size: ${data.length} bytes`);

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          console.error(`❌ HTTP Error ${res.statusCode}:`);
          console.error(data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", (error) => {
      console.error(`❌ Request failed: ${error.message}`);
      reject(error);
    });

    req.end();
  });
}

async function testFirestoreConnection() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.FIREBASE.projectId}/databases/(default)/documents/quantic-emails?key=${CONFIG.FIREBASE.apiKey}`;

    console.log("🔗 Testing Firestore connection...");
    const response = await makeHttpRequest(url);

    console.log("✅ Successfully connected to Firestore!");
    console.log("");

    const data = JSON.parse(response);

    if (!data.documents || data.documents.length === 0) {
      console.log("📭 No subscribers found in the 'quantic-emails' collection");
      console.log("");
      console.log("💡 Possible reasons:");
      console.log("   1. No one has subscribed yet");
      console.log("   2. Collection is named differently");
      console.log("   3. Documents are in wrong format");
      console.log("");
      console.log("🔧 To add test subscribers, go to Firebase Console:");
      console.log(
        `   https://console.firebase.google.com/project/${CONFIG.FIREBASE.projectId}/firestore/data`
      );
      return;
    }

    console.log(
      `📋 Found ${data.documents.length} document(s) in 'quantic-emails' collection:`
    );
    console.log("");

    data.documents.forEach((doc, index) => {
      console.log(`📄 Document ${index + 1}:`);
      console.log(`   ID: ${doc.name.split("/").pop()}`);

      const fields = doc.fields;
      const email = fields.email?.stringValue || "No email field";
      const active = fields.active?.booleanValue;
      const subscribedAt =
        fields.subscribedAt?.timestampValue || fields.subscribedAt?.stringValue;

      console.log(`   📧 Email: ${email}`);
      console.log(`   ✅ Active: ${active}`);
      console.log(`   📅 Subscribed At: ${subscribedAt || "Not set"}`);
      console.log("");
    });

    const activeSubscribers = data.documents.filter((doc) => {
      const fields = doc.fields;
      const email = fields.email?.stringValue;
      const active =
        fields.active?.booleanValue !== false &&
        email &&
        fields.subscribedAt?.timestampValue;
      return email && active;
    });

    console.log(`🎯 Active subscribers: ${activeSubscribers.length}`);

    if (activeSubscribers.length === 0) {
      console.log("⚠️  No active subscribers found!");
      console.log("💡 Make sure subscriber documents have:");
      console.log("   - email: (string) with valid email address");
      console.log("   - subscribed: (boolean) set to true");
    }
  } catch (error) {
    console.error("❌ Error testing Firestore:");
    console.error(`   ${error.message}`);

    if (error.message.includes("permission")) {
      console.log("");
      console.log("🔐 This looks like a permissions issue. Make sure:");
      console.log("   1. Firestore rules allow read access");
      console.log("   2. API key has proper permissions");
    }

    if (error.message.includes("not found")) {
      console.log("");
      console.log("📁 Collection might not exist. Make sure:");
      console.log(
        "   1. Collection is named 'quantic-emails' (case-sensitive)"
      );
      console.log("   2. At least one document exists in the collection");
    }
  }
}

// Run the test
console.log("🚀 Starting Firestore debug test...");
console.log("");
testFirestoreConnection();
