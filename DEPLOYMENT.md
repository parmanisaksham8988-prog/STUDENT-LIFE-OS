# 🚀 Student Life OS - Complete Deployment Guide

This guide provides simple, step-by-step instructions to deploy your **Student Life OS** project for free on the cloud.

---

## 🌟 Option 1: Free Unified Deployment on Render.com (Recommended)
This method runs both the **React Frontend** and **Python Flask Backend** together as a single web app on Render for free.

### Step 1: Push your code to GitHub
If you haven't initialized Git yet, run these commands in your project terminal:
```bash
git init
git add .
git commit -m "Production deployment ready"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### Step 2: Create Web Service on Render
1. Go to [https://render.com/](https://render.com/) and sign up / log in with GitHub.
2. Click **New +** $\to$ **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your `Student Life OS` repository.
4. Fill in the following settings:
   - **Name**: `student-life-os` *(or any name you choose)*
   - **Region**: Choose the closest region (e.g., *Singapore* or *Frankfurt*)
   - **Branch**: `main`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     bash build.sh
     ```
   - **Start Command**:
     ```bash
     gunicorn --chdir backend app:app
     ```
   - **Instance Type**: `Free`

### Step 3: Add Environment Variables
Under the **Environment Variables** section on Render, add:
- `PYTHON_VERSION`: `3.11.9`
- `JWT_SECRET`: `your_random_secret_key_here`
- *(Optional)* `GEMINI_API_KEY`: *(Your Google AI Studio API key if using live Gemini)*

5. Click **Create Web Service**.
6. Render will run `build.sh`, install all Python dependencies, compile the React frontend, and deploy your live site!
👉 Your website will be live at: `https://student-life-os-xxxx.onrender.com`

---

## ⚡ Option 2: Frontend on Vercel + Backend on Render

If you prefer deploying the frontend and backend on separate servers:

### Backend on Render:
- Follow Option 1 above, but set:
  - **Build Command**: `pip install -r backend/requirements.txt`
  - **Start Command**: `gunicorn --chdir backend app:app`
- Copy your Render backend URL: e.g. `https://student-os-backend.onrender.com`

### Frontend on Vercel:
1. Go to [https://vercel.com/](https://vercel.com/) and log in with GitHub.
2. Click **Add New...** $\to$ **Project** $\to$ Import your GitHub repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
4. Add **Environment Variable**:
   - Key: `VITE_API_URL`
   - Value: `https://student-os-backend.onrender.com/api`
5. Click **Deploy**. Vercel will give you a custom `.vercel.app` URL!

---

## 🐳 Option 3: Docker Deployment (Railway, Koyeb, or VPS)

A multi-stage `Dockerfile` is already included in the root directory.

### Build and Run locally or on any server:
```bash
docker build -t student-life-os .
docker run -d -p 5000:5000 --name student-os student-life-os
```
Visit `http://localhost:5000` in your browser.

---

## 🧪 Pre-Deployment Verification Checklist

- [x] `backend/requirements.txt` includes `gunicorn`
- [x] `build.sh` script installs backend dependencies and builds frontend
- [x] Flask serves `frontend/dist` static files and client routes fallback
- [x] Database auto-initializes on startup with default demo student
- [x] Dynamic API routing works both locally (`localhost:5173`) and in production (`/api`)
- [x] Production build passes with 0 errors (`npm run build`)
