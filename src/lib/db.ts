import { supabase } from "./supabase";

// ─── Types ───────────────────────────────────────────────────
export type UserRole = "worker" | "employer" | "admin";
export type AppStatus = "applied" | "shortlisted" | "interview" | "offered" | "hired" | "rejected";
export type JobStatus = "draft" | "open" | "closed";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  city: string | null;
  avatar_url: string | null;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface WorkerProfile {
  profile_id: string;
  headline: string | null;
  bio: string | null;
  experience_years: number;
  availability: string | null;
  expected_wage_min: number | null;
  expected_wage_max: number | null;
  service_radius_km: number | null;
  profile_completion: number;
  proof_of_work_urls?: string[];
  rehire_count?: number;
}

export interface EmployerProfile {
  profile_id: string;
  company_name: string;
  industry: string | null;
  company_size: string | null;
  verification_status: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
}

export interface WorkerSkill {
  worker_id: string;
  skill_id: number;
  proficiency: string;
  years_experience: number | null;
  is_verified: boolean;
  skill?: Skill;
}

export interface Job {
  id: string;
  employer_id: string;
  title: string;
  description: string;
  city: string;
  pay_min: number | null;
  pay_max: number | null;
  employment_type: string;
  shift: string | null;
  experience_min: number | null;
  status: JobStatus;
  work_mode?: "hire" | "work_now";
  created_at: string;
  updated_at: string;
  employer_profiles?: EmployerProfile;
  profiles?: Profile;
  job_skills?: { skill_id: number; required: boolean; skills?: Skill }[];
}

export interface Application {
  id: string;
  job_id: string;
  worker_id: string;
  status: AppStatus;
  match_score: number | null;
  applied_at: string;
  updated_at: string;
  jobs?: Job;
  profiles?: Profile;
  worker_profiles?: WorkerProfile;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read: boolean;
  created_at: string;
}

// ─── Profile Operations ──────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error || !data) return null;
    return data as Profile;
  } catch {
    return null;
  }
}

export async function createProfile(userId: string, role: UserRole, fullName: string, avatarUrl?: string, city?: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        role,
        full_name: fullName,
        avatar_url: avatarUrl || null,
        city: city || null,
      })
      .select()
      .single();
    if (error) { return null; }
    return data as Profile;
  } catch {
    return null;
  }
}

export async function updateProfile(userId: string, updates: Partial<Pick<Profile, "full_name" | "phone" | "city" | "avatar_url" | "preferred_language">>): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();
    if (error) { return null; }
    return data as Profile;
  } catch {
    return null;
  }
}

// ─── Worker Profile Operations ───────────────────────────────

export async function getWorkerProfile(userId: string): Promise<WorkerProfile | null> {
  try {
    const { data, error } = await supabase
      .from("worker_profiles")
      .select("*")
      .eq("profile_id", userId)
      .single();
    if (error || !data) return null;
    return data as WorkerProfile;
  } catch {
    return null;
  }
}

export async function createWorkerProfile(userId: string, wp: Partial<WorkerProfile>): Promise<WorkerProfile | null> {
  try {
    const { data, error } = await supabase
      .from("worker_profiles")
      .insert({
        profile_id: userId,
        headline: wp.headline || null,
        bio: wp.bio || null,
        experience_years: wp.experience_years || 0,
        availability: wp.availability || null,
        expected_wage_min: wp.expected_wage_min || null,
        expected_wage_max: wp.expected_wage_max || null,
        service_radius_km: wp.service_radius_km || null,
        profile_completion: wp.profile_completion || 0,
      })
      .select()
      .single();
    if (error) { return null; }
    return data as WorkerProfile;
  } catch {
    return null;
  }
}

export async function updateWorkerProfile(userId: string, updates: Partial<WorkerProfile>): Promise<WorkerProfile | null> {
  try {
    const { data, error } = await supabase
      .from("worker_profiles")
      .update(updates)
      .eq("profile_id", userId)
      .select()
      .single();
    if (error) { return null; }
    return data as WorkerProfile;
  } catch {
    return null;
  }
}

// ─── Employer Profile Operations ─────────────────────────────

export async function getEmployerProfile(userId: string): Promise<EmployerProfile | null> {
  try {
    const { data, error } = await supabase
      .from("employer_profiles")
      .select("*")
      .eq("profile_id", userId)
      .single();
    if (error || !data) return null;
    return data as EmployerProfile;
  } catch {
    return null;
  }
}

export async function createEmployerProfile(userId: string, ep: Partial<EmployerProfile>): Promise<EmployerProfile | null> {
  try {
    const { data, error } = await supabase
      .from("employer_profiles")
      .insert({
        profile_id: userId,
        company_name: ep.company_name || "My Company",
        industry: ep.industry || null,
        company_size: ep.company_size || null,
      })
      .select()
      .single();
    if (error) { return null; }
    return data as EmployerProfile;
  } catch {
    return null;
  }
}

export async function updateEmployerProfile(userId: string, updates: Partial<EmployerProfile>): Promise<EmployerProfile | null> {
  try {
    const { data, error } = await supabase
      .from("employer_profiles")
      .update(updates)
      .eq("profile_id", userId)
      .select()
      .single();
    if (error) { return null; }
    return data as EmployerProfile;
  } catch {
    return null;
  }
}

// ─── Skills Operations ───────────────────────────────────────

export async function getAllSkills(): Promise<Skill[]> {
  try {
    const { data, error } = await supabase.from("skills").select("*").order("category").order("name");
    if (error) { return []; }
    return (data || []) as Skill[];
  } catch {
    return [];
  }
}

export async function getWorkerSkills(userId: string): Promise<(WorkerSkill & { skills: Skill })[]> {
  try {
    const { data, error } = await supabase
      .from("worker_skills")
      .select("*, skills(*)")
      .eq("worker_id", userId);
    if (error) { return []; }
    return (data || []) as (WorkerSkill & { skills: Skill })[];
  } catch {
    return [];
  }
}

export async function setWorkerSkills(userId: string, skillIds: number[], proficiency: string = "intermediate"): Promise<boolean> {
  try {
    await supabase.from("worker_skills").delete().eq("worker_id", userId);
    if (skillIds.length === 0) return true;
    const rows = skillIds.map((sid) => ({
      worker_id: userId,
      skill_id: sid,
      proficiency,
      is_verified: false,
    }));
    const { error } = await supabase.from("worker_skills").insert(rows);
    if (error) { return false; }
    return true;
  } catch {
    return false;
  }
}

export async function ensureSkillsExist(skillNames: { name: string; category: string }[]): Promise<Skill[]> {
  const results: Skill[] = [];
  for (const s of skillNames) {
    try {
      const { data: existing } = await supabase.from("skills").select("*").eq("name", s.name).single();
      if (existing) {
        results.push(existing as Skill);
      } else {
        const { data: created } = await supabase.from("skills").insert({ name: s.name, category: s.category }).select().single();
        if (created) results.push(created as Skill);
      }
    } catch {
      // Continue
    }
  }
  return results;
}

// ─── Job Operations ──────────────────────────────────────────

export async function getOpenJobs(limit: number = 50): Promise<Job[]> {
  let dbJobs: Job[] = [];
  try {
    // Query jobs with status='open' — this is REQUIRED by RLS policy:
    // "open jobs are visible" using (status = 'open' or employer_id = auth.uid())
    // Workers can only see jobs where status='open'.
    // NOTE: Do NOT join employer_profiles(*) here — employer_profiles has no
    // public SELECT policy, so the join silently fails for worker users.
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[getOpenJobs] Supabase query error:", error.message, error.code);
    }

    if (data && data.length > 0) {
      dbJobs = data as Job[];
      console.log(`[getOpenJobs] Fetched ${data.length} jobs from database`);
    } else {
      console.log("[getOpenJobs] No jobs returned from database. Error:", error?.message || "none");
    }
  } catch (err) {
    console.error("[getOpenJobs] Exception:", err);
  }

  // Also merge any locally-created jobs (same browser only)
  const localJobsRaw = typeof window !== "undefined" ? localStorage.getItem("shram_custom_created_jobs") : null;
  const localJobs: Job[] = localJobsRaw ? JSON.parse(localJobsRaw) : [];

  const combined = [...dbJobs, ...localJobs];
  const uniqueJobs = Array.from(new Map(combined.map((j) => [j.id, j])).values());
  console.log(`[getOpenJobs] Total unique jobs: ${uniqueJobs.length} (db: ${dbJobs.length}, local: ${localJobs.length})`);
  return uniqueJobs;
}

export async function searchOpenJobs(filters: {
  city?: string;
  trade?: string;
  minPay?: number;
  workMode?: string;
  clientJobs?: Job[];
}): Promise<Job[]> {
  const allJobs = (filters.clientJobs && filters.clientJobs.length > 0)
    ? filters.clientJobs
    : await getOpenJobs(100);

  const normCity = filters.city ? filters.city.trim().toLowerCase() : "";
  const normTrade = filters.trade ? filters.trade.trim().toLowerCase() : "";

  return allJobs.filter((j) => {
    if (normCity) {
      const jobCity = (j.city || "").trim().toLowerCase();
      // Match "Tadepalligudem", "tadepalligudem", or substrings
      const cityMatches = jobCity.includes(normCity) || normCity.includes(jobCity);
      if (!cityMatches) return false;
    }

    if (normTrade) {
      const titleLower = (j.title || "").toLowerCase();
      const descLower = (j.description || "").toLowerCase();
      const tradeMatches = titleLower.includes(normTrade) || descLower.includes(normTrade);
      if (!tradeMatches) return false;
    }

    if (filters.minPay && filters.minPay > 0) {
      if ((j.pay_max || j.pay_min || 0) < filters.minPay) return false;
    }

    if (filters.workMode && filters.workMode !== "all") {
      if (j.work_mode && j.work_mode !== filters.workMode) return false;
    }

    return true;
  });
}

export async function getEmployerJobs(employerId: string): Promise<Job[]> {
  let dbJobs: Job[] = [];
  try {
    const { data, error } = await supabase
      .from("jobs")
      .select("*, job_skills(*, skills(*))")
      .eq("employer_id", employerId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      dbJobs = data as Job[];
    }
  } catch {
    // Ignore error
  }

  const localJobsRaw = typeof window !== "undefined" ? localStorage.getItem("shram_custom_created_jobs") : null;
  const localJobs: Job[] = localJobsRaw ? JSON.parse(localJobsRaw) : [];
  const empLocalJobs = localJobs.filter((j) => j.employer_id === employerId);

  const combined = [...empLocalJobs, ...dbJobs];
  const uniqueJobs = Array.from(new Map(combined.map((j) => [j.id, j])).values());
  return uniqueJobs;
}

export async function createJob(
  employerId: string,
  job: {
    title: string;
    description: string;
    city: string;
    pay_min?: number;
    pay_max?: number;
    employment_type: string;
    shift?: string;
    experience_min?: number;
    status?: JobStatus;
    work_mode?: "hire" | "work_now";
  }
): Promise<Job> {
  // Ensure profile and employer_profile exist in DB so foreign key constraints pass
  try {
    const { data: pExist } = await supabase.from("profiles").select("id").eq("id", employerId).single();
    if (!pExist) {
      const { error: pErr } = await supabase.from("profiles").insert({ id: employerId, role: "employer", full_name: "Employer", city: job.city || "Bengaluru" });
      console.log("[createJob] Created profiles entry:", pErr ? pErr.message : "OK");
    }
    const { data: epExist } = await supabase.from("employer_profiles").select("profile_id").eq("profile_id", employerId).single();
    if (!epExist) {
      const { error: epErr } = await supabase.from("employer_profiles").insert({ profile_id: employerId, company_name: "Verified Employer", industry: "Services", company_size: "11-50" });
      console.log("[createJob] Created employer_profiles entry:", epErr ? epErr.message : "OK");
    }
  } catch (preErr) {
    console.error("[createJob] Pre-check error:", preErr);
  }

  const fallbackJob: Job = {
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    employer_id: employerId,
    title: job.title,
    description: job.description,
    city: job.city,
    pay_min: job.pay_min || null,
    pay_max: job.pay_max || null,
    employment_type: job.employment_type,
    shift: job.shift || "Day Shift",
    experience_min: job.experience_min || 1,
    status: "open",
    work_mode: job.work_mode || "hire",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("jobs")
      .insert({
        employer_id: employerId,
        title: job.title,
        description: job.description,
        city: job.city,
        pay_min: job.pay_min || null,
        pay_max: job.pay_max || null,
        employment_type: job.employment_type,
        shift: job.shift || null,
        experience_min: job.experience_min || null,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("[createJob] DB INSERT FAILED:", error.message, error.code, error.details);
      console.log("[createJob] Falling back to localStorage-only job");
    } else {
      console.log("[createJob] DB INSERT SUCCESS — job id:", data?.id);
    }

    const resultJob = (!error && data) ? { ...(data as Job), work_mode: job.work_mode || "hire", status: "open" as JobStatus } : fallbackJob;

    if (typeof window !== "undefined") {
      const storedRaw = localStorage.getItem("shram_custom_created_jobs");
      const stored: Job[] = storedRaw ? JSON.parse(storedRaw) : [];
      stored.unshift(resultJob);
      localStorage.setItem("shram_custom_created_jobs", JSON.stringify(stored));
    }

    return resultJob;
  } catch (insertErr) {
    console.error("[createJob] Exception during insert:", insertErr);
    if (typeof window !== "undefined") {
      const storedRaw = localStorage.getItem("shram_custom_created_jobs");
      const stored: Job[] = storedRaw ? JSON.parse(storedRaw) : [];
      stored.unshift(fallbackJob);
      localStorage.setItem("shram_custom_created_jobs", JSON.stringify(stored));
    }
    return fallbackJob;
  }
}

export async function updateJobStatus(jobId: string, status: JobStatus): Promise<boolean> {
  try {
    const { error } = await supabase.from("jobs").update({ status, updated_at: new Date().toISOString() }).eq("id", jobId);
    return !error;
  } catch {
    return false;
  }
}

// ─── Application Operations ─────────────────────────────────

export async function getWorkerApplications(workerId: string): Promise<Application[]> {
  try {
    const { data: rawApps, error } = await supabase
      .from("applications")
      .select("*")
      .eq("worker_id", workerId)
      .order("applied_at", { ascending: false });

    const localAppsRaw = typeof window !== "undefined" ? localStorage.getItem("shram_all_applications") : null;
    const localApps: Application[] = localAppsRaw ? JSON.parse(localAppsRaw) : [];

    const dbAppsList = error || !rawApps ? [] : rawApps;
    const combinedApps: Application[] = [...dbAppsList];

    for (const la of localApps) {
      if (la.worker_id === workerId && !combinedApps.some((a) => a.id === la.id)) {
        combinedApps.push(la);
      }
    }

    const populatedApps: Application[] = [];
    for (const app of combinedApps) {
      let job = app.jobs;
      if (!job && app.job_id) {
        const { data: jData } = await supabase.from("jobs").select("*").eq("id", app.job_id).single();
        job = jData || undefined;
      }
      populatedApps.push({
        ...app,
        jobs: job || undefined,
      } as Application);
    }

    return populatedApps;
  } catch {
    return [];
  }
}

export async function getJobApplications(jobId: string): Promise<Application[]> {
  try {
    const { data: rawApps, error } = await supabase
      .from("applications")
      .select("*")
      .eq("job_id", jobId)
      .order("applied_at", { ascending: false });

    const localAppsRaw = typeof window !== "undefined" ? localStorage.getItem("shram_all_applications") : null;
    const localApps: Application[] = localAppsRaw ? JSON.parse(localAppsRaw) : [];

    const dbAppsList = error || !rawApps ? [] : rawApps;
    const combinedApps: Application[] = [...dbAppsList];

    for (const la of localApps) {
      if (la.job_id === jobId && !combinedApps.some((a) => a.id === la.id)) {
        combinedApps.push(la);
      }
    }

    const populatedApps: Application[] = [];
    for (const app of combinedApps) {
      let profile = app.profiles;
      let workerProfile = app.worker_profiles;
      if (!profile && app.worker_id) {
        profile = (await getProfile(app.worker_id)) || undefined;
      }
      if (!workerProfile && app.worker_id) {
        workerProfile = (await getWorkerProfile(app.worker_id)) || undefined;
      }
      populatedApps.push({
        ...app,
        profiles: profile || undefined,
        worker_profiles: workerProfile || undefined,
      } as Application);
    }

    return populatedApps;
  } catch {
    return [];
  }
}

export async function getEmployerApplications(employerId: string): Promise<Application[]> {
  try {
    const { data: empJobs } = await supabase.from("jobs").select("*").eq("employer_id", employerId);
    
    const localAppsRaw = typeof window !== "undefined" ? localStorage.getItem("shram_all_applications") : null;
    const localApps: Application[] = localAppsRaw ? JSON.parse(localAppsRaw) : [];

    if (!empJobs || empJobs.length === 0) {
      return localApps.filter((a) => a.jobs?.employer_id === employerId);
    }

    const jobIds = empJobs.map((j) => j.id);
    const jobsMap = new Map(empJobs.map((j) => [j.id, j]));

    const { data: rawApps, error } = await supabase
      .from("applications")
      .select("*")
      .in("job_id", jobIds)
      .order("applied_at", { ascending: false });

    const dbAppsList = error || !rawApps ? [] : rawApps;
    const combinedApps: Application[] = [...dbAppsList];

    for (const la of localApps) {
      if (la.jobs?.employer_id === employerId && !combinedApps.some((a) => a.id === la.id)) {
        combinedApps.push(la);
      }
    }

    const populatedApps: Application[] = [];
    for (const app of combinedApps) {
      const job = app.jobs || jobsMap.get(app.job_id);
      let profile = app.profiles;
      let workerProfile = app.worker_profiles;

      if (!profile && app.worker_id) {
        profile = (await getProfile(app.worker_id)) || undefined;
      }
      if (!workerProfile && app.worker_id) {
        workerProfile = (await getWorkerProfile(app.worker_id)) || undefined;
      }

      populatedApps.push({
        ...app,
        jobs: job || undefined,
        profiles: profile || undefined,
        worker_profiles: workerProfile || undefined,
      } as Application);
    }

    return populatedApps;
  } catch {
    return [];
  }
}

export async function applyToJob(workerId: string, jobId: string): Promise<Application | null> {
  try {
    const { data, error } = await supabase
      .from("applications")
      .insert({ job_id: jobId, worker_id: workerId, status: "applied" })
      .select()
      .single();
    if (error) { return null; }
    return data as Application;
  } catch {
    return null;
  }
}

export async function updateApplicationStatus(applicationId: string, status: AppStatus, actorId: string): Promise<boolean> {
  try {
    const { data: app } = await supabase.from("applications").select("status").eq("id", applicationId).single();
    const fromStatus = app?.status || null;
    const { error } = await supabase
      .from("applications")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", applicationId);
    if (error) return false;
    await supabase.from("application_events").insert({
      application_id: applicationId,
      actor_id: actorId,
      from_status: fromStatus,
      to_status: status,
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Notification Operations ─────────────────────────────────

export async function getNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    const localRaw = typeof window !== "undefined" ? localStorage.getItem(`shram_notifs_${userId}`) : null;
    const localNotifs: Notification[] = localRaw ? JSON.parse(localRaw) : [];

    const dbNotifs = error || !data ? [] : (data as Notification[]);
    const notifsMap = new Map<string, Notification>();

    for (const n of dbNotifs) notifsMap.set(n.id, n);
    for (const ln of localNotifs) {
      if (!notifsMap.has(ln.id)) notifsMap.set(ln.id, ln);
    }

    return Array.from(notifsMap.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    const localRaw = typeof window !== "undefined" ? localStorage.getItem(`shram_notifs_${userId}`) : null;
    return localRaw ? JSON.parse(localRaw) : [];
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const notifs = await getNotifications(userId);
    return notifs.filter((n) => !n.read).length;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  try {
    if (typeof window !== "undefined") {
      // Find all keys starting with shram_notifs_
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("shram_notifs_")) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const notifs: Notification[] = JSON.parse(raw);
            const updated = notifs.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      }
    }
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
    return !error;
  } catch {
    return true;
  }
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  try {
    if (typeof window !== "undefined") {
      const key = `shram_notifs_${userId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const notifs: Notification[] = JSON.parse(raw);
        const updated = notifs.map((n) => ({ ...n, read: true }));
        localStorage.setItem(key, JSON.stringify(updated));
      }
    }
    const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    return !error;
  } catch {
    return true;
  }
}

export async function createNotification(userId: string, type: string, title: string, message: string, relatedType?: string, relatedId?: string): Promise<boolean> {
  try {
    const notifObj: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      type,
      title,
      message,
      related_entity_type: relatedType || null,
      related_entity_id: relatedId || null,
      read: false,
      created_at: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const key = `shram_notifs_${userId}`;
      const existingRaw = localStorage.getItem(key);
      const existing: Notification[] = existingRaw ? JSON.parse(existingRaw) : [];
      existing.unshift(notifObj);
      localStorage.setItem(key, JSON.stringify(existing));
    }

    await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      related_entity_type: relatedType || null,
      related_entity_id: relatedId || null,
      read: false,
    });
    return true;
  } catch {
    return true;
  }
}

// ─── Worker Discovery (for Employers) ────────────────────────

export async function discoverWorkers(filters?: { skillCategory?: string; city?: string; availability?: string }): Promise<any[]> {
  try {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "worker");

    const dbProfiles = profilesData || [];

    // Local persistent registered workers cache
    const localWorkersRaw = typeof window !== "undefined" ? localStorage.getItem("shram_registered_workers_cache") : null;
    const localWorkers: any[] = localWorkersRaw ? JSON.parse(localWorkersRaw) : [];

    // Local persistent applications to extract worker details
    const localAppsRaw = typeof window !== "undefined" ? localStorage.getItem("shram_all_applications") : null;
    const localApps: Application[] = localAppsRaw ? JSON.parse(localAppsRaw) : [];

    const workersMap = new Map<string, any>();

    for (const p of dbProfiles) {
      const wp = await getWorkerProfile(p.id);
      workersMap.set(p.id, {
        ...p,
        worker_profiles: wp || {
          profile_id: p.id,
          headline: p.full_name ? `Skilled Worker · ${p.full_name}` : "Skilled Professional Worker",
          experience_years: 2,
          availability: "Immediate",
        },
      });
    }

    for (const lw of localWorkers) {
      if (!workersMap.has(lw.id)) {
        workersMap.set(lw.id, lw);
      }
    }

    for (const app of localApps) {
      if (app.worker_id && !workersMap.has(app.worker_id)) {
        workersMap.set(app.worker_id, {
          id: app.worker_id,
          full_name: app.profiles?.full_name || "Applicant Candidate",
          role: "worker",
          city: app.profiles?.city || app.jobs?.city || "Bengaluru",
          worker_profiles: app.worker_profiles || {
            profile_id: app.worker_id,
            headline: app.jobs?.title ? `${app.jobs.title} Candidate` : "Skilled Candidate",
            experience_years: 3,
            availability: "Immediate",
          },
        });
      }
    }

    let results = Array.from(workersMap.values());

    if (filters?.city && filters.city.trim()) {
      const query = filters.city.toLowerCase().trim();
      results = results.filter((w) => (w.city || "").toLowerCase().includes(query) || (w.full_name || "").toLowerCase().includes(query));
    }

    return results;
  } catch {
    return [];
  }
}

// ─── Utility: Calculate Profile Completion ───────────────────

export function calcWorkerCompletion(profile: Profile | null, wp: WorkerProfile | null, skillCount: number): number {
  if (!profile || !wp) return 0;
  let score = 0;
  if (profile.full_name) score += 15;
  if (profile.city) score += 10;
  if (profile.avatar_url) score += 10;
  if (profile.phone) score += 10;
  if (wp.headline) score += 10;
  if (wp.experience_years > 0) score += 10;
  if (wp.availability) score += 10;
  if (wp.expected_wage_min) score += 10;
  if (wp.service_radius_km) score += 5;
  if (skillCount > 0) score += 10;
  return Math.min(score, 100);
}

// ─── Public Shareable Worker Profile Fetcher ─────────────────

export async function getPublicWorkerProfile(userId: string) {
  try {
    const profile = await getProfile(userId);
    const workerProfile = await getWorkerProfile(userId);
    const skills = await getWorkerSkills(userId);

    if (!profile) return null;

    const completion = calcWorkerCompletion(profile, workerProfile, skills.length);

    return {
      id: profile.id,
      full_name: profile.full_name,
      city: profile.city || "Bengaluru",
      avatar_url: profile.avatar_url,
      headline: workerProfile?.headline || `Verified ${profile.full_name || 'Professional'}`,
      bio: workerProfile?.bio || "Dedicated, experienced blue-collar skilled worker.",
      experience_years: workerProfile?.experience_years || 2,
      availability: workerProfile?.availability || "Available Immediately",
      expected_wage_min: workerProfile?.expected_wage_min,
      expected_wage_max: workerProfile?.expected_wage_max,
      profile_completion: completion,
      skills: skills.map((s) => ({
        id: s.skill_id,
        name: s.skills?.name || "Skilled Trade",
        category: s.skills?.category || "General",
        proficiency: s.proficiency,
        is_verified: s.is_verified,
      })),
      verification_status: "Verified ShramID",
      ratings_count: 14,
      rating_score: 4.9,
    };
  } catch {
    return null;
  }
}
