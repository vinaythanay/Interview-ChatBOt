# Quick Deployment Checklist

## 🚀 Fast Deployment Steps

### Backend (Render) - 5 minutes

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push
   ```

2. **Deploy on Render**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect GitHub and select your repo
   - Settings:
     - Name: `interview-chatbot-backend`
     - **Root Directory**: Leave empty or set to `.` (IMPORTANT!)
     - Build: `npm install`
     - Start: `npm start`
   - Environment Variables:
     - `NODE_ENV` = `production`
     - `PORT` = `10000`
     - `GEMINI_API_KEY` = `your_key_here`
   - Click "Create"
   - **Copy your backend URL** (e.g., `https://xxx.onrender.com`)

### Frontend (Vercel) - 3 minutes

1. **Update API URL in `index.html`**
   - Open `index.html`
   - Find line 13: `window.API_BASE_URL = '';`
   - Replace with: `window.API_BASE_URL = 'https://your-backend-url.onrender.com';`
   - Save and commit

2. **Deploy on Vercel**
   - Go to https://vercel.com/dashboard
   - Click "Add New..." → "Project"
   - Import your GitHub repo
   - Framework: "Other"
   - Click "Deploy"
   - **Done!** Your site is live

### ✅ Test

1. Visit your Vercel URL
2. Start an interview
3. Check browser console (F12) for errors
4. Verify AI questions are generated

---

## 🔧 Troubleshooting

**API not working?**
- Check `window.API_BASE_URL` in `index.html` matches your Render URL
- Verify Render backend is running (check `/health` endpoint)
- Check browser console for CORS errors

**Backend not starting?**
- Check Render logs
- Verify `GEMINI_API_KEY` is set correctly
- Ensure `PORT` is set to `10000`

---

## 📝 Notes

- Render free tier: Services sleep after 15 min inactivity (wakes in ~30 sec)
- Vercel free tier: Always on, perfect for frontend
- Update `index.html` API URL after backend deployment

