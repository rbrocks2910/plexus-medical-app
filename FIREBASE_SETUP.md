# Firebase Authentication Setup for Plexus

This guide will help you set up Google Authentication for the Plexus medical simulation app.

## Prerequisites

1. A Google account
2. A Firebase project (free tier available)

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "plexus-medical-simulator")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click on the "Get started" button
3. Go to the "Sign-in method" tab
4. Find "Google" in the provider list and click on it
5. Click "Enable"
6. Enter a project name (this will be shown to users)
7. Add your domain to authorized domains (for local development, add `localhost`)
8. Click "Save"

## Step 3: Get Firebase Configuration

1. In your Firebase project, click the gear icon → "Project settings"
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Enter an app nickname (e.g., "Plexus Web App")
5. Check "Also set up Firebase Hosting" (optional)
6. Click "Register app"
7. Copy the config object - you'll need these values for your `.env.local` file

## Step 4: Configure Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Gemini API Key (existing)
GEMINI_API_KEY=your-gemini-api-key-here
```

Replace the placeholder values with the actual values from your Firebase config.

## Step 5: Test the Authentication

1. Run your app: `npm run dev`
2. Navigate to the app - you should be redirected to the login screen
3. Click "Continue with Google"
4. Sign in with your Google account
5. You should be redirected back to the main app

## Rate Limiting Features

The authentication system includes built-in rate limiting:

- **Case Generation**: 50 cases per day, 200 cases per week
- **API Requests**: 1,000 requests per hour, 5,000 requests per day

These limits are enforced client-side and can be adjusted in `src/context/AuthContext.tsx`.

## User Management Features

- User profiles with Google account information
- Usage statistics tracking
- Account banning system (ready for database integration)
- Session persistence across browser refreshes

## Next Steps

After setting up authentication, you can:

1. **Add a Database**: Integrate with a database (like Neon, as mentioned) to persist user data and rate limiting information
2. **Admin Panel**: Create admin functionality to manage users and view usage statistics
3. **Enhanced Security**: Add server-side validation for rate limits and user bans

## Troubleshooting

- **"Auth domain not authorized"**: Add your domain to authorized domains in Firebase Console
- **"Invalid API key"**: Double-check your Firebase config values
- **Redirect issues**: Ensure your app is running on the correct port and domain

For more help, check the [Firebase Documentation](https://firebase.google.com/docs/auth/web/google-signin).
