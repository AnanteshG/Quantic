#!/usr/bin/env node
/**
 * QuanticDaily Deployment Helper
 * Helps prepare the project for deployment
 */

const fs = require("fs");
const path = require("path");

console.log("🚀 QuanticDaily Deployment Helper\n");

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), "package.json");
if (!fs.existsSync(packageJsonPath)) {
  console.error(
    "❌ Error: package.json not found. Run this script from the project root."
  );
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
if (packageJson.name !== "quanticdaily") {
  console.error(
    "❌ Error: This doesn't appear to be the QuanticDaily project."
  );
  process.exit(1);
}

console.log("✅ Project directory confirmed\n");

// Check required files
const requiredFiles = [
  "vercel.json",
  ".github/workflows/newsletter.yml",
  ".github/workflows/deploy.yml",
  "DEPLOYMENT_GUIDE.md",
  "requirements.txt",
];

console.log("📋 Checking deployment files...");
let allFilesExist = true;

for (const file of requiredFiles) {
  if (fs.existsSync(path.join(process.cwd(), file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log(
    "\n❌ Some required files are missing. Please ensure all deployment files are present."
  );
  process.exit(1);
}

console.log("\n🔧 Environment Check...");

// Check for .env file
if (fs.existsSync(".env")) {
  console.log("✅ .env file found");

  // Check for required environment variables
  const envContent = fs.readFileSync(".env", "utf8");
  const requiredEnvVars = ["GEMINI_API_KEY", "SENDER_EMAIL", "SENDER_PASSWORD"];

  for (const envVar of requiredEnvVars) {
    if (
      envContent.includes(`${envVar}=`) &&
      !envContent.includes(`${envVar}=your-`)
    ) {
      console.log(`✅ ${envVar} configured`);
    } else {
      console.log(`⚠️  ${envVar} needs configuration`);
    }
  }
} else {
  console.log(
    "⚠️  .env file not found - you'll need to configure environment variables"
  );
}

console.log("\n📦 Dependency Check...");

// Check Node.js dependencies
try {
  const nodeModulesExists = fs.existsSync("node_modules");
  if (nodeModulesExists) {
    console.log("✅ Node.js dependencies installed");
  } else {
    console.log("⚠️  Node.js dependencies not installed. Run: npm install");
  }
} catch (error) {
  console.log("⚠️  Could not check Node.js dependencies");
}

// Check Python dependencies
try {
  const pythonRequirements = "requirements.txt";
  if (fs.existsSync(pythonRequirements)) {
    console.log("✅ Python requirements.txt found");
    console.log("ℹ️  Make sure to install: pip install -r requirements.txt");
  }
} catch (error) {
  console.log("⚠️  Could not check Python requirements");
}

console.log("\n🎯 Next Steps for Deployment:");
console.log("1. 📚 Read the DEPLOYMENT_GUIDE.md for detailed instructions");
console.log("2. 🔑 Get your API keys:");
console.log("   - Google Gemini API: https://aistudio.google.com/");
console.log("   - Gmail App Password: https://myaccount.google.com/");
console.log("3. 🐙 Push to GitHub:");
console.log("   git add .");
console.log('   git commit -m "Ready for deployment"');
console.log("   git push origin main");
console.log("4. 🚀 Deploy to Vercel:");
console.log("   - Connect your GitHub repo to Vercel");
console.log("   - Set environment variables");
console.log("   - Deploy!");
console.log("5. ⚙️  Set up GitHub Actions:");
console.log("   - Add secrets to your GitHub repo");
console.log("   - Test the newsletter workflow");

console.log("\n🎉 Your QuanticDaily project is ready for deployment!");
console.log("📖 For detailed instructions, see: DEPLOYMENT_GUIDE.md");

// Create a quick reference file
const quickRef = `# Quick Deployment Reference

## Environment Variables Needed:
- GEMINI_API_KEY
- SENDER_EMAIL 
- SENDER_PASSWORD
- SMTP_SERVER=smtp.gmail.com
- SMTP_PORT=587
- NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

## Deployment Commands:
\`\`\`bash
# Build and test locally
npm run build
npm run test:email

# Deploy to production
git add .
git commit -m "Deploy to production"
git push origin main
\`\`\`

## Useful Links:
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Actions: https://github.com/yourusername/quanticdaily/actions
- Google AI Studio: https://aistudio.google.com/
`;

fs.writeFileSync("QUICK_DEPLOY_REFERENCE.md", quickRef);
console.log("📝 Created QUICK_DEPLOY_REFERENCE.md for easy reference");
