# 🪑 Midas Furniture — Ads Intelligence Monitor

Automated competitor intelligence agent for Midas Furniture.
Monitors **60 competitors** across **Saudi Arabia · Qatar · Kuwait** daily via the Meta Ad Library API.

---

## Features

- 📊 **60 competitors** — 20 per market (KSA, Qatar, Kuwait)
- 📸 **Daily screenshots** — all active ads per competitor
- ⭐ **KSA priority clients** — IKEA, Pan Emirates, Home Centre processed first
- 📅 **Date-indexed archive** — `reports/index.html` — one page, all history
- ⏰ **Scheduled at 09:00 GST** — Gulf peak-hour automation
- 🔔 **Slack alerts** — run summary after every job
- 🐳 **Docker ready** — one command deploy

---

## Quick Start

```bash
# 1. Install
npm install
npx playwright install chromium

# 2. Configure
cp .env.example .env
# → Set META_ACCESS_TOKEN in .env

# 3. Run once (all markets)
npm run run:once

# 4. Run single market
npm run run:once -- --country=KSA

# 5. Start daily daemon (09:00 GST)
npm run build
node dist/index.js
```

---

## Docker

```bash
docker compose up -d
docker logs -f midas-ads-monitor
```

---

## Output Structure

```
screenshots/
├── KSA/
│   └── 2026-03-24/
│       ├── IKEA_Saudi_Arabia/
│       │   ├── metadata.json     ← ad IDs, spend, impressions
│       │   ├── ad_001_xxx.png
│       │   └── ad_012_xxx.png
│       └── ...20 competitors
├── Qatar/
└── Kuwait/

reports/
├── index.html                       ← master date index (open this)
├── midas_gulf_report_2026-03-24.html
└── 2026-03-24_run_xxx.json
```

---

## Schedule Modes

| Mode | Time GST | Cron (UTC) |
|---|---|---|
| `MORNING_PEAK` | 09:00 | `0 5 * * *` |
| `EVENING_PEAK` | 21:00 | `0 17 * * *` |
| `OFF_PEAK` | 03:00 | `0 23 * * *` |

Set via `SCHEDULE_MODE=MORNING_PEAK` in `.env`

---

## Meta API Token Setup

1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App
2. Add **Marketing API** product → enable `ads_read`
3. **Switch app to Live mode** (Development mode causes error 100/33)
4. Generate System User token in Business Manager (never expires)
5. Paste into `.env` as `META_ACCESS_TOKEN=`

---

## Environment Variables

```bash
META_ACCESS_TOKEN=          # Required — Meta Ad Library API token
META_API_VERSION=v21.0
SCREENSHOTS_BASE_DIR=./screenshots
REPORTS_DIR=./reports
CRON_SCHEDULE=0 5 * * *    # 09:00 GST
SCHEDULE_MODE=MORNING_PEAK
MAX_ADS_PER_COMPETITOR=50
HEADLESS=true
KSA_PRIORITY_CLIENTS=IKEASaudiArabia,PanEmiratesFurniture,homecentreSA
SLACK_WEBHOOK_URL=          # Optional
NODE_ENV=production
```

---

## Tech Stack

- **TypeScript** strict mode
- **Playwright** — browser automation + screenshots
- **Meta Ad Library API** — official transparency API
- **node-cron** — Gulf timezone scheduling
- **Zod** — runtime validation
- **Winston** — structured logging
- **Docker** — containerized deployment

---

## Markets

| Market | Country Code | Competitors |
|---|---|---|
| 🇸🇦 Saudi Arabia | SA | 20 (3 priority) |
| 🇶🇦 Qatar | QA | 20 |
| 🇰🇼 Kuwait | KW | 20 |

---

*Built for Midas Furniture competitive intelligence — Gulf markets*
