# ⭐ Little Wins

A **private** daily chore & practice tracker for a small, invite-only set of
**friend families**. Kids check off their tasks, earn points, build daily
streaks, and request rewards. Parents manage everything from a Google-login
dashboard. Each family is fully isolated — one family can never see another's
data.

> This is intentionally **not** a public app. Families are provisioned by hand
> (see the admin CLI). No child email accounts are ever created.

Built with **React + TypeScript + Vite**, **Tailwind CSS**, **Firebase Auth**,
**Cloud Firestore**, and **one Cloud Function**, deployed to **Firebase
Hosting** via **GitHub Actions**.

---

## How it works

### Kids
1. Open the family link **`/f/<familyId>`** (or type the family code on the
   landing page).
2. Enter the **family PIN**. This is verified server-side by the `kidLogin`
   Cloud Function, which mints a login token stamped with that `familyId`.
3. Pick a profile, then see today's tasks, progress, points today, total
   points, and the current daily streak.
4. Check a task → a Firestore **completion** is written (one per
   child/task/day, enforced by a deterministic id + rules).
5. The **Rewards** page lists rewards and costs; a child can **request** one.
   Requests start **pending** until a parent decides.

### Parents
- Sign in with **Google** (must be an invited email for the family).
- **Today**, **History** (by child & date), **Tasks** (add/edit/deactivate/
  reorder, assign to any kids), **Rewards**, **Claims** (approve/fulfill/deny),
  and **Kids** (add/edit child profiles, emoji + color theme).

### Streak rule
A child's daily streak increases when **all required active tasks scheduled for
that child that day** are completed. Missing a day resets it. Days with no
scheduled tasks are neutral and bridge the streak.

---

## Architecture

Everything lives under `/families/{familyId}/…`:

```
families/{familyId}                  { name, createdAt }
families/{familyId}/private/auth     { pinHash, pinSalt, ... }   # never client-readable
families/{familyId}/children/{id}    { name, emoji, theme, order }
families/{familyId}/tasks/{id}       { title, category, minutes, points, scheduleType, active, order, assignedTo[], linkUrl? }
families/{familyId}/completions/{id} { childId, taskId, date, points, ... }   # id = childId_taskId_date
families/{familyId}/rewards/{id}     { title, description?, cost, active, order }
families/{familyId}/rewardClaims/{id}{ childId, rewardId, cost, status, ... }
parentInvites/{email}                { familyId }   # who may become a parent
```

### Security model
Every signed-in user carries custom claims set server-side:

| Who | Auth | Claims | Can do |
| --- | --- | --- | --- |
| **Public** | — | — | Nothing (default deny) |
| **Child** | custom token from `kidLogin` after the PIN | `{ familyId, role: 'child' }` | Read their family's tasks/rewards; create completions + pending claims |
| **Parent** | Google sign-in | `{ familyId, role: 'parent' }` (set by `syncParentClaims` from the invite list) | Full control **within their family** |

Rules scope **every** read/write to `request.auth.token.familyId`, so families
are isolated. PINs are stored only as salted hashes in a private subcollection
no client can read; only the Admin SDK / Cloud Function touch them. The
`kidLogin` function rate-limits wrong PINs with a short lockout.

### Cloud Functions (`functions/`)
- **`kidLogin({ familyId, pin })`** — verifies the PIN, mints a child token.
- **`syncParentClaims()`** — on a parent's Google sign-in, looks them up in
  `parentInvites/{email}` and stamps their family/role claim.

---

## Provisioning families (admin CLI)

Run with a service-account key (`GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json`):

```bash
# Create a family with a PIN, kids, invited parents, and starter tasks/rewards
npm run admin -- add-family --id smith --name "Smith Family" --pin 1234 \
  --kids "Ava:🦊:pink,Leo:🚀:sky" \
  --parents "mom@gmail.com,dad@gmail.com" --seed

npm run admin -- set-pin     --id smith --pin 5678
npm run admin -- add-parents --id smith --parents "grandma@gmail.com"
npm run admin -- list
```

`--kids` entries are `Name:emoji:theme` (emoji/theme optional; themes:
pink, indigo, emerald, amber, sky, violet, rose, teal).

---

## Local development

1. **Firebase project** (one-time): enable **Authentication → Anonymous + Google**,
   create **Cloud Firestore** (production mode), and **upgrade to the Blaze
   plan** (required for Cloud Functions; free at this scale).
2. **Env**: `cp .env.example .env` and fill in the `VITE_FIREBASE_*` values.
3. **Install & run**: `npm install` then `npm run dev`.
4. **Functions deps**: `npm install --prefix functions`.
5. **Provision a family** with the admin CLI above.

Emulators: `npm run emulators` (Auth + Firestore + Functions + Hosting).

---

## Deploying

GitHub Actions ([`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml))
deploys **Hosting + Firestore rules + Functions** on every push to `main`.

Required GitHub secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | full service-account JSON |
| `VITE_FIREBASE_API_KEY` … `VITE_FIREBASE_APP_ID` | from the web app config |

The deploy service account needs roles: **Firebase Admin**, **Cloud Functions
Admin**, and **Service Account User** (functions deploy). Manual deploy:

```bash
npm run build
npx firebase-tools deploy --only hosting,firestore:rules,functions --project <project-id>
```

---

## Project structure

```
functions/src/index.ts   kidLogin + syncParentClaims (Admin SDK)
scripts/admin.ts          provision families / set PIN / migrate / list
src/
  config.ts               color themes
  types.ts                Family, Child, Task, Reward, Claim, SessionClaims
  lib/                     dates, schedule, points, streak, db (family-scoped), sound, confetti
  hooks/data.ts           realtime Firestore subscriptions (family-scoped)
  context/AuthContext      PIN→child token, Google→parent claims, mobile-safe sign-in
  pages/                   LandingHome, FamilyPin, ProfileSelect, ChildHome, Rewards
  pages/parent/            dashboard, history, tasks, rewards, claims, kids
firestore.rules           family-scoped security rules
```
