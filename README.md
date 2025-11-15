# Interview Chatbot

An advanced interview chatbot with video, audio, screenshot recording, and AI-powered question generation.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Gemini API Key
# Get your API key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Server Port (optional, defaults to 3000)
PORT=3000
```

**Important:** Never commit the `.env` file to version control. It contains sensitive API keys.

### 3. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it in your `.env` file

### 4. Start the Server

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Security Features

- ✅ API key stored securely on the server (never exposed to client)
- ✅ Environment variables for configuration
- ✅ Backend proxy for API calls

## How It Works

1. The frontend sends candidate answers to the backend API endpoint
2. The backend uses the Gemini API key from `.env` to generate questions
3. The API key never reaches the browser, keeping it secure

## Troubleshooting

### API Key Not Working

1. Make sure `.env` file exists in the root directory
2. Verify `GEMINI_API_KEY` is set correctly (no quotes needed)
3. Restart the server after changing `.env`
4. Check server console for error messages

### Check API Status

Open browser console and run:
```javascript
getApiStatus()
```

This will show if the API key is configured correctly.












