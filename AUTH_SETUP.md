# Cargo Fleet — Auth Setup Guide

## 1. MySQL

### Create the database

```sql
CREATE DATABASE cargo_fleet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Backend `.env.local`

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=cargo_fleet

JWT_ACCESS_SECRET=your_random_secret
AUTH_SECRET=your_random_secret
```

Or use a single URL:

```env
MYSQL_URL=mysql://root:password@localhost:3306/cargo_fleet
```

### Seed auth tables + demo user

```bash
cd backend
npm run dev
```

Then visit: `http://localhost:3000/api/v1/auth/seed`

**Demo login:** `demo@cargo.io` / `password123`

---

## 2. SMTP (Forgot Password)

### Gmail example

1. Enable 2FA on your Google account
2. Create an **App Password**: Google Account → Security → App passwords
3. Add to `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="Cargo Fleet <you@gmail.com>"
APP_NAME=Cargo Fleet
```

### Other providers

| Provider | SMTP_HOST | Port |
|----------|-----------|------|
| Gmail | smtp.gmail.com | 587 |
| Outlook | smtp.office365.com | 587 |
| SendGrid | smtp.sendgrid.net | 587 |
| Mailgun | smtp.mailgun.org | 587 |

### API endpoints

- `POST /api/v1/auth/forgot-password` — `{ "email": "user@example.com" }`
- `POST /api/v1/auth/reset-password` — `{ "email": "...", "code": "123456", "password": "newpass" }`

User receives a **6-digit code** by email (valid 1 hour).

---

## 3. Google Sign-In

### Step 1 — Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select existing)
3. **APIs & Services → OAuth consent screen**
   - User type: External (for testing) or Internal
   - Add app name, support email
   - Add scopes: `email`, `profile`, `openid`
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**

Create **three** client IDs:

| Type | Used for |
|------|----------|
| **Web application** | Backend token verification + Expo web |
| **Android** | Android app (needs SHA-1 fingerprint) |
| **iOS** | iOS app (needs bundle ID) |

### Step 2 — Android SHA-1 fingerprint

For dev builds:

```bash
cd mobile_app
npx expo run:android
```

Get SHA-1:

```bash
# Windows (debug keystore)
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA-1** into your Android OAuth client in Google Cloud Console.

Package name: `com.anonymous.tempfixproject` (from `app.json` → `android.package`)

### Step 3 — Backend `.env.local`

```env
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

The backend verifies the `idToken` against this **Web client ID**.

### Step 4 — Mobile `.env`

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
```

### Step 5 — Rebuild mobile app

Google Sign-In requires a **development build** (not Expo Go):

```bash
cd mobile_app
npx expo run:android
```

### How it works

1. Mobile opens Google OAuth via `expo-auth-session`
2. Google returns an `idToken`
3. Mobile sends `{ idToken }` to `POST /api/v1/auth/google`
4. Backend verifies token with Google, creates/links user, returns JWT session

---

## 4. Mobile API URL

| Environment | EXPO_PUBLIC_API_URL |
|-------------|---------------------|
| Android emulator | `http://10.0.2.2:3000` |
| iOS simulator | `http://localhost:3000` |
| Physical device | `http://YOUR_PC_IP:3000` |

PC and phone must be on the same Wi‑Fi network.

---

## 5. Install dependencies

```bash
# Backend
cd backend
npm install

# Mobile
cd mobile_app
npm install
npx expo run:android
```
