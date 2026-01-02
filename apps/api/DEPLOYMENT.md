# GymBuddy API Deployment Guide

## 🚀 Deploy to Render.com

### Step 1: Create Supabase Database

1. Go to https://supabase.com
2. Create a new project
3. Go to **Settings** → **Database**
4. Copy the **Connection string** (URI format)
   - It looks like: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

### Step 2: Deploy to Render

1. Go to https://render.com
2. Sign up with GitHub
3. Click **New** → **Web Service**
4. Connect your GitHub repository
5. Configure:
   - **Name**: `gymbuddy-api`
   - **Root Directory**: `apps/api`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm start`

### Step 3: Add Environment Variables

In Render dashboard, add these environment variables:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Supabase connection string |
| `JWT_SECRET` | A random secret string (min 32 chars) |
| `NODE_ENV` | `production` |

### Step 4: Deploy!

Click **Create Web Service** and wait for deployment.

Your API will be available at: `https://gymbuddy-api.onrender.com`

## 📱 Update Mobile App

After deployment, update the API URL in the mobile app:

1. Create a file `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://gymbuddy-api.onrender.com
```

2. Restart Expo: `npx expo start --clear`

## 🌱 Seed the Database

After first deployment, seed the database:

```bash
# In apps/api folder, with DATABASE_URL set
npx prisma db push
npm run db:seed
```



