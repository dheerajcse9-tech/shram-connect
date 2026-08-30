-- Workforce Connect: initial Supabase schema
-- Run in the Supabase SQL editor after creating a project.

create type public.user_role as enum ('worker', 'employer', 'admin');
create type public.verification_status as enum ('pending', 'verified', 'needs_review', 'rejected');
create type public.job_status as enum ('draft', 'open', 'closed');
create type public.application_status as enum ('applied', 'shortlisted', 'interview', 'offered', 'hired', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  phone text,
  city text,
  avatar_url text,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.worker_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  bio text,
  experience_years numeric(3,1) not null default 0,
  availability text,
  expected_wage_min integer,
  expected_wage_max integer,
  service_radius_km integer,
  profile_completion smallint not null default 0 check (profile_completion between 0 and 100)
);

create table public.employer_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text not null,
  industry text,
  company_size text,
  verification_status public.verification_status not null default 'pending'
);

create table public.skills (
  id bigint generated always as identity primary key,
  name text not null unique,
  category text not null
);

create table public.worker_skills (
  worker_id uuid references public.worker_profiles(profile_id) on delete cascade,
  skill_id bigint references public.skills(id) on delete restrict,
  proficiency text not null check (proficiency in ('beginner', 'intermediate', 'advanced')),
  years_experience numeric(3,1),
  is_verified boolean not null default false,
  primary key (worker_id, skill_id)
);

create table public.work_experiences (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(profile_id) on delete cascade,
  employer_name text not null,
  title text not null,
  start_date date,
  end_date date,
  description text,
  created_at timestamptz not null default now()
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(profile_id) on delete cascade,
  title text not null,
  issuer text,
  file_path text not null,
  verification_status public.verification_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.references (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(profile_id) on delete cascade,
  contact_name text not null,
  relationship text,
  phone text,
  verification_status public.verification_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employer_profiles(profile_id) on delete cascade,
  title text not null,
  description text not null,
  city text not null,
  pay_min integer,
  pay_max integer,
  employment_type text not null,
  shift text,
  experience_min numeric(3,1),
  status public.job_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_skills (
  job_id uuid references public.jobs(id) on delete cascade,
  skill_id bigint references public.skills(id) on delete restrict,
  required boolean not null default true,
  primary key (job_id, skill_id)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(profile_id) on delete cascade,
  status public.application_status not null default 'applied',
  match_score smallint check (match_score between 0 and 100),
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, worker_id)
);

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  from_status public.application_status,
  to_status public.application_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.verification_events (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  action public.verification_status not null,
  note text,
  created_at timestamptz not null default now()
);

-- ─── Notifications ──────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  related_entity_type text,
  related_entity_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read, created_at desc);

create index jobs_open_city_idx on public.jobs (city, created_at desc) where status = 'open';
create index applications_worker_idx on public.applications (worker_id, updated_at desc);
create index applications_job_idx on public.applications (job_id, status, updated_at desc);

-- Role helper prevents client-side role spoofing in policies.
create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

alter table public.profiles enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.employer_profiles enable row level security;
alter table public.worker_skills enable row level security;
alter table public.work_experiences enable row level security;
alter table public.certificates enable row level security;
alter table public.references enable row level security;
alter table public.jobs enable row level security;
alter table public.job_skills enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
alter table public.verification_events enable row level security;
alter table public.notifications enable row level security;

create policy "public profiles can be read" on public.profiles for select using (true);
create policy "users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "users insert own profile" on public.profiles for insert with check (id = auth.uid());
create policy "workers manage own worker profile" on public.worker_profiles for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "employers manage own employer profile" on public.employer_profiles for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "worker skills manageable by owner" on public.worker_skills for all using (worker_id = auth.uid()) with check (worker_id = auth.uid());
create policy "skills readable by all" on public.skills for select using (true);
create policy "skills insertable by authenticated" on public.skills for insert with check (auth.uid() is not null);
create policy "worker evidence visible to owner or employer" on public.certificates for select using (worker_id = auth.uid() or public.current_role() in ('employer', 'admin'));
create policy "workers manage own certificates" on public.certificates for all using (worker_id = auth.uid()) with check (worker_id = auth.uid());
create policy "open jobs are visible" on public.jobs for select using (status = 'open' or employer_id = auth.uid() or public.current_role() = 'admin');
create policy "employers manage own jobs" on public.jobs for all using (employer_id = auth.uid()) with check (employer_id = auth.uid());
create policy "job skills readable" on public.job_skills for select using (true);
create policy "job skills manageable by job owner" on public.job_skills for all using (exists (select 1 from public.jobs where jobs.id = job_skills.job_id and jobs.employer_id = auth.uid()));
create policy "workers see own applications" on public.applications for select using (worker_id = auth.uid());
create policy "employers see applications to own jobs" on public.applications for select using (exists (select 1 from public.jobs where jobs.id = applications.job_id and jobs.employer_id = auth.uid()));
create policy "workers create own applications" on public.applications for insert with check (worker_id = auth.uid());
create policy "employers update applications to own jobs" on public.applications for update using (exists (select 1 from public.jobs where jobs.id = applications.job_id and jobs.employer_id = auth.uid()));
create policy "users see own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "users update own notifications" on public.notifications for update using (user_id = auth.uid());
create policy "system creates notifications" on public.notifications for insert with check (auth.uid() is not null);
create policy "application events readable by involved" on public.application_events for select using (
  exists (select 1 from public.applications a join public.jobs j on j.id = a.job_id where a.id = application_events.application_id and (a.worker_id = auth.uid() or j.employer_id = auth.uid()))
);
create policy "application events insertable by involved" on public.application_events for insert with check (actor_id = auth.uid());

-- Create a private Storage bucket named `worker-evidence`; serve documents with signed URLs only.
