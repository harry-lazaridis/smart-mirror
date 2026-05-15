# Deployment (Firebase Hosting + Functions)

This setup deploys:
- Frontend (`client/dist`) to Firebase Hosting
- Backend Express API to Firebase Functions via a Hosting rewrite for `/api/**`

## 1) Prerequisites

- Firebase project created
- Billing enabled (required for many external outbound API calls from Functions)
- Firebase CLI installed and logged in

```bash
npm install -g firebase-tools
firebase login
```

## 2) Project config

Update `.firebaserc`:

```json
{
  "projects": {
    "default": "YOUR_FIREBASE_PROJECT_ID"
  }
}
```

## 3) Install backend deps for Functions

From repo root:

```bash
npm install --prefix server
```

## 4) Configure Functions environment

Create `server/.env` with:

```env
CLIENT_URL=https://YOUR_PROJECT_ID.web.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://YOUR_PROJECT_ID.web.app/api/auth/google/callback
OPEN_WEATHER_API=...
```

Optional for local/non-Firebase-admin initialization:

```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 5) Build frontend

```bash
npm run build --prefix client
```

## 6) Deploy both frontend + backend

```bash
firebase deploy --only hosting,functions
```

## 7) Configure Google OAuth redirect URI

In Google Cloud Console OAuth client settings, add:

- `https://YOUR_PROJECT_ID.web.app/api/auth/google/callback`

If you also use the `firebaseapp.com` domain, add:

- `https://YOUR_PROJECT_ID.firebaseapp.com/api/auth/google/callback`

## 8) Verify

```bash
curl https://YOUR_PROJECT_ID.web.app/api/health
```

Expected:

```json
{"status":"ok"}
```

## Notes

- API routes are available under `/api/*` and are rewritten to the `api` function.
- File uploads in Functions use `/tmp` storage (ephemeral), which is compatible with Cloud Functions.
- If you use a custom Hosting domain, set `CLIENT_URL` and `GOOGLE_REDIRECT_URI` to that domain.
