-- ── Enable extensions ──────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";  -- for geo queries

-- ── Users / Medical profiles ────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  phone         text,
  blood_group   text,
  allergies     text[],
  conditions    text[],
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "users manage own profile"
  on public.profiles for all using (auth.uid() = id);

-- ── Emergency contacts ──────────────────────────────────────────────────
create table public.emergency_contacts (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid references public.profiles(id) on delete cascade,
  name        text not null,
  phone       text not null,
  relation    text,
  priority    int default 1,
  created_at  timestamptz default now()
);
alter table public.emergency_contacts enable row level security;
create policy "users manage own contacts"
  on public.emergency_contacts for all
  using (profile_id = auth.uid());

-- ── Hospitals ───────────────────────────────────────────────────────────
create table public.hospitals (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  address             text,
  city                text,
  phone               text,
  lat                 double precision not null,
  lng                 double precision not null,
  icu_beds_total      int default 0,
  icu_beds_available  int default 0,
  has_trauma_center   boolean default false,
  trauma_level        int,            -- 1 = highest capability
  has_blood_bank      boolean default false,
  blood_available     text[],         -- ['A+','O-', ...]
  or_rooms_available  int default 0,
  is_active           boolean default true,
  admin_email         text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
-- Seed some Delhi hospitals
insert into public.hospitals
  (name, address, city, lat, lng, icu_beds_total, icu_beds_available,
   has_trauma_center, trauma_level, has_blood_bank, blood_available,
   or_rooms_available, admin_email)
values
  ('AIIMS Trauma Centre',      'Ansari Nagar, New Delhi',   'New Delhi', 28.5672, 77.2100, 80, 12, true,  1, true, array['A+','A-','B+','B-','O+','O-','AB+','AB-'], 6, 'admin@aiims.edu'),
  ('Safdarjung Hospital',      'Safdarjung, New Delhi',     'New Delhi', 28.5685, 77.2057, 60,  4, true,  2, true, array['A+','B+','O+','O-'],                       4, 'admin@safdarjung.nic.in'),
  ('RML Hospital',             'Baba Kharak Singh Marg',    'New Delhi', 28.6261, 77.2088, 50,  8, true,  2, true, array['A+','B+','B-','O+'],                       3, 'admin@rml.nic.in'),
  ('Max Super Speciality',     'Saket, New Delhi',          'New Delhi', 28.5244, 77.2066, 40,  9, false, 3, true, array['A+','AB+','O+'],                           2, 'admin@maxhealthcare.in'),
  ('Apollo Hospital',          'Sarita Vihar, New Delhi',   'New Delhi', 28.5355, 77.2900, 45, 11, true,  2, true, array['A+','A-','B+','O+','O-'],                  3, 'admin@apollohospitals.com');

-- ── Incidents (SOS events) ──────────────────────────────────────────────
create table public.incidents (
  id                  uuid primary key default uuid_generate_v4(),
  reporter_id         uuid references auth.users(id),
  lat                 double precision not null,
  lng                 double precision not null,
  address             text,
  accident_type       text,
  victim_count        text,
  description         text,
  photo_url           text,
  severity_tier       text,           -- 'Critical' | 'Serious' | 'Minor'
  severity_score      int,            -- 1-10
  severity_confidence int,            -- 0-100
  ai_summary          text,
  ai_cv_finding       text,
  ai_nlp_finding      text,
  ai_location_finding text,
  selected_hospital_id uuid references public.hospitals(id),
  trs_scores          jsonb,          -- {hospital_id: score, ...}
  ambulance_dispatched boolean default false,
  ambulance_eta_min   int,
  status              text default 'active',  -- active|en_route|arrived|resolved
  hospital_alerted    boolean default false,
  family_notified     boolean default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
alter table public.incidents enable row level security;
create policy "reporters see own incidents"
  on public.incidents for select
  using (reporter_id = auth.uid());
create policy "reporters create incidents"
  on public.incidents for insert
  with check (reporter_id = auth.uid());
create policy "service role full access"
  on public.incidents for all
  using (auth.role() = 'service_role');

-- ── Notifications log ───────────────────────────────────────────────────
create table public.notifications (
  id           uuid primary key default uuid_generate_v4(),
  incident_id  uuid references public.incidents(id) on delete cascade,
  recipient    text not null,
  channel      text not null,   -- 'sms' | 'whatsapp'
  status       text default 'sent',
  message      text,
  sent_at      timestamptz default now()
);

-- ── Hospital alert log ──────────────────────────────────────────────────
create table public.hospital_alerts (
  id            uuid primary key default uuid_generate_v4(),
  incident_id   uuid references public.incidents(id) on delete cascade,
  hospital_id   uuid references public.hospitals(id),
  severity_tier text,
  eta_min       int,
  preparation   jsonb,   -- {icu: true, or: true, blood: true, team: true}
  sent_at       timestamptz default now(),
  acknowledged  boolean default false,
  ack_at        timestamptz
);

-- ── Realtime ────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.incidents;
alter publication supabase_realtime add table public.hospital_alerts;
