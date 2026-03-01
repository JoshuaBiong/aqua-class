# 🌊 AquaClass — Setup Guide

A classroom where every assignment is a fish swimming in your aquarium.
Teachers create aquariums, students dive in.

---

## STEP 1 — Run the database SQL (one time only)

1. Go to your [Supabase SQL Editor](https://supabase.com/dashboard/project/kmuiodfffvvrxyhgwaex/sql/new)
2. Copy the entire contents of **supabase_setup.sql**
3. Paste it and click **Run**
4. You should see "Success. No rows returned."

That creates all 6 tables, RLS policies, storage bucket, and realtime.

---

## STEP 2 — Set up Auth (one time only)

In your Supabase dashboard:
1. Go to **Authentication → Providers → Email**
2. Make sure **Enable Email Signup** is ON
3. For easy testing, turn OFF **Confirm email** (so users don't need to verify)
   - Go to Authentication → Email Templates → uncheck "Enable email confirmations"

---

## STEP 3 — Configure environment variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## STEP 4 — Run the app locally

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm run dev
```

Open http://localhost:5173 in your browser.

---

## STEP 5 — Deploy to the public (Vercel — free)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow the prompts:
# - Set up project? Y
# - Which scope? (your account)
# - Link to existing? N
# - Project name: aquaclass
# - In which directory? ./
# - Override settings? N
```

> **Note:** Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
> Environment Variables in the Vercel dashboard under Project Settings → Environment Variables.

Your app will be live at something like: **https://aquaclass.vercel.app** 🎉

---

## File structure

```
aquaclass/
├── index.html
├── vite.config.ts
├── package.json
├── .env.example             ← copy to .env and fill in credentials
├── supabase_setup.sql       ← run once in Supabase SQL Editor
├── eslint.config.js
├── public/
│   └── vite.svg
└── src/
    ├── main.jsx
    └── AquariumClassroom.jsx
```

---

## How it works (Supabase powered)

| Feature | How |
|---------|-----|
| Auth | Supabase email/password — real accounts, sessions persist |
| Rooms/Aquariums | Stored in `rooms` table |
| Students joining | `room_members` table |
| Assignments (fish) | `assignments` table |
| Todo items | `todos` table |
| File submissions | Uploaded to `submissions` storage bucket, metadata in `submissions` table |
| Live updates | Supabase Realtime — teacher sees student submissions instantly |
| Security | Row Level Security — teachers only see their rooms, students only see enrolled rooms |

---

## Testing the full flow

1. Register as a **Teacher** → create an aquarium → note the room code
2. Register as a **Student** (different browser/incognito) → join with the room code
3. Teacher adds assignments + todos
4. Student dives in, clicks fish, uploads files to todos
5. Teacher sees submissions appear in real time ✨
# aqua-class
