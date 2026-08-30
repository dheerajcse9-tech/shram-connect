# Shram Connect

A hackathon-ready recruitment platform that turns informal blue-collar work history into a trusted, portable **Skill Passport** and helps employers build an explainable shortlist quickly.

## What works now

- Worker portal: profile strength, trusted Skill Passport, certificates, recommended jobs and application tracking.
- Employer portal: hiring dashboard, jobs, candidate discovery, explainable matching and a live hiring pipeline.
- Interactive demo journey: apply to a role, switch to the employer, shortlist the worker, and move them through the pipeline.
- English/Hindi UI toggle and a responsive, mobile-friendly layout.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo route

1. Start in the Worker view and open **Find work**.
2. Select **Industrial Electrician** and apply with Ravi's Skill Passport.
3. Switch to the Employer view.
4. Open **Find talent** to see match reasons and trusted evidence.
5. Open **Hiring pipeline** and move Ravi from Applied to Shortlisted.

## Current implementation note

This first build is a polished, interactive frontend with seeded hackathon data. The next implementation milestone is wiring the same entities to Supabase Auth, PostgreSQL, Storage, and Row Level Security so worker profiles, applications, certificate reviews, and pipeline updates persist for real users.

## Proposed production data model

`profiles`, `worker_profiles`, `employer_profiles`, `skills`, `worker_skills`, `certificates`, `work_experiences`, `references`, `jobs`, `job_skills`, `applications`, `application_events`, and `verification_events`.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, and a planned Supabase + Vercel deployment path.
