# Google Gemini API Setup Guide

## Step 1: Get a Valid API Key

### Option A: Google AI Studio (Recommended)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Add to your `.env.local` file

### Option B: Google Cloud Platform
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable "Generative Language API"
4. Create credentials (API Key)
5. Add to your `.env.local` file

## Step 2: Configure Your Project

Add to your `.env.local` file:
```bash
GOOGLE_AI_API_KEY=your_actual_api_key_here
```

## Step 3: Test the API Key

Run this test to verify your key works:
```bash
node test-google-ai.js
```

## Step 4: Available Models

Current working models:
- `gemini-1.5-pro` (Latest, most capable)
- `gemini-1.5-flash` (Fast, cost-effective)
- `gemini-pro` (Legacy)

## Step 5: Troubleshooting

### "API key not valid" Error:
- Ensure you copied the full key (starts with "AIza...")
- Check there are no extra spaces
- Verify the key is enabled in Google AI Studio

### "Model not found" Error:
- Try different model names
- Check if the model is available in your region

### "Permission denied" Error:
- Ensure the Generative Language API is enabled
- Check your Google Cloud project permissions

## Quick Test Command

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Hello, Gemini!"
      }]
    }]
  }'
```

Replace `YOUR_API_KEY` with your actual key.
