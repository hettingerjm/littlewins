# ⭐ Little Wins

A small, **private** daily chore & practice tracker for one family with two
children — **Emma** and **Sophia**. Kids check off their tasks, earn points,
build daily streaks, and request rewards. Parents manage everything from a
login-protected dashboard.

> This app is intentionally single-family and two-children only. There is no
> multi-family support, and no child email accounts are ever created.

Built with **React + TypeScript + Vite**, **Tailwind CSS**, **Firebase Auth**,
**Cloud Firestore**, and deployed to **Firebase Hosting** via **GitHub Actions**.

---

## How it works

### Kids
1. **Landing page** asks for a simple family **PIN**.
2. After the PIN, two large profile buttons appear: **Emma** and **Sophia**.
3. A child's home shows **today's tasks**, **progress**, **points today**,
   **total points**, and the **current daily streak**.
4. Checking a task writes a Firestore **completion record** for that
   child + task + date. A task can't be completed twice for the same day
   (enforced by a deterministic document id _and_ security rules).
5. The **Rewards** page lists available rewards and their point costs; a child
   can **request** one. Requests start as **pending** until a parent decides.

### Parents
- Sign in with **Google** (only allow-listed emails get parent access).
- **Today:** live progress for both children.
- **History:** browse completions by child and date (and undo records).
- **Tasks:** add / edit / deactivate / reorder. Each task has a title,
  category, minutes, points, schedule type, active status, optional link URL,
  and applies to Emma, Sophia, or both.
- **Rewards:** add / edit rewards.
- **Claims:** approve / fulfill / deny reward requests.

### Sounds & animations
The kids' screens are playful: a chime when a task is checked, a triumphant
fanfare **and confetti** when the whole day is finished, a sparkle when a reward
is requested, plus springy pops, a flickering streak flame, and staggered card
entrances. All sounds are **synthesized at runtime via the Web Audio API** — no
audio files, no network requests, works offline. There's a 🔊/🔇 toggle on every
kid screen (saved in `localStorage`), and confetti respects
`prefers-reduced-motion`. See [`src/lib/sound.ts`](./src/lib/sound.ts) and
[`src/lib/confetti.ts`](./src/lib/confetti.ts).

### Streak rule
A child's daily streak increases when **all required active tasks scheduled for
that child that day** are completed. Missing a day resets the streak. Days with
no scheduled tasks are neutral and bridge the streak (e.g. a weekend for a
weekday-only task).

---

## Security model

There are **no Cloud Functions**. Access is enforced entirely by Firestore
rules ([`firestore.rules`](./firestore.rules)):

| Who | How they authenticate | What they can do |
| --- | --- | --- |
| **Public** (no auth) | — | **Nothing.** Default deny. |
| **Child** | Anonymous auth, granted **only after the family PIN** is entered | Read tasks/rewards; **create** completions and **create pending** reward claims. Cannot edit tasks/rewards, change a claim's status, or overwrite/delete completions. |
| **Parent** | Google sign-in, email on the allow-list | Everything: manage tasks & rewards, approve/fulfill claims, correct history. |

- A **child** is detected as the `anonymous` sign-in provider; a **parent** is a
  Google account whose **verified email is on the allow-list** in both
  `firestore.rules` (`parentEmails()`) and the app (`VITE_PARENT_EMAILS`). Any
  Google account can *authenticate*, but only allow-listed emails get any
  access — a non-listed account has no powers at all.
- Completion writes are validated against the referenced task (must be active,
  assigned to that child, and award exactly the task's points) so a child can't
  mint arbitrary points.
- **No sensitive personal information** is stored. Documents hold only the two
  fixed profile ids (`emma`/`sophia`), task/reward metadata, dates, and points.

### ⚠️ About the PIN
`VITE_FAMILY_PIN` is baked into the public JS bundle at build time, so it is
**not a real secret** — it's a friction gate so casual visitors can't poke at
the kids' screens. The real security boundary is: every read/write requires
authentication, and all parent actions require an allow-listed Google account.
Rotate the
PIN by changing the secret and redeploying. If you later want the PIN itself
enforced server-side, add a callable Cloud Function that verifies it and mints a
custom claim.

---

## Local development

### 1. Create a Firebase project
- In the [Firebase console](https://console.firebase.google.com/): create a
  project, add a **Web app**, and copy the config values.
- Enable **Authentication → Sign-in method → Anonymous** and **Google**.
- Create your **Cloud Firestore** database (production mode).
- Add your parent Google email to the allow-list in **two** places:
  `VITE_PARENT_EMAILS` (`.env`) and `parentEmails()` in
  [`firestore.rules`](./firestore.rules).

### 2. Configure env
```bash
cp .env.example .env
# fill in VITE_FIREBASE_*, choose a VITE_FAMILY_PIN, set VITE_PARENT_EMAILS
```

### 3. Install & run
```bash
npm install
npm run dev
```

### 4. Seed the initial tasks
The seed script uses the **Admin SDK** (bypasses rules), so it needs a
service-account key — the same one used for deploys (Firebase console → Project
settings → Service accounts → *Generate new private key*):
```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json npm run seed
```
(Add `--force` to re-seed even if tasks already exist.) You can also add tasks
manually from the parent **Tasks** tab.

### Optional: emulators
```bash
npm run emulators   # Auth + Firestore + Hosting + UI
```

---

## Deploying

Deploys are automated with GitHub Actions
([`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)): every push
to `main` type-checks, builds, and deploys **Hosting + Firestore rules +
indexes**.

### One-time setup
1. Push this repo to GitHub.
2. Install the Firebase CLI locally and set your project id in
   [`.firebaserc`](./.firebaserc) (replace `your-project-id`).
3. Create a **service account** with deploy permissions:
   - Firebase console → Project settings → Service accounts → *Generate new
     private key* (or a GCP service account with the **Firebase Hosting Admin**,
     **Cloud Datastore** / Firestore, and **Firebase Authentication Viewer**
     roles).
4. Add these **GitHub Actions secrets** (Settings → Secrets and variables →
   Actions):

   | Secret | Value |
   | --- | --- |
   | `FIREBASE_SERVICE_ACCOUNT` | The full service-account JSON |
   | `VITE_FIREBASE_API_KEY` | from web config |
   | `VITE_FIREBASE_AUTH_DOMAIN` | from web config |
   | `VITE_FIREBASE_PROJECT_ID` | from web config |
   | `VITE_FIREBASE_STORAGE_BUCKET` | from web config |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | from web config |
   | `VITE_FIREBASE_APP_ID` | from web config |
   | `VITE_FAMILY_PIN` | the family PIN |
   | `VITE_PARENT_EMAILS` | comma-separated parent Google emails (match `parentEmails()` in the rules) |

5. Push to `main`. The site deploys to Firebase Hosting and the rules go live.

### Manual deploy
```bash
npm run build
npx firebase-tools deploy --only hosting,firestore:rules,firestore:indexes --project <your-project-id>
```

---

## Project structure

```
src/
  config.ts            Fixed children (Emma/Sophia) + family PIN source
  firebase.ts          Firebase app init
  types.ts             Shared domain types
  lib/
    dates.ts           Local-day helpers (YYYY-MM-DD)
    schedule.ts        Which tasks apply on a given day
    points.ts          Points earned / spent / balance
    streak.ts          Daily streak computation
    db.ts              Firestore collection refs + mutations
  hooks/data.ts        Realtime Firestore subscriptions
  context/AuthContext  PIN → anonymous, parent Google sign-in (allow-list)
  components/          UI primitives + route guards
  pages/               Child screens + parent/ dashboard screens
firestore.rules        Security rules (the real access boundary)
scripts/seed.ts        Seed initial tasks + sample rewards
```
