# QuanticDaily 📰🤖

AI-powered newsletter platform that curates and delivers the latest AI news to subscribers twice weekly.

## Features

- 🤖 **AI-Powered Curation**: Uses Google Gemini API for intelligent news analysis
- 📧 **Automated Distribution**: Bi-weekly newsletter generation and delivery
- 🎨 **Modern Frontend**: Responsive design built with Next.js 15 and Tailwind CSS 4
- � **Secure Subscriptions**: Firebase Firestore integration with token-based unsubscribe
- � **Mobile Responsive**: Optimized for all device sizes
- 🎯 **Custom Notifications**: Beautiful toast notifications matching the design
- 🚀 **Auto Deployment**: GitHub Actions workflow for automated newsletter generation

## Tech Stack

- **Frontend**: Next.js 15.4.4, React 19.1.0, TypeScript, Tailwind CSS 4
- **Backend**: Node.js automation scripts
- **Database**: Firebase Firestore
- **AI**: Google Gemini 1.5 Flash
- **Email**: SMTP (Gmail)
- **Deployment**: Vercel (Frontend), GitHub Actions (Newsletter Automation)

## Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/AnanteshG/Quantic)

## Environment Variables

### Required for Vercel Deployment:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
UNSUBSCRIBE_SECRET=your_secret_key_for_tokens
```

### Required for GitHub Actions (Newsletter Automation):

```env
# All the above variables plus:
GEMINI_API_KEY=your_gemini_api_key
SENDER_EMAIL=your_gmail@gmail.com
SENDER_PASSWORD=your_gmail_app_password
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
TEST_MODE=false
```

## Getting Started

### Local Development

```bash
git clone https://github.com/AnanteshG/Quantic.git
cd Quantic
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Setup Firebase

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Create a collection named `quantic-emails`
4. Add your Firebase configuration to environment variables

### Setup Email Authentication

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password for Gmail
3. Use the App Password as `SENDER_PASSWORD` in your environment variables

## Newsletter Schedule

The newsletter automatically runs:

- **Tuesday at 9:00 AM UTC**
- **Friday at 9:00 AM UTC**

You can also trigger it manually from the GitHub Actions tab.

## Project Structure

```
quantic/
├── app/
│   ├── page.tsx                    # Main landing page
│   ├── layout.tsx                  # App layout with toast provider
│   ├── components/
│   │   └── toast.tsx              # Custom toast notification system
│   ├── unsubscribe/
│   │   └── page.tsx               # Unsubscribe page
│   └── api/
│       ├── subscribe/route.ts      # Subscription API
│       └── unsubscribe/route.ts    # Unsubscribe API
├── scripts/
│   └── newsletter-automation.js    # Node.js automation script
├── .github/
│   └── workflows/
│       └── newsletter.yml         # GitHub Actions workflow
└── public/
    └── logo.png                   # Logo file
```

## Deployment

### 1. Frontend (Vercel)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set all environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### 2. Newsletter Automation (GitHub Actions)

1. Add all required secrets to GitHub repository settings
2. The workflow runs automatically on the scheduled times
3. Monitor execution in the Actions tab
4. View logs and artifacts for debugging

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ using Next.js, Firebase, and Google Gemini AI
