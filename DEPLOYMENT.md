# Deploying to Render

This project is fully configured for zero-friction 1-click deployment on **[Render](https://render.com/)** using Docker.

## Automated Deployment with Blueprint (`render.yaml`)

1. **Sign in to Render**: Go to [dashboard.render.com](https://dashboard.render.com/) (sign in with your GitHub account `rohitgupta1234-gif`).
2. **New Blueprint**:
   - Click **New +** in the top right.
   - Select **Blueprint**.
   - Connect your repository: `rohitgupta1234-gif/Handwritten-Assignment-Generator`.
3. **Deploy**:
   - Render will automatically read `render.yaml` and configure the Web Service with Docker, Chromium, and health check probes (`/health/ready`).
   - Click **Apply**.
   - Your service will build and deploy at `https://handwritten-assignment-generator.onrender.com`.

---

## Manual Web Service Creation (Alternative)

If you prefer setting it up manually:

1. In Render Dashboard, click **New +** -> **Web Service**.
2. Select your repository `rohitgupta1234-gif/Handwritten-Assignment-Generator`.
3. Configure the following:
   - **Name**: `handwritten-assignment-generator`
   - **Language**: `Docker`
   - **Region**: Oregon (or your preferred region)
   - **Branch**: `main`
   - **Plan**: `Free`
4. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
   - `JWT_SECRET` = (Generate a random 32+ character secret)
   - `JWT_REFRESH_SECRET` = (Generate a random 32+ character secret)
   - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` = `true`
   - `PUPPETEER_EXECUTABLE_PATH` = `/usr/bin/chromium`
5. Click **Create Web Service**.
