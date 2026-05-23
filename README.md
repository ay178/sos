# RoadSoS AI — Golden Hour Intelligence System

Full-stack Next.js application that coordinates emergency response after road accidents by optimising the entire golden-hour chain: SOS trigger → AI severity analysis → TRS hospital scoring → ambulance dispatch → family notification.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router, React 18, Tailwind CSS |
| Backend | Next.js API routes (serverless) |
| Database | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| SMS / WhatsApp | Twilio |
| Deploy | Vercel |

---

## Project structure

```
roadsos/
├── app/
│   ├── page.tsx                  # Main mobile SOS app (all 6 phases)
│   ├── hospital/page.tsx         # Hospital admin dashboard
│   ├── tracking/[id]/page.tsx    # Family live tracking page
│   ├── auth/page.tsx             # Login / signup
│   ├── globals.css
│   ├── layout.tsx
│   └── api/
│       ├── analyze/route.ts      # Claude AI severity analysis
│       ├── trs/route.ts          # Hospital TRS scoring engine
│       ├── dispatch/route.ts     # Dispatch + alert + notify
│       ├── sos/route.ts          # Create incident record
│       └── profile/route.ts     # User medical profile CRUD
├── lib/
│   ├── supabase.ts               # Client / server / service Supabase clients
│   ├── trs.ts                    # Trauma Readiness Score engine
│   └── notify.ts                 # Twilio SMS + WhatsApp helpers
├── types/index.ts                # Shared TypeScript types
├── supabase/migrations/
│   └── 001_schema.sql            # Full DB schema + seed data
└── public/
    └── manifest.json             # PWA manifest
```

---

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/your-org/roadsos-ai
cd roadsos-ai
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/migrations/001_schema.sql`
3. Copy your **Project URL** and **anon key** from Project Settings → API

### 3. Anthropic

1. Get your API key at [console.anthropic.com](https://console.anthropic.com)

### 4. Twilio (for real SMS/WhatsApp alerts)

1. Create account at [twilio.com](https://twilio.com)
2. Get a phone number with SMS capability
3. For WhatsApp, join the Twilio Sandbox: send `join <your-word>` to `+1 415 523 8886`

### 5. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Pages

| Route | Description |
|---|---|
| `/` | Mobile SOS app — full 6-phase flow |
| `/hospital` | Hospital admin dashboard |
| `/tracking/:id` | Family live tracking (shareable link) |
| `/auth` | Login / signup |

---

## API endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/sos` | Create incident record |
| `POST` | `/api/analyze` | AI severity analysis via Claude |
| `POST` | `/api/trs` | Rank hospitals by Trauma Readiness Score |
| `POST` | `/api/dispatch` | Dispatch ambulance, alert hospital, notify family |
| `GET/POST` | `/api/profile` | User medical profile CRUD |

---

## TRS scoring formula

The Trauma Readiness Score weights five factors based on incident severity:

| Factor | Critical | Serious | Minor |
|---|---|---|---|
| ICU availability | 30% | 25% | 10% |
| Trauma capability | 30% | 25% | 15% |
| Blood supply match | 15% | 15% | 10% |
| Distance | 10% | 15% | 30% |
| Traffic / ETA | 15% | 20% | 35% |

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add all environment variables in Vercel project settings → Environment Variables.

---

## Extending

- **Add real GPS**: Replace the hardcoded `28.5672, 77.2100` coordinates with `navigator.geolocation.getCurrentPosition()`
- **Add photo upload**: Use Supabase Storage to upload accident photos, pass the URL to the AI analysis
- **Real ambulance tracking**: Integrate with ambulance GPS API and update `incidents.ambulance_lat/lng` via realtime subscription
- **Hospital Realtime**: Subscribe to `hospital_alerts` table in the hospital dashboard for live push alerts
- **Push notifications**: Add web push (VAPID) so family members get browser notifications even when the page is closed
