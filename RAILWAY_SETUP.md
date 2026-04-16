# Family Budget — Full-Stack Deployment Guide (Railway)

## What Changed From the Original

| File | Change |
|------|--------|
| `js/api.js` | **NEW** — REST client (`apiLoadData`, `apiSaveData`) |
| `js/state.js` | `loadAppData()` is now **async**, tries server first, then localStorage fallback |
| `js/app.js` | `init()` is now **async** so it can `await loadAppData()` |
| `index.html` | Adds `<script src="js/api.js">` **before** `state.js` |
| Everything else | Unchanged — all original UI, modals, PWA behaviour preserved |

---

## Project Structure

```
family-budget-app/
├── Dockerfile                          # Multi-stage build (JDK 21 → JRE 21)
├── railway.toml                        # Railway config (health check, restart)
├── mvnw                                # Maven wrapper (no local Maven needed)
├── pom.xml                             # Spring Boot 3.2 + PostgreSQL + JPA
└── src/
    └── main/
        ├── java/com/familybudget/
        │   ├── FamilyBudgetApplication.java      # @SpringBootApplication entry
        │   ├── config/
        │   │   ├── SecurityConfig.java           # Spring Security (CSRF off for API)
        │   │   └── WebConfig.java                # Serve static SPA assets
        │   ├── controller/
        │   │   └── BudgetController.java         # GET /api/data, PUT /api/data, GET /api/health
        │   ├── exception/
        │   │   └── GlobalExceptionHandler.java   # Clean JSON error responses
        │   ├── model/
        │   │   └── AppDataEntity.java            # JPA entity with JSONB column
        │   ├── repository/
        │   │   └── AppDataRepository.java        # Spring Data JPA
        │   └── service/
        │       └── BudgetService.java            # Load/save business logic
        └── resources/
            ├── application.properties            # Local dev (H2 in-memory)
            ├── application-prod.properties       # Railway prod (PostgreSQL)
            └── static/                           # Served as-is by Tomcat
                ├── index.html
                ├── manifest.json
                ├── sw.js
                ├── css/styles.css
                ├── icons/icon.svg
                └── js/
                    ├── api.js      ← NEW
                    ├── data.js
                    ├── utils.js
                    ├── state.js    ← MODIFIED
                    ├── render.js
                    ├── modals.js
                    ├── receipt.js
                    ├── pin.js
                    └── app.js      ← MODIFIED (async init)
```

---

## REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health probe — always returns `{"status":"ok"}` |
| `GET` | `/api/data` | Load AppData JSON (`204` if none exists yet) |
| `PUT` | `/api/data` | Save full AppData JSON |

The frontend's `AppData` shape is stored verbatim as a PostgreSQL `JSONB` column, so zero schema migrations are needed when the frontend data structure evolves.

---

## Deploying to Railway — Step by Step

### Prerequisites
- A [Railway account](https://railway.app) (free tier works)
- Git installed locally

---

### Step 1 — Push to GitHub

```bash
cd family-budget-app
git init
git add .
git commit -m "Initial full-stack family budget app"
# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/family-budget-app.git
git push -u origin main
```

---

### Step 2 — Create a New Railway Project

1. Go to [railway.app](https://railway.app) → **New Project**
2. Choose **Deploy from GitHub repo**
3. Select your `family-budget-app` repository
4. Railway detects the `Dockerfile` automatically and begins the first build

---

### Step 3 — Add a PostgreSQL Database

1. In your Railway project dashboard click **+ New**
2. Choose **Database → PostgreSQL**
3. Railway provisions the DB and injects `DATABASE_URL` automatically into
   all services in the same project — no copy-pasting needed

---

### Step 4 — Set Environment Variables

In **your Spring Boot service → Variables**, add:

| Variable | Value |
|----------|-------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `PORT` | `8080` *(Railway sets this automatically — you can skip it)* |

> `DATABASE_URL` is injected automatically by the PostgreSQL plugin.
> You do **not** need to set it manually.

---

### Step 5 — Deploy

Railway redeploys automatically when you push to `main`.
To trigger a manual deploy: **Deployments → Redeploy**.

Watch the build log — you should see:

```
Started FamilyBudgetApplication in X.XXX seconds
```

---

### Step 6 — Open the App

Railway assigns a public URL like `https://family-budget-app-production.up.railway.app`.

Click it — your app is live. Both phones can now open the same URL and all
data syncs through the database automatically.

---

## Running Locally

```bash
# No local PostgreSQL needed — uses H2 in-memory DB
./mvnw spring-boot:run
```

Open `http://localhost:8080` — the full app runs locally.

H2 console available at `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:mem:familybudget`
- User: `sa`, Password: *(empty)*

---

## How Data Sync Works

```
Phone A  ──PUT /api/data──►  PostgreSQL (Railway)  ◄──GET /api/data──  Phone B
                                      │
                              (single source of truth)
```

1. **On load**: `state.js` calls `GET /api/data` → populates `AppData`
2. **On any change**: `saveAppData()` writes to `localStorage` immediately
   (instant UI feedback), then fires `PUT /api/data` 300 ms later
3. **Offline fallback**: if the server is unreachable, data is safe in
   `localStorage` and syncs on the next successful save

---

## Production Hardening Checklist

- [ ] Add HTTP Basic or JWT auth to `/api/**` if the URL is shared publicly
      (edit `SecurityConfig.java`)
- [ ] Enable Railway's **Private Networking** to keep the DB off the public internet
- [ ] Set up Railway's **Usage Limits** to avoid unexpected charges
- [ ] Add a custom domain via **Settings → Domains**
- [ ] Review Railway's **automatic HTTPS** — it's on by default (no extra config)

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails: `mvnw: Permission denied` | Run `git update-index --chmod=+x mvnw` then re-push |
| `DATABASE_URL` not found | Make sure PostgreSQL plugin is in the **same Railway project** |
| App starts but data doesn't persist | Check `SPRING_PROFILES_ACTIVE=prod` is set |
| 403 on `/api/data` | Check `SecurityConfig.java` — ensure `/api/**` is permitted |
| H2 console shows no tables locally | Hibernate creates them on first request — make one API call first |
