# Voiceover Studio — Deploy to GitHub Pages

## Local Development

```bash
cd voiceover-studio
npm run dev
# Opens at http://localhost:3000
```

## Deploy to GitHub Pages (One-time setup)

### Step 1 — Push to GitHub

```bash
cd voiceover-studio
git init
git add .
git commit -m "Initial commit: Voiceover Studio"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/voiceover-studio.git
git push -u origin main
```

### Step 2 — Enable GitHub Pages

1. Go to your repo on GitHub
2. Settings → Pages
3. Source: **GitHub Actions**
4. Save

### Step 3 — Push triggers auto-deploy

Every push to `main` automatically builds and deploys.

Your app will be live at:
`https://YOUR_USERNAME.github.io/voiceover-studio/`

---

## Access on Mobile (While Dev Server Running)

Your phone and computer must be on same WiFi.

Open on phone:
`http://192.168.29.92:3000`

(IP shown in terminal when dev server starts)

---

## File Structure

```
voiceover-studio/
├── app/
│   ├── page.tsx          ← App entry point
│   ├── layout.tsx        ← HTML shell
│   └── globals.css       ← Global styles
├── components/
│   ├── ScriptSetup.tsx   ← Paste & prepare script
│   ├── Studio.tsx        ← Main teleprompter + recorder
│   └── VideoReview.tsx   ← Preview & download
├── hooks/
│   ├── useCamera.ts      ← Webcam access
│   ├── useMediaRecorder.ts ← Video recording
│   └── useTeleprompter.ts  ← Scroll engine
├── lib/
│   └── scriptParser.ts   ← Scene detection
└── .github/workflows/
    └── deploy.yml        ← GitHub Pages CI/CD
```
