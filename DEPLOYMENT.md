# Deployment Guide

This guide will help you deploy the Interview Chatbot application:
- **Frontend**: Deploy to Vercel
- **Backend**: Deploy to Render

## Prerequisites

1. **GitHub Account**: You'll need a GitHub account to connect your repositories
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Render Account**: Sign up at [render.com](https://render.com)
4. **Gemini API Key**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

---

## Step 1: Prepare Your Code

### 1.1 Update API URL Configuration

The frontend needs to know where your backend is deployed. After deploying the backend, you'll update the frontend with the backend URL.

### 1.2 Create Environment Files

Create a `.env` file in the root directory (for local development):

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

**Note**: Never commit `.env` files to Git. They are already in `.gitignore`.

---

## Step 2: Deploy Backend to Render

### 2.1 Push Code to GitHub

1. Initialize git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub

3. Push your code:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

### 2.2 Deploy on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your repository
5. Configure the service:
   - **Name**: `interview-chatbot-backend` (or your preferred name)
   - **Environment**: `Node`
   - **Root Directory**: Leave empty or set to `.` (root of repository)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Choose **Free** (or paid plan)
   
   **Important**: If you see "Service Root Directory" error, make sure the Root Directory field is empty or set to `.` (not `/server` or any subdirectory)
6. Add Environment Variables:
   - Click **"Advanced"** → **"Add Environment Variable"**
   - Add:
     - `NODE_ENV` = `production`
     - `PORT` = `10000` (Render uses port 10000 by default)
     - `GEMINI_API_KEY` = `your_actual_gemini_api_key`
7. Click **"Create Web Service"**
8. Wait for deployment to complete (usually 2-5 minutes)
9. Copy your service URL (e.g., `https://interview-chatbot-backend.onrender.com`)

### 2.3 Test Backend

Visit: `https://your-backend-url.onrender.com/health`

You should see: `{"status":"ok"}`

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Update Frontend API URL

Before deploying, you need to update the frontend to use your Render backend URL.

1. Open `index.html`
2. Add this script tag in the `<head>` section (before `app.js`):
   ```html
   <script>
     // Set API base URL from environment variable or use Render backend URL
     window.API_BASE_URL = 'https://your-backend-url.onrender.com';
   </script>
   ```
   Replace `your-backend-url.onrender.com` with your actual Render backend URL.

### 3.2 Deploy on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (or leave default)
   - **Build Command**: Leave empty (static site, no build needed)
   - **Output Directory**: Leave empty or `./` (default)
   - **Install Command**: Leave default (npm install)
5. Add Environment Variables (optional, if you want to use Vercel env vars):
   - Click **"Environment Variables"**
   - Add: `API_BASE_URL` = `https://your-backend-url.onrender.com`
6. Click **"Deploy"**
7. Wait for deployment (usually 1-2 minutes)
8. Your site will be live at: `https://your-project.vercel.app`

### 3.3 Update CORS on Backend (if needed)

If you encounter CORS errors, the backend already has CORS enabled. If issues persist, check the CORS settings in `server.js`.

---

## Step 4: Update Frontend with Backend URL (Alternative Method)

If you prefer to use environment variables instead of hardcoding:

1. In Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `VITE_API_BASE_URL` = `https://your-backend-url.onrender.com`
3. Update `index.html` to read from environment:
   ```html
   <script>
     window.API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-backend-url.onrender.com';
   </script>
   ```

---

## Step 5: Test Your Deployment

1. Visit your Vercel frontend URL
2. Start an interview
3. Check browser console for any errors
4. Verify that AI questions are being generated (check Network tab for API calls)

---

## Troubleshooting

### Backend Issues

- **502 Bad Gateway**: Check Render logs, ensure `GEMINI_API_KEY` is set correctly
- **API not working**: Verify the backend URL is correct in frontend
- **CORS errors**: Backend already has CORS enabled, but verify the frontend URL is allowed

### Frontend Issues

- **API calls failing**: Check that `window.API_BASE_URL` is set correctly
- **404 errors**: Verify the API endpoint path is correct (`/api/generate-question`)

### Common Solutions

1. **Clear browser cache**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check browser console**: Look for JavaScript errors
3. **Check Render logs**: Go to Render dashboard → Your service → Logs
4. **Check Vercel logs**: Go to Vercel dashboard → Your project → Deployments → View logs

---

## Environment Variables Summary

### Backend (Render)
- `NODE_ENV` = `production`
- `PORT` = `10000`
- `GEMINI_API_KEY` = `your_gemini_api_key`

### Frontend (Vercel) - Optional
- `API_BASE_URL` = `https://your-backend-url.onrender.com`

---

## Cost Information

- **Vercel**: Free tier includes generous limits for personal projects
- **Render**: Free tier available, but services spin down after 15 minutes of inactivity (takes ~30 seconds to wake up)
- **Gemini API**: Free tier available with usage limits

---

## Next Steps

1. Set up custom domains (optional)
2. Configure monitoring and alerts
3. Set up CI/CD for automatic deployments
4. Add error tracking (e.g., Sentry)

---

## Support

If you encounter issues:
1. Check the logs in both Vercel and Render dashboards
2. Verify all environment variables are set correctly
3. Test the backend API directly using Postman or curl
4. Check browser console for frontend errors

