# Fix for Render Deployment Error

## Error Message
```
Service Root Directory "/opt/render/project/src/server" is missing.
builder.sh: line 51: cd: /opt/render/project/src/server: No such file or directory
```

## Solution

Render is trying to look for your files in a `/server` subdirectory, but your project files are in the root directory.

### Option 1: Fix in Render Dashboard (Recommended)

1. Go to your Render service dashboard
2. Click on **Settings** tab
3. Scroll down to **Service Root Directory**
4. **Clear the field** (leave it empty) or set it to `.`
5. Click **Save Changes**
6. Render will automatically redeploy

### Option 2: Use render.yaml (Already Updated)

The `render.yaml` file has been updated with `rootDir: .` which tells Render to use the root directory.

If you're using the Blueprint (render.yaml):
1. Make sure `render.yaml` is in your repository root
2. When creating the service, select **"Apply existing blueprint"** instead of manual setup
3. Render will read the `render.yaml` file and use the correct root directory

### Option 3: Manual Fix During Service Creation

When creating a new service:
1. After selecting your repository
2. In the **Service Root Directory** field:
   - **Leave it EMPTY** (don't enter anything)
   - OR enter `.` (dot)
3. Do NOT enter `/server` or any subdirectory path

## Verify

After fixing, check the build logs:
- Should see: `cd /opt/render/project/src` (root directory)
- Should NOT see: `cd /opt/render/project/src/server`

## Current Project Structure

Your project structure is:
```
interview-chatbot/
├── server.js          ← Backend server (in root)
├── app.js            ← Frontend code
├── index.html        ← Frontend HTML
├── package.json      ← Dependencies
└── render.yaml       ← Render config
```

All files are in the root, so Root Directory should be empty or `.`


