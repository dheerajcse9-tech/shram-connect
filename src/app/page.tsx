"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";
import {
  Profile,
  WorkerProfile,
  EmployerProfile,
  Skill,
  Job,
  Application,
  Notification,
  AppStatus,
  UserRole,
  getProfile,
  createProfile,
  updateProfile,
  getWorkerProfile,
  createWorkerProfile,
  updateWorkerProfile,
  getEmployerProfile,
  createEmployerProfile,
  updateEmployerProfile,
  getAllSkills,
  getWorkerSkills,
  setWorkerSkills,
  ensureSkillsExist,
  getOpenJobs,
  getEmployerJobs,
  createJob,
  updateJobStatus,
  getWorkerApplications,
  getEmployerApplications,
  applyToJob,
  updateApplicationStatus,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
  discoverWorkers,
  calcWorkerCompletion,
} from "@/lib/db";

type View = "worker" | "employer";

// Predefined visual trade selection catalog
interface TradeOption {
  id: string;
  name: string;
  hindiName: string;
  icon: string;
  category: string;
  defaultSkills: string[];
}

const PREDEFINED_TRADES: TradeOption[] = [
  { id: "electrician", name: "Electrician", hindiName: "इलेक्ट्रीशियन", icon: "⚡", category: "Electrical", defaultSkills: ["3-Phase Panel Wiring", "Commercial Conduit", "Transformer Maintenance", "Motor Rewinding", "Domestic DB Box"] },
  { id: "plumber", name: "Plumber", hindiName: "प्लंबर", icon: "🚰", category: "Plumbing", defaultSkills: ["PEX / CPVC Pipe Fitting", "Underground Drainage", "Pressure Pump Repair", "Sanitary Fixtures", "Solar Water Heater"] },
  { id: "cnc", name: "Machine Operator", hindiName: "मशीन ऑपरेटर", icon: "⚙️", category: "Manufacturing", defaultSkills: ["CNC Lathe Milling", "VMC 5-Axis", "Injection Molding", "Quality Gauge (Vernier)", "Blueprint Reading"] },
  { id: "driver", name: "Commercial Driver", hindiName: "ड्राइवर", icon: "🚚", category: "Logistics", defaultSkills: ["Heavy Transport (HMV)", "Light Commercial (LMV)", "Forklift Operation", "Route Knowledge", "Night Highway"] },
  { id: "ac_tech", name: "AC Technician", hindiName: "एसी तकनीशियन", icon: "❄️", category: "HVAC", defaultSkills: ["Inverter Split AC", "VRV / VRF Systems", "Compressor Overhaul", "R32 Gas Charging", "Leakage Testing"] },
  { id: "welder", name: "Welder / Fitter", hindiName: "वेल्डर / फ़िटर", icon: "🔥", category: "Fabrication", defaultSkills: ["ARC / TIG Welding", "6G Pipe Welding", "Structural Fabrication", "Plasma Cutting", "Grinding & Polish"] },
  { id: "technician", name: "Technician", hindiName: "तकनीशियन", icon: "🧰", category: "Technical", defaultSkills: ["Equipment Repair", "Preventive Maintenance", "Circuit Troubleshooting", "Safety Inspection"] },
  { id: "delivery", name: "Delivery Executive", hindiName: "डिलीवरी एक्ज़ीक्यूटिव", icon: "📦", category: "Logistics", defaultSkills: ["Package Handling", "Navigation", "COD Settlement", "Two-Wheeler Driving"] },
  { id: "carpenter", name: "Carpenter", hindiName: "कारपेंटर", icon: "🪚", category: "Construction", defaultSkills: ["Modular Furniture", "Wood Polishing", "Door & Window Fitting", "Power Tool Operation"] },
  { id: "mason", name: "Mason", hindiName: "राजमिस्त्री", icon: "🧱", category: "Construction", defaultSkills: ["Brick Laying", "Plastering", "Tile Fitting", "Concrete Structure"] },
  { id: "painter", name: "Painter", hindiName: "पेंटर", icon: "🎨", category: "Construction", defaultSkills: ["Emulsion Coating", "Putty Finish", "Spray Painting", "Texture Design"] },
  { id: "cook", name: "Cook / Chef", hindiName: "रसोइया", icon: "🍳", category: "Hospitality", defaultSkills: ["Bulk Cooking", "Food Hygiene", "Menu Preparation", "Kitchen Management"] },
  { id: "housekeeping", name: "Housekeeping", hindiName: "हाउसकीपिंग", icon: "🧹", category: "Facilities", defaultSkills: ["Facility Cleaning", "Floor Scrubbing", "Chemical Hygiene", "Sanitation"] },
  { id: "security", name: "Security Guard", hindiName: "सुरक्षा गार्ड", icon: "🛡️", category: "Services", defaultSkills: ["Visitor Register", "CCTV Monitoring", "Gate Patrol", "Emergency Response"] },
  { id: "other", name: "Other / Custom Work", hindiName: "अन्य (कस्टम कार्य)", icon: "✏️", category: "Other", defaultSkills: ["General Technical Work", "Maintenance & Service", "Custom Specialized Skill"] },
];

function calculateJobSkillMatch(
  job: Job,
  workerSkills: Skill[] = [],
  workerTrade: string = "",
  workerCity: string = ""
): { score: number; label: string; color: string; matchedSkills: string[] } {
  let baseScore = 65;
  const matchedSkills: string[] = [];

  const jobText = `${job.title} ${job.description || ""} ${job.city || ""}`.toLowerCase();
  const tradeLower = (workerTrade || "").toLowerCase();

  if (tradeLower && tradeLower !== "other" && jobText.includes(tradeLower)) {
    baseScore += 22;
    matchedSkills.push(workerTrade);
  }

  if (workerSkills && workerSkills.length > 0) {
    workerSkills.forEach((s) => {
      if (s?.name && jobText.includes(s.name.toLowerCase())) {
        baseScore += 8;
        matchedSkills.push(s.name);
      }
    });
  }

  if (workerCity && job.city && job.city.toLowerCase().includes(workerCity.toLowerCase())) {
    baseScore += 5;
  }

  const finalScore = Math.min(98, Math.max(62, baseScore));

  let label = "Standard Match";
  let color = "#2563eb";
  if (finalScore >= 85) {
    label = "High Match";
    color = "#059669";
  } else if (finalScore >= 75) {
    label = "Good Match";
    color = "#d97706";
  }

  return { score: finalScore, label, color, matchedSkills };
}

function GoogleIcon() {
  return (
    <svg className="google-icon-svg" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
    </svg>
  );
}

export default function Home() {
  // Auth & Session
  const [supaUser, setSupaUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null);
  const [userSkills, setUserSkills] = useState<(Skill)[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingRole, setPendingRole] = useState<View>("worker");

  // UI State
  const [view, setView] = useState<View>("worker");
  const [page, setPage] = useState("home");
  const [toast, setToast] = useState("");
  const [authErrorModal, setAuthErrorModal] = useState<{ email: string; existingRole: View; attemptedRole: View } | null>(null);
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const [shramSaathiOpen, setShramSaathiOpen] = useState(false);

  // Profile Setup State (First-time / Incomplete Profile)
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [workerSetupData, setWorkerSetupData] = useState({
    selectedTradeIds: ["electrician"] as string[],
    tradeName: "Electrician",
    customTradeName: "",
    customSkillInput: "",
    skills: ["3-Phase Panel Wiring"],
    fullName: "",
    city: "Bengaluru",
    experienceYears: 2,
    expectedPayMin: 20000,
    expectedPayMax: 28000,
    availability: "Immediate",
    serviceRadiusKm: 10,
    headline: "Skilled Panel Electrician",
  });

  const [employerSetupData, setEmployerSetupData] = useState({
    companyName: "",
    industry: "Manufacturing",
    companySize: "11-50 employees",
    city: "Bengaluru",
    fullName: "",
  });

  // Database Data Collections
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [myApplicationsList, setMyApplicationsList] = useState<Application[]>([]);
  const [employerJobsList, setEmployerJobsList] = useState<Job[]>([]);
  const [employerApplicationsList, setEmployerApplicationsList] = useState<Application[]>([]);
  const [candidateWorkersList, setCandidateWorkersList] = useState<any[]>([]);
  const [selectedCandidateModal, setSelectedCandidateModal] = useState<any | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);

  // Profile Editing State
  const [isEditingWorkerProfile, setIsEditingWorkerProfile] = useState(false);
  const [workerEditData, setWorkerEditData] = useState({
    fullName: "",
    city: "",
    phone: "",
    headline: "",
    experienceYears: 2,
    availability: "Immediate",
  });

  const [employerEditData, setEmployerEditData] = useState({
    companyName: "",
    industry: "Services",
    companySize: "11-50",
    city: "Bengaluru",
  });

  const [accountForm, setAccountForm] = useState({
    fullName: "",
    city: "",
    phone: "",
  });

  // Filters & Selection
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchTradeFilter, setSearchTradeFilter] = useState("");
  const [searchCityFilter, setSearchCityFilter] = useState("");
  const [searchMinPayFilter, setSearchMinPayFilter] = useState<number>(0);
  const [searchEmploymentTypeFilter, setSearchEmploymentTypeFilter] = useState<string>("all");
  const [searchMinMatchFilter, setSearchMinMatchFilter] = useState<number>(0);
  const [searchWorkModeFilter, setSearchWorkModeFilter] = useState<string>("all");
  const [selectedTradeFilters, setSelectedTradeFilters] = useState<string[]>([]);
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<string>("all");
  const [applicationSearchQuery, setApplicationSearchQuery] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);

  // Job Creation Wizard (Employer)
  const [showJobWizard, setShowJobWizard] = useState(false);
  const [newJobForm, setNewJobForm] = useState({
    title: "",
    description: "",
    city: "Bengaluru",
    payMin: 20000,
    payMax: 28000,
    employmentType: "Full-time",
    shift: "Day Shift",
    experienceMin: 1,
    workMode: "hire" as "hire" | "work_now",
  });

  const showToastMsg = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3500);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Load All User Data from Supabase Database
  // ─────────────────────────────────────────────────────────────
  const loadUserData = useCallback(async (u: User, role: View) => {
    try {
      // 1. Fetch main profile
      let p = await getProfile(u.id);

      // Verify email role lock registry
      const registryRaw = typeof window !== "undefined" ? localStorage.getItem("shram_registered_email_roles") : null;
      const registry: Record<string, View> = registryRaw ? JSON.parse(registryRaw) : {};
      const email = (u.email || "").toLowerCase().trim();

      if (p) {
        // If DB role exists, enforce it
        if (p.role !== role) {
          showToastMsg(`Role restriction: Account registered as ${p.role.toUpperCase()}`);
          await supabase.auth.signOut();
          setSupaUser(null);
          setProfile(null);
          setAuthLoading(false);
          return;
        }
      } else {
        // Enforce localStorage role lock if exists
        if (email && registry[email] && registry[email] !== role) {
          setAuthErrorModal({ email, existingRole: registry[email], attemptedRole: role });
          await supabase.auth.signOut();
          setSupaUser(null);
          setAuthLoading(false);
          return;
        }

        // Create initial profile record
        const fullName = u.user_metadata?.full_name || u.user_metadata?.name || email.split("@")[0] || "User";
        p = await createProfile(u.id, role, fullName, u.user_metadata?.avatar_url || u.user_metadata?.picture || "");
        if (email) {
          registry[email] = role;
          if (typeof window !== "undefined") {
            localStorage.setItem("shram_registered_email_roles", JSON.stringify(registry));
          }
        }
      }

      setProfile(p);
      setView(role === "employer" ? "employer" : "worker");
      setPage(role === "employer" ? "dashboard" : "home");

      // Check persistent registration flag
      const isRegisteredDone = typeof window !== "undefined" && localStorage.getItem(`shram_profile_completed_${u.id}`) === "true";

      // 2. Fetch role-specific profiles
      if (role === "worker") {
        let wp = await getWorkerProfile(u.id);
        const wSkills = await getWorkerSkills(u.id);
        setUserSkills(wSkills.map((ws) => ws.skills));

        // Profile is complete if database has worker profile OR persistent completed flag exists
        const isWorkerComplete = Boolean(wp && wp.headline) || isRegisteredDone;

        if (!isWorkerComplete) {
          setNeedsProfileSetup(true);
          setWorkerSetupData((prev) => ({
            ...prev,
            fullName: p?.full_name || "",
            city: p?.city || "Bengaluru",
          }));
        } else {
          setWorkerProfile(wp || {
            profile_id: u.id,
            headline: p?.full_name ? `Skilled Worker · ${p.full_name}` : "Skilled Professional",
            bio: null,
            experience_years: 1,
            availability: "Immediate",
            expected_wage_min: 18000,
            expected_wage_max: 25000,
            service_radius_km: 10,
            profile_completion: 100,
          });
          setNeedsProfileSetup(false);
        }

        // Load open jobs from DB matching skills/location
        const jobs = await getOpenJobs();
        setJobsList(jobs);
        if (jobs.length > 0) setSelectedJobId(jobs[0].id);

        // Load worker's own applications
        const apps = await getWorkerApplications(u.id);
        setMyApplicationsList(apps);
      } else {
        let ep = await getEmployerProfile(u.id);

        // Profile is complete if database has employer profile OR persistent completed flag exists
        const isEmployerComplete = Boolean(ep && ep.company_name && ep.company_name.trim() !== "") || isRegisteredDone;

        if (!isEmployerComplete) {
          setNeedsProfileSetup(true);
          setEmployerSetupData((prev) => ({
            ...prev,
            fullName: p?.full_name || "",
            companyName: "",
            city: p?.city || "Bengaluru",
          }));
        } else {
          setEmployerProfile(ep || {
            profile_id: u.id,
            company_name: p?.full_name ? `${p.full_name}'s Enterprise` : "Registered Organization",
            industry: "Services",
            company_size: "11-50",
            verification_status: "verified",
          });
          setNeedsProfileSetup(false);
        }

        // Load employer's owned jobs & applications
        const eJobs = await getEmployerJobs(u.id);
        setEmployerJobsList(eJobs);

        const eApps = await getEmployerApplications(u.id);
        setEmployerApplicationsList(eApps);

        // Load candidates (worker profiles) for recruitment
        const workers = await discoverWorkers();
        setCandidateWorkersList(workers);
      }

      // 3. Load Notifications
      const notifs = await getNotifications(u.id);
      setNotifications(notifs);
      const unreadCount = await getUnreadNotificationCount(u.id);
      setUnreadNotifCount(unreadCount);

    } catch (err) {
      console.error("Error loading user data:", err);
    } finally {
      setAuthLoading(false);
    }
  }, [showToastMsg]);

  // Pre-fetch open jobs from database immediately on mount for all users (new & existing)
  useEffect(() => {
    getOpenJobs().then((jobs) => {
      if (jobs && jobs.length > 0) {
        setJobsList(jobs);
        setSelectedJobId((prev) => prev || jobs[0].id);
      }
    });
  }, []);

  // Session listener
  useEffect(() => {
    setAuthLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupaUser(session.user);
        const storedRole = (typeof window !== "undefined" ? localStorage.getItem("shram_pending_role") : null) as View | null;
        const roleToUse: View = storedRole === "employer" ? "employer" : "worker";
        loadUserData(session.user, roleToUse);
      } else {
        setSupaUser(null);
        setProfile(null);
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        setSupaUser(session.user);
        const storedRole = (typeof window !== "undefined" ? localStorage.getItem("shram_pending_role") : null) as View | null;
        const roleToUse: View = storedRole === "employer" ? "employer" : "worker";
        loadUserData(session.user, roleToUse);
      } else {
        setSupaUser(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  useEffect(() => {
    if (profile) {
      setAccountForm({
        fullName: profile.full_name || "",
        city: profile.city || "",
        phone: profile.phone || "",
      });
    }
  }, [profile, accountPanelOpen]);

  // Handle Google OAuth Login
  const openGoogleAuth = async (role: View) => {
    setPendingRole(role);
    if (typeof window !== "undefined") {
      localStorage.setItem("shram_pending_role", role);
    }
    setAuthLoading(true);

    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setAuthLoading(false);
      showToastMsg(`Google sign-in failed: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("shram_pending_role");
    }
    await supabase.auth.signOut();
    setSupaUser(null);
    setProfile(null);
    setWorkerProfile(null);
    setEmployerProfile(null);
    setAccountPanelOpen(false);
    showToastMsg("Signed out successfully.");
  };

  // ─────────────────────────────────────────────────────────────
  // WORKER PROFILE SETUP HANDLER (Persists to Supabase DB)
  // ─────────────────────────────────────────────────────────────
  const completeWorkerSetup = async () => {
    try {
      if (!supaUser) return;

      const updatedName = workerSetupData.fullName?.trim() || profile?.full_name || supaUser.email?.split("@")[0] || "Worker";
      const updatedCity = workerSetupData.city?.trim() || profile?.city || "Bengaluru";

      const updatedP = await updateProfile(supaUser.id, {
        full_name: updatedName,
        city: updatedCity,
      });
      setProfile(updatedP || {
        id: supaUser.id,
        role: "worker",
        full_name: updatedName,
        city: updatedCity,
        phone: profile?.phone || null,
        avatar_url: profile?.avatar_url || null,
        preferred_language: "en",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const headline = `${workerSetupData.experienceYears} yrs exp · ${workerSetupData.tradeName}`;
      const wpData = {
        headline,
        bio: `${workerSetupData.tradeName} professional`,
        experience_years: workerSetupData.experienceYears,
        availability: workerSetupData.availability,
        expected_wage_min: workerSetupData.expectedPayMin,
        expected_wage_max: workerSetupData.expectedPayMax,
        service_radius_km: workerSetupData.serviceRadiusKm,
        profile_completion: 90,
      };

      let wp = await updateWorkerProfile(supaUser.id, wpData);
      if (!wp) {
        wp = await createWorkerProfile(supaUser.id, wpData);
      }

      setWorkerProfile(wp || {
        profile_id: supaUser.id,
        headline,
        bio: `${workerSetupData.tradeName} professional`,
        experience_years: workerSetupData.experienceYears,
        availability: workerSetupData.availability,
        expected_wage_min: workerSetupData.expectedPayMin,
        expected_wage_max: workerSetupData.expectedPayMax,
        service_radius_km: workerSetupData.serviceRadiusKm,
        profile_completion: 90,
      });

      const skillSpecs = workerSetupData.skills.map((s) => ({ name: s, category: workerSetupData.tradeName }));
      const dbSkills = await ensureSkillsExist(skillSpecs);
      if (dbSkills.length > 0) {
        await setWorkerSkills(supaUser.id, dbSkills.map((s) => s.id));
        setUserSkills(dbSkills);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(`shram_profile_completed_${supaUser.id}`, "true");
        const registeredRaw = localStorage.getItem("shram_registered_workers_cache");
        const registered = registeredRaw ? JSON.parse(registeredRaw) : [];
        registered.unshift({
          id: supaUser.id,
          full_name: updatedName,
          city: updatedCity,
          phone: profile?.phone || "+91 9876543210",
          role: "worker",
          worker_profiles: {
            profile_id: supaUser.id,
            headline,
            experience_years: workerSetupData.experienceYears,
            availability: workerSetupData.availability,
          },
        });
        localStorage.setItem("shram_registered_workers_cache", JSON.stringify(registered));
      }

      setNeedsProfileSetup(false);
      setView("worker");
      setPage("home");

      showToastMsg("🎉 Profile setup complete! Welcome to ShramID.");

      const jobs = await getOpenJobs();
      setJobsList(jobs);
      if (jobs.length > 0) setSelectedJobId(jobs[0].id);
    } catch (err) {
      console.error("Worker setup error:", err);
      setNeedsProfileSetup(false);
      setView("worker");
      setPage("home");
      showToastMsg("🎉 Setup complete!");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // EMPLOYER PROFILE SETUP HANDLER (Persists to Supabase DB)
  // ─────────────────────────────────────────────────────────────
  const completeEmployerSetup = async () => {
    try {
      if (!supaUser) return;

      if (!employerSetupData.companyName || !employerSetupData.companyName.trim()) {
        showToastMsg("⚠️ Please enter your company or organization name.");
        return;
      }

      const updatedName = employerSetupData.fullName?.trim() || profile?.full_name || supaUser.email?.split("@")[0] || "Employer";
      const updatedCity = employerSetupData.city?.trim() || profile?.city || "Bengaluru";

      const updatedP = await updateProfile(supaUser.id, {
        full_name: updatedName,
        city: updatedCity,
      });
      setProfile(updatedP || {
        id: supaUser.id,
        role: "employer",
        full_name: updatedName,
        city: updatedCity,
        phone: profile?.phone || null,
        avatar_url: profile?.avatar_url || null,
        preferred_language: "en",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const epData = {
        company_name: employerSetupData.companyName.trim(),
        industry: employerSetupData.industry || "Manufacturing",
        company_size: employerSetupData.companySize || "11-50",
      };

      let ep = await updateEmployerProfile(supaUser.id, epData);
      if (!ep) {
        ep = await createEmployerProfile(supaUser.id, epData);
      }

      setEmployerProfile(ep || {
        profile_id: supaUser.id,
        company_name: employerSetupData.companyName.trim(),
        industry: employerSetupData.industry || "Manufacturing",
        company_size: employerSetupData.companySize || "11-50",
        verification_status: "verified",
      });

      if (typeof window !== "undefined") {
        localStorage.setItem(`shram_profile_completed_${supaUser.id}`, "true");
      }
      setNeedsProfileSetup(false);
      setView("employer");
      setPage("dashboard");

      showToastMsg("🎉 Organization setup complete! Welcome to Employer Portal.");

      const eJobs = await getEmployerJobs(supaUser.id);
      setEmployerJobsList(eJobs);
    } catch (err) {
      console.error("Employer setup error:", err);
      setNeedsProfileSetup(false);
      setView("employer");
      setPage("dashboard");
      showToastMsg("🎉 Setup complete!");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // WORKER APPLY TO JOB (Persists to Supabase DB + Notification)
  // ─────────────────────────────────────────────────────────────
  const handleApplyToJob = async (jobId: string) => {
    if (!supaUser || profile?.role !== "worker") return;

    // Check if already applied
    if (myApplicationsList.some((a) => a.job_id === jobId)) {
      showToastMsg("You have already applied to this job.");
      return;
    }

    const targetJob = jobsList.find((j) => j.id === jobId);
    const app = await applyToJob(supaUser.id, jobId);

    // Build complete application entity
    const fullApp: Application = {
      id: app?.id || `app_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      job_id: jobId,
      worker_id: supaUser.id,
      status: "applied",
      match_score: 92,
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      jobs: targetJob || undefined,
      profiles: profile || undefined,
      worker_profiles: workerProfile || undefined,
    };

    // Store in shared persistent applications cache
    if (typeof window !== "undefined") {
      const existingRaw = localStorage.getItem("shram_all_applications");
      const existing: Application[] = existingRaw ? JSON.parse(existingRaw) : [];
      if (!existing.some((a) => a.job_id === jobId && a.worker_id === supaUser.id)) {
        existing.unshift(fullApp);
        localStorage.setItem("shram_all_applications", JSON.stringify(existing));
      }
    }

    showToastMsg("✓ Application submitted successfully!");

    // Refresh worker applications list
    const updatedApps = await getWorkerApplications(supaUser.id);
    setMyApplicationsList(updatedApps.length > 0 ? updatedApps : [fullApp, ...myApplicationsList]);

    // Send real-time notification to employer
    if (targetJob?.employer_id) {
      await createNotification(
        targetJob.employer_id,
        "new_application",
        "New Candidate Application",
        `${profile.full_name} applied for "${targetJob.title}"`,
        "application",
        fullApp.id
      );
    }
  };

  // ─────────────────────────────────────────────────────────────
  // EMPLOYER POST A NEW JOB (Persists to Supabase DB)
  // ─────────────────────────────────────────────────────────────
  const handleCreateJobSubmit = async () => {
    if (!supaUser || !newJobForm.title) return;

    const createdJob = await createJob(supaUser.id, {
      title: newJobForm.title,
      description: newJobForm.description || `Required ${newJobForm.title} for ${newJobForm.city} site.`,
      city: newJobForm.city || "Bengaluru",
      pay_min: Number(newJobForm.payMin) || 20000,
      pay_max: Number(newJobForm.payMax) || 30000,
      employment_type: newJobForm.employmentType || "Full-time",
      shift: newJobForm.shift || "Day Shift",
      experience_min: Number(newJobForm.experienceMin) || 1,
      status: "open",
      work_mode: newJobForm.workMode,
    });

    showToastMsg("🎉 Job requirement posted successfully!");
    setShowJobWizard(false);

    // Refresh employer jobs and open jobs list
    const eJobs = await getEmployerJobs(supaUser.id);
    setEmployerJobsList(eJobs);

    const allJobs = await getOpenJobs();
    setJobsList(allJobs);
  };

  const handleMoveCandidate = async (applicationId: string, newStatus: AppStatus) => {
    if (!supaUser) return;

    const targetApp = employerApplicationsList.find((a) => a.id === applicationId);

    // Update in local shared applications cache
    if (typeof window !== "undefined") {
      const existingRaw = localStorage.getItem("shram_all_applications");
      if (existingRaw) {
        const existing: Application[] = JSON.parse(existingRaw);
        const appIndex = existing.findIndex((a) => a.id === applicationId);
        if (appIndex !== -1) {
          existing[appIndex].status = newStatus;
          existing[appIndex].updated_at = new Date().toISOString();
          localStorage.setItem("shram_all_applications", JSON.stringify(existing));
        }
      }
    }

    await updateApplicationStatus(applicationId, newStatus, supaUser.id);

    showToastMsg(`✓ Candidate advanced to ${newStatus.toUpperCase()}`);

    // Refresh applications list for employer
    const eApps = await getEmployerApplications(supaUser.id);
    setEmployerApplicationsList(eApps);

    // Send real-time notification to worker
    const workerIdToNotify = targetApp?.worker_id || (targetApp?.profiles as any)?.id;
    if (workerIdToNotify) {
      const jobTitle = targetApp?.jobs?.title || "Position";
      await createNotification(
        workerIdToNotify,
        "status_update",
        "🎉 Application Status Updated!",
        `Your application for "${jobTitle}" was moved to ${newStatus.toUpperCase()}`,
        "application",
        applicationId
      );
    }
  };

  // Cancel Worker Application
  const handleCancelApplication = async (appId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Are you sure you want to cancel this job application?")) return;
    try {
      await supabase.from("applications").delete().eq("id", appId);
    } catch (err) {
      console.error("Error deleting application:", err);
    }
    setMyApplicationsList((prev) => prev.filter((a) => a.id !== appId));
    showToastMsg("Application cancelled successfully.");
  };

  // Profile Edit Save
  const handleSaveProfileEdits = async (name: string, city: string, phone: string) => {
    if (!supaUser) return;
    const updated = await updateProfile(supaUser.id, { full_name: name, city, phone });
    if (updated) {
      setProfile(updated);
      showToastMsg("Profile saved successfully!");
    }
  };

  const handleSaveFullWorkerProfile = async () => {
    if (!supaUser) return;
    const updatedP = await updateProfile(supaUser.id, {
      full_name: workerEditData.fullName,
      city: workerEditData.city,
      phone: workerEditData.phone,
    });
    if (updatedP) setProfile(updatedP);

    const wpUpdates = {
      headline: workerEditData.headline,
      experience_years: Number(workerEditData.experienceYears),
      availability: workerEditData.availability,
    };
    let updatedWP = await updateWorkerProfile(supaUser.id, wpUpdates);
    if (!updatedWP) {
      updatedWP = await createWorkerProfile(supaUser.id, wpUpdates);
    }
    if (updatedWP) setWorkerProfile(updatedWP);

    setIsEditingWorkerProfile(false);
    showToastMsg("🎉 Profile & Skill Passport saved successfully!");
  };

  const handleSaveEmployerCompanyProfile = async () => {
    if (!supaUser) return;
    const epUpdates = {
      company_name: employerEditData.companyName,
      industry: employerEditData.industry,
      company_size: employerEditData.companySize,
    };
    let updatedEP = await updateEmployerProfile(supaUser.id, epUpdates);
    if (!updatedEP) {
      updatedEP = await createEmployerProfile(supaUser.id, epUpdates);
    }
    if (updatedEP) setEmployerProfile(updatedEP);

    const updatedP = await updateProfile(supaUser.id, {
      city: employerEditData.city,
    });
    if (updatedP) setProfile(updatedP);

    showToastMsg("🎉 Company Profile updated successfully!");
  };

  // Consolidated default skills across all selected trades for worker setup
  const availableDefaultSkills = useMemo(() => {
    const skillsSet = new Set<string>();
    workerSetupData.selectedTradeIds.forEach((id) => {
      const t = PREDEFINED_TRADES.find((item) => item.id === id);
      if (t) {
        t.defaultSkills.forEach((sk) => skillsSet.add(sk));
      }
    });
    return Array.from(skillsSet);
  }, [workerSetupData.selectedTradeIds]);

  // Dynamically Filtered Jobs based on Worker Skills / Location / Salary / Skill Match Scale
  const filteredJobs = useMemo(() => {
    const workerTrade = workerSetupData.tradeName || profile?.full_name || "";
    const workerCity = profile?.city || workerSetupData.city || "";

    return jobsList.filter((job) => {
      // City filter
      if (searchCityFilter && !job.city.toLowerCase().includes(searchCityFilter.toLowerCase())) return false;

      // Title / Keyword / Description search
      if (
        searchTradeFilter &&
        !job.title.toLowerCase().includes(searchTradeFilter.toLowerCase()) &&
        !job.description.toLowerCase().includes(searchTradeFilter.toLowerCase())
      ) {
        return false;
      }

      // Multi-trade chips filter
      if (selectedTradeFilters.length > 0 && !selectedTradeFilters.includes("all")) {
        const matchesAny = selectedTradeFilters.some((tName) =>
          job.title.toLowerCase().includes(tName.toLowerCase())
        );
        if (!matchesAny) return false;
      }

      // Min Monthly Pay filter
      const maxPay = job.pay_max || job.pay_min || 0;
      if (searchMinPayFilter > 0 && maxPay < searchMinPayFilter) return false;

      // Employment Type filter
      if (searchEmploymentTypeFilter !== "all" && !job.employment_type?.toLowerCase().includes(searchEmploymentTypeFilter.toLowerCase())) {
        return false;
      }

      // Work Mode (Hire vs Work Now) filter
      if (searchWorkModeFilter !== "all") {
        const jMode = job.work_mode || "hire";
        if (jMode !== searchWorkModeFilter) return false;
      }

      // Min Match Score filter (e.g. 85%+ or 75%+)
      if (searchMinMatchFilter > 0) {
        const matchResult = calculateJobSkillMatch(job, userSkills, workerSetupData.tradeName, profile?.city || "");
        const titleLower = (job.title || "").toLowerCase();
        const workerTradeLower = (workerSetupData.tradeName || "").toLowerCase().trim();
        const isTradeMatch = workerTradeLower !== "" && titleLower.includes(workerTradeLower);
        const finalScore = isTradeMatch ? Math.max(matchResult.score, 85) : matchResult.score;
        if (finalScore < searchMinMatchFilter) return false;
      }

      return true;
    });
  }, [
    jobsList,
    searchCityFilter,
    searchTradeFilter,
    selectedTradeFilters,
    searchMinPayFilter,
    searchEmploymentTypeFilter,
    searchMinMatchFilter,
    searchWorkModeFilter,
    userSkills,
    workerSetupData,
    profile,
  ]);

  // Dynamically Filtered Applications for Workers
  const filteredApplications = useMemo(() => {
    return myApplicationsList.filter((app) => {
      if (applicationStatusFilter !== "all" && app.status.toLowerCase() !== applicationStatusFilter.toLowerCase()) {
        return false;
      }
      if (applicationSearchQuery) {
        const q = applicationSearchQuery.toLowerCase();
        const jobTitle = app.jobs?.title || "";
        const companyName = app.jobs?.employer_profiles?.company_name || "";
        if (!jobTitle.toLowerCase().includes(q) && !companyName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [myApplicationsList, applicationStatusFilter, applicationSearchQuery]);

  const activeJob = useMemo(() => {
    return filteredJobs.find((j) => j.id === selectedJobId) || filteredJobs[0] || null;
  }, [filteredJobs, selectedJobId]);

  // Loading Screen
  if (authLoading) {
    return (
      <div className="loading-shell">
        <div className="spinner"></div>
        <p style={{ marginTop: "16px", color: "var(--muted)", fontWeight: 600 }}>Connecting to ShramID...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // LANDING PAGE (Role Selection & Google Authentication)
  // ─────────────────────────────────────────────────────────────
  if (!supaUser) {
    return (
      <div className="landing-shell">
        <header className="landing-nav">
          <div className="brand" style={{ padding: 0 }}>
            <span style={{ fontSize: "24px", fontWeight: 800 }}>Shram<span className="brand-accent" style={{ color: "#ea580c" }}>Connect</span></span>
          </div>

        </header>

        <main className="landing-hero">
          <div className="landing-badge">
            ⚡ Verified Skill Passport & Hyper-Local Workforce Platform
          </div>

          <h1 className="landing-title">
            Direct Jobs for Skilled Workers.<br />
            Verified Talent for Employers.
          </h1>

          <p className="landing-subtitle">
            One account per email. Select your portal below to sign in directly with Google.
          </p>

          <div className="role-grid">
            {/* WORKER ROLE CARD */}
            <div className="role-card worker-card">
              <div>
                <div className="role-icon">🛠️</div>
                <h2>I am a Skilled Worker</h2>
                <p>Build your verified Skill Passport, discover local jobs with transparent pay, and apply directly without a resume.</p>
                <ul className="role-features">
                  <li>Zero resume required — visual skill profile</li>
                  <li>Hyper-local jobs matching your trade</li>
                  <li>Direct updates on application status</li>
                  <li>Voice assistance via ShramSaathi AI</li>
                </ul>
              </div>

              <button className="google-btn" onClick={() => openGoogleAuth("worker")}>
                <GoogleIcon /> Continue as Worker with Google
              </button>
            </div>

            {/* EMPLOYER ROLE CARD */}
            <div className="role-card employer-card">
              <div>
                <div className="role-icon">🏢</div>
                <h2>I am an Employer / Recruiter</h2>
                <p>Post job requirements, search verified blue-collar workforce within your city, and manage candidate pipelines.</p>
                <ul className="role-features">
                  <li>Post jobs & track candidates in real-time</li>
                  <li>Search verified micro-skills & EXIF work proofs</li>
                  <li>Scoped recruitment pipeline & status tracking</li>
                  <li>Instant notifications for new applications</li>
                </ul>
              </div>

              <button className="google-btn" onClick={() => openGoogleAuth("employer")}>
                <GoogleIcon /> Continue as Employer with Google
              </button>
            </div>
          </div>
        </main>

        {/* AUTH ERROR RESTRICTION MODAL */}
        {authErrorModal && (
          <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: "480px" }}>
              <div className="modal-header" style={{ background: "#fef2f2" }}>
                <h2 style={{ color: "#dc2626" }}>⚠️ Role Access Restricted</h2>
                <button className="close-btn" onClick={() => setAuthErrorModal(null)}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: "14px", lineHeight: "1.5", color: "#334155" }}>
                  The email <strong>{authErrorModal.email}</strong> is registered as a <strong>{authErrorModal.existingRole.toUpperCase()}</strong>.
                </p>
                <p style={{ fontSize: "13px", color: "var(--muted)", margin: "12px 0 20px" }}>
                  To maintain data security, accounts cannot switch roles. Please log in to the {authErrorModal.existingRole.toUpperCase()} portal or reset your local registration locks.
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="secondary-btn"
                    style={{ flex: 1 }}
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("shram_registered_email_roles");
                      }
                      setAuthErrorModal(null);
                      showToastMsg("Role registry cleared. Try signing in again.");
                    }}
                  >
                    Reset Role Registration
                  </button>
                  <button className="primary-wide" style={{ flex: 1, marginTop: 0 }} onClick={() => openGoogleAuth(authErrorModal.existingRole)}>
                    Log in as {authErrorModal.existingRole.toUpperCase()}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LANDING PAGE FOOTER */}
        <footer
          style={{
            marginTop: "60px",
            padding: "28px 24px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            textAlign: "center",
            fontSize: "13px",
            color: "#64748b",
            background: "rgba(255,255,255,0.7)",
            borderRadius: "16px",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "18px", marginBottom: "6px" }}>
            Shram<span style={{ color: "#ea580c" }}>Connect</span>
          </div>
          <p style={{ margin: "0 0 10px", color: "#64748b" }}>
            Empowering India's Skilled Workforce with Verified Skill Passports & Transparent Direct Hiring
          </p>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            © 2026 ShramConnect. All rights reserved. · Workforce Connect '26 Hackathon
          </div>
        </footer>

        {toast && <div className="toast">✓ {toast}</div>}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // FIRST LOGIN / INCOMPLETE PROFILE SETUP FLOW
  // ─────────────────────────────────────────────────────────────
  if (needsProfileSetup) {
    if (view === "worker") {
      return (
        <div className="setup-shell">
          <div className="setup-card">
            <div className="setup-header">
              <h1>🛠️ Worker Profile Setup</h1>
              <p>Step {setupStep} of 3 — Tell us what work you can do</p>
            </div>

            <div className="setup-progress">
              <div className={`setup-progress-dot ${setupStep >= 1 ? "active" : ""}`} />
              <div className={`setup-progress-dot ${setupStep >= 2 ? "active" : ""}`} />
              <div className={`setup-progress-dot ${setupStep >= 3 ? "active" : ""}`} />
            </div>

            <div className="setup-body">
              {/* STEP 1: FIRST QUESTION - WHAT WORK DO YOU DO? */}
              {setupStep === 1 && (
                <div>
                  <h2>What work do you do? (Multi-Select Allowed)</h2>
                  <p className="setup-sub">Select one or multiple trades you can perform. Tap trades to toggle selection.</p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="chip-btn selected"
                        onClick={() => {
                          const allIds = PREDEFINED_TRADES.map((t) => t.id);
                          setWorkerSetupData({
                            ...workerSetupData,
                            selectedTradeIds: allIds,
                            tradeName: "All-Round Multi-Skilled Technician",
                            skills: Array.from(new Set(PREDEFINED_TRADES.flatMap((t) => t.defaultSkills))).slice(0, 8),
                          });
                        }}
                        style={{ fontSize: "12px" }}
                      >
                        ✓ Select All Trades ({PREDEFINED_TRADES.length})
                      </button>
                      <button
                        type="button"
                        className="chip-btn"
                        onClick={() => {
                          setWorkerSetupData({
                            ...workerSetupData,
                            selectedTradeIds: [],
                            tradeName: "General Worker",
                            skills: [],
                          });
                        }}
                        style={{ fontSize: "12px" }}
                      >
                        Clear Selection
                      </button>
                    </div>

                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--blue)" }}>
                      {workerSetupData.selectedTradeIds.length === PREDEFINED_TRADES.length
                        ? "✨ All Trades Selected"
                        : `${workerSetupData.selectedTradeIds.length} Selected`}
                    </span>
                  </div>

                  <div className="trade-grid">
                    {PREDEFINED_TRADES.map((t) => {
                      const isSel = workerSetupData.selectedTradeIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          className={`trade-card ${isSel ? "selected" : ""}`}
                          onClick={() => {
                            let nextIds: string[];
                            if (isSel) {
                              nextIds = workerSetupData.selectedTradeIds.filter((id) => id !== t.id);
                            } else {
                              nextIds = [...workerSetupData.selectedTradeIds, t.id];
                            }
                            if (nextIds.length === 0) nextIds = [t.id]; // keep at least one

                            // Recompute combined trade name
                            let newTradeName = "";
                            if (nextIds.length === PREDEFINED_TRADES.length) {
                              newTradeName = "All-Round Multi-Skilled Technician";
                            } else {
                              newTradeName = nextIds
                                .map((id) => (id === "other" ? workerSetupData.customTradeName || "Other Work" : PREDEFINED_TRADES.find((x) => x.id === id)?.name || id))
                                .join(", ");
                            }

                            setWorkerSetupData({
                              ...workerSetupData,
                              selectedTradeIds: nextIds,
                              tradeName: newTradeName,
                              headline: `${workerSetupData.experienceYears} yrs exp · ${newTradeName}`,
                            });
                          }}
                        >
                          <span className="trade-emoji">{t.icon}</span>
                          <span className="trade-name">{t.name}</span>
                          {isSel && <span style={{ marginLeft: "auto", fontSize: "12px", color: "var(--blue)" }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>

                  {workerSetupData.selectedTradeIds.includes("other") && (
                    <div className="form-group" style={{ marginTop: "16px" }}>
                      <label style={{ color: "var(--amber)", fontWeight: 700 }}>✏️ Type your custom job / trade title:*</label>
                      <input
                        value={workerSetupData.customTradeName}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updatedName = workerSetupData.selectedTradeIds
                            .map((id) => (id === "other" ? val || "Other Work" : PREDEFINED_TRADES.find((x) => x.id === id)?.name || id))
                            .join(", ");
                          setWorkerSetupData({
                            ...workerSetupData,
                            customTradeName: val,
                            tradeName: updatedName,
                            headline: `${workerSetupData.experienceYears} yrs exp · ${updatedName}`,
                          });
                        }}
                        placeholder="e.g. Solar Panel Technician, Tailor, Data Entry, Welder Helper..."
                        style={{ borderColor: "var(--amber)", fontSize: "14px", padding: "10px 14px" }}
                      />
                    </div>
                  )}

                  {workerSetupData.selectedTradeIds.length === 0 && (
                    <p style={{ color: "var(--amber)", fontSize: "12px", fontWeight: 700, marginTop: "12px" }}>
                      ⚠️ Please select at least 1 trade category to continue.
                    </p>
                  )}

                  <div className="form-actions">
                    <button
                      className="primary-wide"
                      disabled={workerSetupData.selectedTradeIds.length === 0}
                      style={{ opacity: workerSetupData.selectedTradeIds.length === 0 ? 0.5 : 1, cursor: workerSetupData.selectedTradeIds.length === 0 ? "not-allowed" : "pointer" }}
                      onClick={() => {
                        if (workerSetupData.selectedTradeIds.length > 0) {
                          setSetupStep(2);
                        }
                      }}
                    >
                      Continue to Skills & Experience ➔
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: MICRO SKILLS & EXPERIENCE */}
              {setupStep === 2 && (
                <div>
                  <h2>Micro-Skills & Experience</h2>
                  <p className="setup-sub">Selected Trade(s): <strong>{workerSetupData.tradeName}</strong></p>

                  <div className="form-group">
                    <label>Select or Add Key Skills from Selected Trades:*</label>
                    {workerSetupData.skills.length === 0 && (
                      <p style={{ color: "#f87171", fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>
                        ⚠️ You must select or add at least 1 skill to continue.
                      </p>
                    )}
                    <div className="chip-grid">
                      {availableDefaultSkills.map((sk) => {
                        const isSel = workerSetupData.skills.includes(sk);
                        return (
                          <button
                            key={sk}
                            type="button"
                            className={`chip-btn ${isSel ? "selected" : ""}`}
                            onClick={() => {
                              if (isSel) {
                                setWorkerSetupData({ ...workerSetupData, skills: workerSetupData.skills.filter((s) => s !== sk) });
                              } else {
                                setWorkerSetupData({ ...workerSetupData, skills: [...workerSetupData.skills, sk] });
                              }
                            }}
                          >
                            {isSel ? "✓ " : "+ "} {sk}
                          </button>
                        );
                      })}
                      {/* Custom Added Skills */}
                      {workerSetupData.skills
                        .filter((sk) => !availableDefaultSkills.includes(sk))
                        .map((sk) => (
                          <button
                            key={sk}
                            type="button"
                            className="chip-btn selected"
                            onClick={() => setWorkerSetupData({ ...workerSetupData, skills: workerSetupData.skills.filter((s) => s !== sk) })}
                          >
                            ✓ {sk} (Custom) ✕
                          </button>
                        ))}
                    </div>

                    <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                      <input
                        value={workerSetupData.customSkillInput || ""}
                        onChange={(e) => setWorkerSetupData({ ...workerSetupData, customSkillInput: e.target.value })}
                        placeholder="+ Type custom skill (e.g. Solar Inverter Setup) and press Enter..."
                        style={{ fontSize: "13px" }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && workerSetupData.customSkillInput?.trim()) {
                            e.preventDefault();
                            const newSk = workerSetupData.customSkillInput.trim();
                            if (!workerSetupData.skills.includes(newSk)) {
                              setWorkerSetupData({
                                ...workerSetupData,
                                skills: [...workerSetupData.skills, newSk],
                                customSkillInput: "",
                              });
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ whiteSpace: "nowrap" }}
                        onClick={() => {
                          if (workerSetupData.customSkillInput?.trim()) {
                            const newSk = workerSetupData.customSkillInput.trim();
                            if (!workerSetupData.skills.includes(newSk)) {
                              setWorkerSetupData({
                                ...workerSetupData,
                                skills: [...workerSetupData.skills, newSk],
                                customSkillInput: "",
                              });
                            }
                          }
                        }}
                      >
                        + Add Skill
                      </button>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Years of Experience:</label>
                      <input
                        type="number"
                        min="0"
                        max="40"
                        value={workerSetupData.experienceYears}
                        onChange={(e) => setWorkerSetupData({ ...workerSetupData, experienceYears: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Availability:</label>
                      <select
                        value={workerSetupData.availability}
                        onChange={(e) => setWorkerSetupData({ ...workerSetupData, availability: e.target.value })}
                      >
                        <option value="Immediate">Immediate (Aaj Se)</option>
                        <option value="Within 3 Days">Within 3 Days</option>
                        <option value="Within 1 Week">Within 1 Week</option>
                      </select>
                    </div>
                  </div>

                  {workerSetupData.skills.length === 0 && (
                    <p style={{ color: "#f87171", fontSize: "12px", fontWeight: 700, marginTop: "8px" }}>
                      ⚠️ Please select or add at least 1 micro-skill to proceed to the next step.
                    </p>
                  )}

                  <div className="form-actions">
                    <button className="secondary-btn" onClick={() => setSetupStep(1)}>← Back</button>
                    <button
                      className="primary-wide"
                      disabled={workerSetupData.skills.length === 0}
                      style={{ opacity: workerSetupData.skills.length === 0 ? 0.5 : 1, cursor: workerSetupData.skills.length === 0 ? "not-allowed" : "pointer" }}
                      onClick={() => {
                        if (workerSetupData.skills.length > 0) {
                          setSetupStep(3);
                        }
                      }}
                    >
                      Continue to Location & Pay ➔
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: LOCATION & EXPECTED PAY */}
              {setupStep === 3 && (
                <div>
                  <h2>Location & Salary Expectation</h2>
                  <p className="setup-sub">Set your working hub and expected monthly rate.</p>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Full Name:</label>
                      <input
                        value={workerSetupData.fullName}
                        onChange={(e) => setWorkerSetupData({ ...workerSetupData, fullName: e.target.value })}
                        placeholder="Enter your name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Current City / Area:</label>
                      <input
                        value={workerSetupData.city}
                        onChange={(e) => setWorkerSetupData({ ...workerSetupData, city: e.target.value })}
                        placeholder="e.g. Peenya, Bengaluru"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Expected Min Salary (₹/month):</label>
                      <input
                        type="number"
                        step="1000"
                        value={workerSetupData.expectedPayMin}
                        onChange={(e) => setWorkerSetupData({ ...workerSetupData, expectedPayMin: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Max Travel Radius: {workerSetupData.serviceRadiusKm} km</label>
                      <input
                        type="range"
                        min="2"
                        max="30"
                        value={workerSetupData.serviceRadiusKm}
                        onChange={(e) => setWorkerSetupData({ ...workerSetupData, serviceRadiusKm: Number(e.target.value) })}
                        style={{ marginTop: "12px" }}
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button className="secondary-btn" onClick={() => setSetupStep(2)}>← Back</button>
                    <button className="primary-wide" onClick={completeWorkerSetup}>Save Profile & Open Home 🚀</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    } else {
      // EMPLOYER SETUP
      return (
        <div className="setup-shell">
          <div className="setup-card">
            <div className="setup-header" style={{ background: "linear-gradient(135deg,#065f46,#047857)" }}>
              <h1>🏢 Employer Organization Setup</h1>
              <p>Please complete your hiring profile before accessing the recruitment portal.</p>
            </div>

            <div className="setup-body">
              <div className="form-group">
                <label>Recruiter / Contact Full Name:*</label>
                <input
                  value={employerSetupData.fullName}
                  onChange={(e) => setEmployerSetupData({ ...employerSetupData, fullName: e.target.value })}
                  placeholder="e.g. Anish Kumar"
                />
              </div>

              <div className="form-group">
                <label style={{ color: "var(--navy)", fontWeight: 700 }}>Company / Organization Name:*</label>
                <input
                  value={employerSetupData.companyName}
                  onChange={(e) => setEmployerSetupData({ ...employerSetupData, companyName: e.target.value })}
                  placeholder="e.g. BuildRight Infra Ltd. / Tata Motors / Metro Services..."
                  style={{ borderColor: employerSetupData.companyName ? "#10b981" : "#f59e0b" }}
                />
                {!employerSetupData.companyName && (
                  <small style={{ color: "#f59e0b", fontSize: "11px", display: "block", marginTop: "4px" }}>
                    ⚠️ Organization Name is required to proceed.
                  </small>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Industry Sector:*</label>
                  <select
                    value={employerSetupData.industry}
                    onChange={(e) => setEmployerSetupData({ ...employerSetupData, industry: e.target.value })}
                  >
                    <option value="Manufacturing">Manufacturing & Tooling</option>
                    <option value="Construction">Construction & Civil</option>
                    <option value="Facilities">Facilities & HVAC</option>
                    <option value="Logistics">Logistics & Warehousing</option>
                    <option value="Services">Services & Hospitality</option>
                    <option value="IT Services">IT & Tech Services</option>
                    <option value="Healthcare">Healthcare & Medical</option>
                    <option value="Retail">Retail & Commercial</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Company Size:</label>
                  <select
                    value={employerSetupData.companySize}
                    onChange={(e) => setEmployerSetupData({ ...employerSetupData, companySize: e.target.value })}
                  >
                    <option value="1-10">1 - 10 employees</option>
                    <option value="11-50">11 - 50 employees</option>
                    <option value="51-200">51 - 200 employees</option>
                    <option value="200+">200+ employees</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Primary Hiring City:*</label>
                <input
                  value={employerSetupData.city}
                  onChange={(e) => setEmployerSetupData({ ...employerSetupData, city: e.target.value })}
                  placeholder="e.g. Bengaluru, Mumbai, Delhi..."
                />
              </div>

              <div className="form-actions">
                <button
                  className="primary-wide"
                  style={{
                    background: "#059669",
                    borderColor: "#059669",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "15px",
                    padding: "14px 24px",
                    borderRadius: "8px",
                  }}
                  onClick={completeEmployerSetup}
                >
                  Save & Open Recruitment Dashboard 🚀
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN APPLICATION SHELL (DATA-DRIVEN)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="brand">
          <span style={{ fontSize: "22px", fontWeight: 800 }}>Shram<span className="brand-accent" style={{ color: "#ea580c" }}>Connect</span></span>
        </div>

        <div style={{ fontSize: "10px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", padding: "0 10px 8px" }}>
          {view === "worker" ? "WORKER PORTAL" : "EMPLOYER PORTAL"}
        </div>

        <nav>
          {view === "worker" ? (
            <>
              <button className={page === "home" ? "nav-active" : ""} onClick={() => setPage("home")}>
                ⌂ Home
              </button>
              <button className={page === "jobs" ? "nav-active" : ""} onClick={() => setPage("jobs")}>
                ⌕ Find Work
              </button>
              <button className={page === "applications" ? "nav-active" : ""} onClick={() => setPage("applications")}>
                ▣ My Applications <span className="nav-count">{myApplicationsList.length}</span>
              </button>
              <button className={page === "passport" ? "nav-active" : ""} onClick={() => setPage("passport")}>
                👤 Profile & Skill Passport
              </button>
            </>
          ) : (
            <>
              <button className={page === "dashboard" ? "nav-active" : ""} onClick={() => setPage("dashboard")}>
                📊 Recruitment Dashboard
              </button>
              <button className={page === "talent" ? "nav-active" : ""} onClick={() => setPage("talent")}>
                🔍 Candidate Discovery
              </button>
              <button className={page === "pipeline" ? "nav-active" : ""} onClick={() => setPage("pipeline")}>
                📋 Applications Pipeline <span className="nav-count">{employerApplicationsList.length}</span>
              </button>
              <button className={page === "company" ? "nav-active" : ""} onClick={() => setPage("company")}>
                🏢 Company Profile
              </button>
            </>
          )}
        </nav>

        {/* BOTTOM RIGHT ACCOUNT / PROFILE TRIGGER */}
        <div className="sidebar-bottom">
          <div className="account" style={{ cursor: "pointer" }} onClick={() => setAccountPanelOpen(!accountPanelOpen)}>
            <div className="avatar blue avatar-small" style={{ overflow: "hidden" }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                profile?.full_name?.charAt(0) || "U"
              )}
            </div>
            <div>
              <strong>{profile?.full_name || "User"}</strong>
              <span>{view === "worker" ? (workerProfile?.headline || "Skilled Worker") : (employerProfile?.company_name || "Employer")}</span>
            </div>
            <span style={{ fontSize: "10px", color: "var(--muted)" }}>▲</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="content">
        <div className="page">
          {/* HEADER BAR WITH NOTIFICATION BELL */}
          <header className="page-header">
            <div>
              <p className="eyebrow">{view === "worker" ? "WORKER PORTAL" : "EMPLOYER DASHBOARD"}</p>
              <h1>{profile?.full_name ? `Welcome, ${profile.full_name.split(" ")[0]}` : "Welcome"}</h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Notification Bell */}
              <button className="notif-bell" onClick={() => setNotifPanelOpen(!notifPanelOpen)}>
                🔔
                {unreadNotifCount > 0 && <span className="notif-badge">{unreadNotifCount}</span>}
              </button>

              {view === "employer" && (
                <button className="primary-btn" onClick={() => setShowJobWizard(true)}>
                  + Post New Job
                </button>
              )}
            </div>
          </header>

          {/* NOTIFICATION DRAWER PANEL */}
          {notifPanelOpen && (
            <div className="notif-panel">
              <div className="notif-header">
                <h3>Notifications</h3>
                {unreadNotifCount > 0 && (
                  <button
                    className="text-btn"
                    style={{ fontSize: "11px" }}
                    onClick={async () => {
                      if (supaUser) {
                        await markAllNotificationsRead(supaUser.id);
                        setUnreadNotifCount(0);
                        setNotifications(notifications.map((n) => ({ ...n, read: true })));
                      }
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="empty-state" style={{ padding: "24px" }}>
                    <p style={{ margin: 0 }}>No new notifications.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${!n.read ? "unread" : ""}`}
                      onClick={async () => {
                        await markNotificationRead(n.id);
                        setNotifications(notifications.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
                        setUnreadNotifCount(Math.max(0, unreadNotifCount - 1));
                      }}
                    >
                      <span className={`notif-dot ${n.read ? "read" : ""}`} />
                      <div>
                        <h4>{n.title}</h4>
                        <p>{n.message}</p>
                        <small>{new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* WORKER VIEWS */}
          {/* ───────────────────────────────────────────────────────── */}

          {/* WORKER HOME */}
          {view === "worker" && page === "home" && (
            <div>
              <div className="welcome-card">
                <div>
                  <p className="mini-label" style={{ color: "#93c5fd" }}>VERIFIED SKILL PASSPORT</p>
                  <h2>Hello {profile?.full_name?.split(" ")[0]}!</h2>
                  <p>{workerProfile?.headline || "Complete your skill profile to get discovered by local employers."}</p>
                  <button className="light-btn" onClick={() => setPage("jobs")}>
                    Explore Open Jobs ({jobsList.length}) ➔
                  </button>
                </div>

                <div className="passport-preview">
                  <div className="passport-top">
                    <span>SHRAMID PASSPORT</span>
                    <span>COMPLETION: {workerProfile?.profile_completion || 85}%</span>
                  </div>
                  <div className="passport-person">
                    <div className="avatar blue">
                      {profile?.full_name?.charAt(0) || "W"}
                    </div>
                    <div>
                      <strong>{profile?.full_name}</strong>
                      <span>{profile?.city || "Bengaluru"}</span>
                    </div>
                  </div>
                  <div className="passport-stats">
                    <div>
                      <span>Skills</span>
                      <strong>{userSkills.length} Verified</strong>
                    </div>
                    <div>
                      <span>Availability</span>
                      <strong>{workerProfile?.availability || "Immediate"}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* RECOMMENDED JOBS FROM DB (FILTERED BY WORKER TRADE & SKILLS) */}
              <div style={{ marginTop: "32px" }}>
                <div className="section-head">
                  <h2>Recommended Jobs for Your Skills</h2>
                  <button className="text-btn" onClick={() => setPage("jobs")}>View All ({jobsList.length}) ➔</button>
                </div>

                {(() => {
                  const workerTrade = (workerSetupData.tradeName || "").toLowerCase().trim();
                  // Score and filter jobs strictly against authenticated worker profile
                  const scoredJobs = jobsList
                    .map((j) => {
                      const matchResult = calculateJobSkillMatch(j, userSkills, workerSetupData.tradeName, profile?.city || "");
                      const titleLower = (j.title || "").toLowerCase();
                      const isTradeMatch = workerTrade !== "" && titleLower.includes(workerTrade);
                      const finalScore = isTradeMatch ? Math.max(matchResult.score, 85) : matchResult.score;
                      return { job: j, score: finalScore, matchedSkills: matchResult.matchedSkills };
                    })
                    .filter((item) => item.score > 0 || (workerTrade !== "" && item.job.title.toLowerCase().includes(workerTrade)))
                    .sort((a, b) => b.score - a.score);

                  if (scoredJobs.length === 0) {
                    return (
                      <div className="empty-state panel" style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "32px", textAlign: "center", borderRadius: "16px" }}>
                        <div className="empty-icon" style={{ fontSize: "36px", marginBottom: "8px" }}>🛠️</div>
                        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
                          No {workerSetupData.tradeName || "Trade"} Jobs Currently Match Your Profile
                        </h3>
                        <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px", maxWidth: "480px", marginLeft: "auto", marginRight: "auto" }}>
                          There are currently no active listings specifically for <strong>{workerSetupData.tradeName || "your trade"}</strong> in {profile?.city || "your location"}. Explore all available opportunities across all trades!
                        </p>
                        <button
                          className="primary-btn"
                          style={{ width: "auto", margin: "0 auto", padding: "10px 20px" }}
                          onClick={() => setPage("jobs")}
                        >
                          Explore All Open Jobs ({jobsList.length}) ➔
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="job-list">
                      {scoredJobs.slice(0, 3).map(({ job: j, score }) => {
                        const isApplied = myApplicationsList.some((a) => a.job_id === j.id);
                        return (
                          <div key={j.id} className="job-card">
                            <div className="company-logo">{j.title.charAt(0)}</div>
                            <div className="job-main">
                              <div className="job-title-row">
                                <h3>{j.title}</h3>
                                <span className="trust-badge green" style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "12px", background: "#dcfce7", color: "#15803d", fontWeight: 700 }}>
                                  🎯 {score}% Trade Match
                                </span>
                              </div>
                              <p>{j.employer_profiles?.company_name || "Verified Employer"} · {j.city}</p>
                              <div className="job-meta">
                                <span>💰 ₹{j.pay_min?.toLocaleString()} - ₹{j.pay_max?.toLocaleString()} / mo</span>
                                <span>⏱️ {j.employment_type}</span>
                              </div>
                            </div>
                            <div className="match-box">
                              <button
                                className={isApplied ? "applied-wide" : "primary-btn"}
                                style={{ width: "auto", marginTop: 0 }}
                                disabled={isApplied}
                                onClick={() => handleApplyToJob(j.id)}
                              >
                                {isApplied ? "Applied ✓" : "Apply Now"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* WORKER FIND WORK (JOBS DISCOVERY) */}
          {view === "worker" && page === "jobs" && (
            <div>
              {/* TWO WORK MODES: HIRE vs WORK NOW */}
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px", background: "#f1f5f9", padding: "6px", borderRadius: "12px" }}>
                <button
                  type="button"
                  onClick={() => setSearchWorkModeFilter("all")}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: searchWorkModeFilter === "all" ? "#ffffff" : "transparent",
                    color: searchWorkModeFilter === "all" ? "#0f172a" : "#64748b",
                    fontWeight: 700,
                    fontSize: "13px",
                    boxShadow: searchWorkModeFilter === "all" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                    cursor: "pointer",
                  }}
                >
                  ✨ All Work Modes ({jobsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSearchWorkModeFilter("hire")}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: searchWorkModeFilter === "hire" ? "#2563eb" : "transparent",
                    color: searchWorkModeFilter === "hire" ? "#ffffff" : "#64748b",
                    fontWeight: 700,
                    fontSize: "13px",
                    boxShadow: searchWorkModeFilter === "hire" ? "0 2px 4px rgba(37,99,235,0.2)" : "none",
                    cursor: "pointer",
                  }}
                >
                  💼 HIRE (Permanent / Contract)
                </button>
                <button
                  type="button"
                  onClick={() => setSearchWorkModeFilter("work_now")}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: searchWorkModeFilter === "work_now" ? "#d97706" : "transparent",
                    color: searchWorkModeFilter === "work_now" ? "#ffffff" : "#64748b",
                    fontWeight: 700,
                    fontSize: "13px",
                    boxShadow: searchWorkModeFilter === "work_now" ? "0 2px 4px rgba(217,119,6,0.2)" : "none",
                    cursor: "pointer",
                  }}
                >
                  ⚡ WORK NOW (Urgent One-Time)
                </button>
              </div>

              {/* MULTI-SELECT TRADE CATEGORY CHIPS */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                <button
                  type="button"
                  className={`chip-btn ${selectedTradeFilters.length === 0 || selectedTradeFilters.includes("all") ? "selected" : ""}`}
                  onClick={() => setSelectedTradeFilters(["all"])}
                >
                  ✨ All Trades ({jobsList.length})
                </button>
                {PREDEFINED_TRADES.map((t) => {
                  const isSel = selectedTradeFilters.includes(t.name);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`chip-btn ${isSel ? "selected" : ""}`}
                      onClick={() => {
                        if (isSel) {
                          const updated = selectedTradeFilters.filter((x) => x !== t.name);
                          setSelectedTradeFilters(updated.length === 0 ? ["all"] : updated);
                        } else {
                          const clean = selectedTradeFilters.filter((x) => x !== "all");
                          setSelectedTradeFilters([...clean, t.name]);
                        }
                      }}
                    >
                      {t.icon} {t.name}
                    </button>
                  );
                })}
              </div>

              {/* ENHANCED SEARCH & MULTI-FILTER BAR */}
              <div className="search-row" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
                <input
                  style={{ flex: "1 1 200px" }}
                  placeholder="🔍 Search by job title, skill or keyword..."
                  value={searchTradeFilter}
                  onChange={(e) => setSearchTradeFilter(e.target.value)}
                />
                <input
                  style={{ flex: "1 1 140px" }}
                  placeholder="📍 Filter by city..."
                  value={searchCityFilter}
                  onChange={(e) => setSearchCityFilter(e.target.value)}
                />
                <select
                  style={{ flex: "1 1 150px", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff" }}
                  value={searchMinPayFilter}
                  onChange={(e) => setSearchMinPayFilter(Number(e.target.value))}
                >
                  <option value={0}>💰 Any Salary</option>
                  <option value={15000}>Min ₹15,000/mo</option>
                  <option value={20000}>Min ₹20,000/mo</option>
                  <option value={25000}>Min ₹25,000/mo</option>
                  <option value={35000}>Min ₹35,000/mo</option>
                </select>
                <select
                  style={{ flex: "1 1 150px", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff" }}
                  value={searchEmploymentTypeFilter}
                  onChange={(e) => setSearchEmploymentTypeFilter(e.target.value)}
                >
                  <option value="all">⏱️ All Employment</option>
                  <option value="Full-time">Full-time Permanent</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contractual</option>
                </select>
                <select
                  style={{ flex: "1 1 150px", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "#fff" }}
                  value={searchMinMatchFilter}
                  onChange={(e) => setSearchMinMatchFilter(Number(e.target.value))}
                >
                  <option value={0}>🎯 All Match Scores</option>
                  <option value={85}>85%+ High Match</option>
                  <option value={75}>75%+ Good Match</option>
                </select>
              </div>

              {filteredJobs.length === 0 ? (
                <div className="empty-state panel">
                  <div className="empty-icon">⌕</div>
                  <h3>No matching jobs found.</h3>
                  <p>Try clearing your filters or updating your trade skills in your profile.</p>
                  <button
                    className="primary-btn"
                    style={{ marginTop: "12px" }}
                    onClick={() => {
                      setSearchTradeFilter("");
                      setSearchCityFilter("");
                      setSearchMinPayFilter(0);
                      setSearchEmploymentTypeFilter("all");
                      setSearchMinMatchFilter(0);
                      setSelectedTradeFilters(["all"]);
                    }}
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="job-layout">
                  <div className="job-results">
                    <p className="result-count">Showing {filteredJobs.length} active job listings</p>

                    {filteredJobs.map((j) => {
                      const isSelected = activeJob?.id === j.id;
                      const isApplied = myApplicationsList.some((a) => a.job_id === j.id);
                      const match = calculateJobSkillMatch(j, userSkills, workerSetupData.tradeName, profile?.city || "");

                      return (
                        <div
                          key={j.id}
                          className={`job-select ${isSelected ? "job-selected" : ""}`}
                          onClick={() => setSelectedJobId(j.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="job-card">
                            <div className="company-logo">{j.title.charAt(0)}</div>
                            <div className="job-main">
                              <div className="job-title-row">
                                <h3>{j.title}</h3>
                                <span className="urgent">Open</span>
                              </div>
                              <p>{j.employer_profiles?.company_name || "Employer"} · {j.city}</p>
                              <div className="job-meta" style={{ flexWrap: "wrap", gap: "6px" }}>
                                <span>💰 ₹{j.pay_min?.toLocaleString()} – ₹{j.pay_max?.toLocaleString()}</span>
                                <span>⏱️ {j.employment_type}</span>
                                {j.work_mode === "work_now" ? (
                                  <span style={{ color: "#d97706", fontWeight: 700 }}>⚡ WORK NOW</span>
                                ) : (
                                  <span style={{ color: "#2563eb", fontWeight: 700 }}>💼 HIRE</span>
                                )}
                              </div>

                              {/* SCAM SHIELD SAFETY BADGE */}
                              <div style={{ marginTop: "6px" }}>
                                {(j.pay_min || 0) > 70000 ? (
                                  <span style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 700 }}>
                                    🚨 Scam Shield Alert: Unusually High Pay · Verify Details
                                  </span>
                                ) : (
                                  <span style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 700 }}>
                                    🛡️ ShramID Scam Shield: Verified Employer · Never Pay to Apply
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="match-box" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                              {/* SKILL MATCH SCALE BADGE & PROGRESS BAR */}
                              <div
                                style={{
                                  background: match.score >= 85 ? "#ecfdf5" : match.score >= 75 ? "#fffbeb" : "#eff6ff",
                                  border: `1px solid ${match.color}`,
                                  color: match.color,
                                  borderRadius: "20px",
                                  padding: "3px 9px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                🎯 {match.score}% Match
                              </div>
                              <div style={{ width: "80px", height: "5px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ width: `${match.score}%`, height: "100%", background: match.color }} />
                              </div>

                              <button
                                className={isApplied ? "applied-wide" : "primary-btn"}
                                style={{ width: "auto", marginTop: "4px" }}
                                disabled={isApplied}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyToJob(j.id);
                                }}
                              >
                                {isApplied ? "Applied ✓" : "View job"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* JOB DETAIL SIDE PANEL WITH SKILL MATCH SCALE BREAKDOWN */}
                  {activeJob && (() => {
                    const activeMatch = calculateJobSkillMatch(activeJob, userSkills, workerSetupData.tradeName, profile?.city || "");
                    const isApplied = myApplicationsList.some((a) => a.job_id === activeJob.id);

                    return (
                      <div className="job-detail">
                        <h2>{activeJob.title}</h2>
                        <p className="company-name">{activeJob.employer_profiles?.company_name || "Verified Organization"}</p>

                        <div className="detail-divider" />

                        {/* SKILL MATCH SCALE BREAKDOWN */}
                        <div
                          style={{
                            background: "var(--light-bg)",
                            border: `1px solid ${activeMatch.color}`,
                            borderRadius: "10px",
                            padding: "14px",
                            marginBottom: "16px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <strong style={{ fontSize: "14px", color: "var(--navy)" }}>🎯 Skill Match Scale: {activeMatch.score}%</strong>
                            <span
                              style={{
                                background: activeMatch.color,
                                color: "#ffffff",
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "12px",
                              }}
                            >
                              {activeMatch.label}
                            </span>
                          </div>

                          <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden", marginBottom: "10px" }}>
                            <div style={{ width: `${activeMatch.score}%`, height: "100%", background: activeMatch.color, transition: "width 0.4s ease" }} />
                          </div>

                          <p style={{ fontSize: "12px", color: "#475569", margin: 0, lineHeight: "1.4" }}>
                            {activeMatch.score >= 85
                              ? "✨ High alignment! Your trade skills and location closely match this job requirement."
                              : "👍 Good match! You have relevant skills for this position."}
                          </p>
                        </div>

                        <div className="detail-grid">
                          <div>
                            <span>Location</span>
                            <strong style={{ display: "block", color: "#0f172a" }}>{activeJob.city}</strong>
                          </div>
                          <div>
                            <span>Monthly Pay</span>
                            <strong style={{ display: "block", color: "#0f172a" }}>
                              ₹{activeJob.pay_min?.toLocaleString()} - ₹{activeJob.pay_max?.toLocaleString()}
                            </strong>
                          </div>
                          <div>
                            <span>Employment</span>
                            <strong style={{ display: "block", color: "#0f172a" }}>{activeJob.employment_type}</strong>
                          </div>
                          <div>
                            <span>Shift</span>
                            <strong style={{ display: "block", color: "#0f172a" }}>{activeJob.shift || "Regular"}</strong>
                          </div>
                        </div>

                        <div className="detail-divider" />

                        <h3>Job Description</h3>
                        <p style={{ fontSize: "13px", lineHeight: "1.5", color: "#475569" }}>{activeJob.description}</p>

                        {isApplied ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                            <button className="applied-wide" disabled style={{ width: "100%" }}>
                              Application Submitted ✓
                            </button>
                            <button
                              type="button"
                              style={{
                                width: "100%",
                                padding: "10px",
                                background: "#fef2f2",
                                color: "#dc2626",
                                border: "1px solid #fca5a5",
                                borderRadius: "10px",
                                fontWeight: 700,
                                fontSize: "13px",
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                const app = myApplicationsList.find((a) => a.job_id === activeJob.id);
                                if (app) handleCancelApplication(app.id);
                              }}
                            >
                              🗑️ Cancel Application
                            </button>
                          </div>
                        ) : (
                          <button
                            className="primary-wide"
                            onClick={() => handleApplyToJob(activeJob.id)}
                          >
                            Apply with Skill Passport ➔
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* WORKER APPLICATIONS DASHBOARD */}
          {view === "worker" && page === "applications" && (
            <div>
              <div className="timeline-panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h2>My Submitted Applications ({myApplicationsList.length})</h2>
                </div>

                {/* SEARCH & STATUS FILTERS FOR MY APPLICATIONS */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
                  <input
                    style={{ flex: "1 1 240px", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)" }}
                    placeholder="🔍 Search applications by job title or employer..."
                    value={applicationSearchQuery}
                    onChange={(e) => setApplicationSearchQuery(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    {["all", "applied", "shortlisted", "hired", "rejected"].map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`chip-btn ${applicationStatusFilter === st ? "selected" : ""}`}
                        onClick={() => setApplicationStatusFilter(st)}
                        style={{ textTransform: "capitalize" }}
                      >
                        {st === "all" ? `All (${myApplicationsList.length})` : st}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredApplications.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>No applications match your search.</h3>
                    <p>Explore open jobs matching your trade and submit your Skill Passport with 1 click.</p>
                    <button className="primary-btn" onClick={() => setPage("jobs")}>Find Jobs Now</button>
                  </div>
                ) : (
                  filteredApplications.map((app) => (
                    <div key={app.id} className="application-row">
                      <div className="company-logo">
                        {app.jobs?.title?.charAt(0) || "J"}
                      </div>
                      <div>
                        <h3>{app.jobs?.title}</h3>
                        <p>{app.jobs?.employer_profiles?.company_name || "Employer"} · {app.jobs?.city}</p>
                      </div>
                      <div className="application-status" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div>
                          <span className={`status ${app.status.toLowerCase()}`}>{app.status.toUpperCase()}</span>
                          <small style={{ display: "block", marginTop: "2px" }}>Applied: {new Date(app.applied_at).toLocaleDateString()}</small>
                        </div>
                        <button
                          type="button"
                          style={{
                            padding: "6px 12px",
                            background: "#fef2f2",
                            color: "#dc2626",
                            border: "1px solid #fca5a5",
                            borderRadius: "8px",
                            fontWeight: 700,
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                          onClick={() => handleCancelApplication(app.id)}
                        >
                          🗑️ Cancel
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* WORKER SKILL PASSPORT & EDITABLE PROFILE */}
          {view === "worker" && page === "passport" && (
            <div>
              <div className="passport-hero">
                <div className="passport-identity">
                  <div className="avatar blue" style={{ width: "56px", height: "56px", fontSize: "20px", fontWeight: 700 }}>
                    {profile?.full_name?.charAt(0) || "W"}
                  </div>
                  <div>
                    <h2>{profile?.full_name || "Skilled Worker"}</h2>
                    <p>{workerProfile?.headline || "Certified Skilled Professional"}</p>
                    <span className="trust-badge green">✓ ShramID Verified Skill Passport</span>
                  </div>
                </div>

                <div className="passport-hero-stats" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <button
                    className="primary-btn"
                    style={{ background: "#0284c7", padding: "8px 16px", borderRadius: "8px" }}
                    onClick={() => setShowQRModal(true)}
                  >
                    📱 Share ShramID QR
                  </button>
                  <button
                    className="primary-btn"
                    style={{ background: isEditingWorkerProfile ? "#475569" : "#2563eb", padding: "8px 16px", borderRadius: "8px" }}
                    onClick={() => {
                      if (!isEditingWorkerProfile) {
                        setWorkerEditData({
                          fullName: profile?.full_name || "",
                          city: profile?.city || "Bengaluru",
                          phone: profile?.phone || "",
                          headline: workerProfile?.headline || "Skilled Technician",
                          experienceYears: workerProfile?.experience_years || 2,
                          availability: workerProfile?.availability || "Immediate",
                        });
                      }
                      setIsEditingWorkerProfile(!isEditingWorkerProfile);
                    }}
                  >
                    {isEditingWorkerProfile ? "✕ Cancel Editing" : "✏️ Edit Profile Info"}
                  </button>
                </div>
              </div>

              {/* INLINE WORKER EDIT FORM */}
              {isEditingWorkerProfile && (
                <div className="panel" style={{ margin: "20px 0", padding: "24px", borderRadius: "12px", border: "1px solid #3b82f6", background: "#eff6ff" }}>
                  <h3 style={{ margin: "0 0 16px", color: "#1e3a8a", fontSize: "16px", fontWeight: 700 }}>✏️ Edit Personal Profile & Work Preferences</h3>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Full Name</label>
                      <input
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                        value={workerEditData.fullName}
                        onChange={(e) => setWorkerEditData({ ...workerEditData, fullName: e.target.value })}
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>City / Work Location</label>
                      <input
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                        value={workerEditData.city}
                        onChange={(e) => setWorkerEditData({ ...workerEditData, city: e.target.value })}
                        placeholder="e.g. Bengaluru, Mumbai..."
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Contact Phone</label>
                      <input
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                        value={workerEditData.phone}
                        onChange={(e) => setWorkerEditData({ ...workerEditData, phone: e.target.value })}
                        placeholder="10-digit mobile number"
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Trade Title / Headline</label>
                      <input
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                        value={workerEditData.headline}
                        onChange={(e) => setWorkerEditData({ ...workerEditData, headline: e.target.value })}
                        placeholder="e.g. Certified Industrial Electrician"
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Experience (Years)</label>
                      <input
                        type="number"
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                        value={workerEditData.experienceYears}
                        onChange={(e) => setWorkerEditData({ ...workerEditData, experienceYears: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Work Availability</label>
                      <select
                        style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                        value={workerEditData.availability}
                        onChange={(e) => setWorkerEditData({ ...workerEditData, availability: e.target.value })}
                      >
                        <option value="Immediate">Immediate</option>
                        <option value="Within 3 Days">Within 3 Days</option>
                        <option value="Within 1 Week">Within 1 Week</option>
                        <option value="15 Days">15 Days</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                    <button
                      className="primary-btn"
                      style={{ background: "#059669", padding: "10px 20px", borderRadius: "8px", fontWeight: 700 }}
                      onClick={handleSaveFullWorkerProfile}
                    >
                      💾 Save Profile Changes
                    </button>
                  </div>
                </div>
              )}

              <div className="passport-layout" style={{ marginTop: "20px" }}>
                <div className="passport-section panel">
                  <h3>Verified Skills & Micro-Credentials</h3>
                  <div className="skill-rows">
                    {userSkills.length === 0 ? (
                      <p style={{ fontSize: "13px", color: "var(--muted)" }}>No micro-skills added yet. Click edit profile above to update your trade skills.</p>
                    ) : (
                      userSkills.map((sk) => (
                        <div key={sk.id} className="skill-row">
                          <span className="skill-dot">✓</span>
                          <div>
                            <strong>{sk.name}</strong>
                            <small>Category: {sk.category}</small>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="passport-section panel">
                  <h3>Preferences & Account Information</h3>
                  <div style={{ display: "grid", gap: "12px", fontSize: "13px", marginTop: "12px" }}>
                    <div>
                      <span style={{ color: "var(--muted)" }}>Full Name: </span>
                      <strong>{profile?.full_name || "Not set"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)" }}>Contact Phone: </span>
                      <strong>{profile?.phone || "Not set"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)" }}>Current City Hub: </span>
                      <strong>{profile?.city || "Not set"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)" }}>Availability: </span>
                      <strong>{workerProfile?.availability || "Immediate"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)" }}>Experience: </span>
                      <strong>{workerProfile?.experience_years ?? 2} Years</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* EMPLOYER VIEWS */}
          {/* ───────────────────────────────────────────────────────── */}

          {/* EMPLOYER RECRUITMENT DASHBOARD */}
          {view === "employer" && page === "dashboard" && (
            <div>
              <div className="metric-grid">
                <div className="metric">
                  <span className="metric-icon blue">💼</span>
                  <p>Active Posted Jobs</p>
                  <strong>{employerJobsList.length}</strong>
                  <small>Owned by {employerProfile?.company_name}</small>
                </div>

                <div className="metric">
                  <span className="metric-icon orange">📩</span>
                  <p>Applications Received</p>
                  <strong>{employerApplicationsList.length}</strong>
                  <small>For your active jobs</small>
                </div>

                <div className="metric">
                  <span className="metric-icon green">⭐</span>
                  <p>Shortlisted</p>
                  <strong>{employerApplicationsList.filter((a) => a.status === "shortlisted").length}</strong>
                  <small>In interview pipeline</small>
                </div>

                <div className="metric">
                  <span className="metric-icon violet">✅</span>
                  <p>Hired Candidates</p>
                  <strong>{employerApplicationsList.filter((a) => a.status === "hired").length}</strong>
                  <small>Successfully placed</small>
                </div>
              </div>

              {/* POSTED JOBS TABLE */}
              <div className="panel" style={{ marginTop: "24px" }}>
                <div className="panel-title" style={{ padding: "20px" }}>
                  <h2>My Posted Job Requirements ({employerJobsList.length})</h2>
                  <button className="primary-btn" onClick={() => setShowJobWizard(true)}>+ Post New Job</button>
                </div>

                {employerJobsList.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📢</div>
                    <h3>Create your first job to start receiving applications.</h3>
                    <p>Post your staffing requirements with custom pay, shift, and city location.</p>
                    <button className="primary-btn" onClick={() => setShowJobWizard(true)}>+ Create First Job</button>
                  </div>
                ) : (
                  <div className="jobs-table">
                    <div className="table-head">
                      <span>JOB TITLE</span>
                      <span>LOCATION</span>
                      <span>MONTHLY PAY</span>
                      <span>APPLICANTS</span>
                      <span>STATUS</span>
                    </div>

                    {employerJobsList.map((job) => {
                      const count = employerApplicationsList.filter((a) => a.job_id === job.id).length;
                      return (
                        <div key={job.id} className="table-row">
                          <div>
                            <strong>{job.title}</strong>
                            <small>{job.employment_type}</small>
                          </div>
                          <span>{job.city}</span>
                          <span>₹{job.pay_min?.toLocaleString()} - ₹{job.pay_max?.toLocaleString()}</span>
                          <span style={{ fontWeight: 800, color: "var(--blue)" }}>{count} Applicants</span>
                          <span className="urgent">{job.status.toUpperCase()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EMPLOYER CANDIDATE DISCOVERY */}
          {view === "employer" && page === "talent" && (
            <div>
              <div className="search-row">
                <input
                  placeholder="🔍 Search workers by city..."
                  value={searchCityFilter}
                  onChange={(e) => setSearchCityFilter(e.target.value)}
                />
              </div>

              {candidateWorkersList.length === 0 ? (
                <div className="empty-state panel">
                  <div className="empty-icon">👷</div>
                  <h3>No registered workers found yet.</h3>
                  <p>When skilled workers register and complete their profile, they will appear here.</p>
                </div>
              ) : (
                <div className="job-list">
                  {candidateWorkersList.map((cw) => (
                    <div
                      key={cw.id}
                      className="candidate-card"
                      style={{ cursor: "pointer", transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
                      onClick={() => setSelectedCandidateModal(cw)}
                    >
                      <div className="avatar blue" style={{ width: "48px", height: "48px", fontSize: "18px", fontWeight: 700 }}>
                        {cw.full_name?.charAt(0) || "W"}
                      </div>
                      <div className="candidate-main">
                        <div className="candidate-heading">
                          <h3>{cw.full_name || "Skilled Candidate"}</h3>
                          <span className="trust-badge green">✓ Verified Passport</span>
                        </div>
                        <p>{cw.worker_profiles?.headline || "Skilled Worker"} · {cw.city || "Bengaluru"}</p>
                        <div className="candidate-evidence" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <span>Experience: {cw.worker_profiles?.experience_years ?? 2} years</span>
                            <span style={{ marginLeft: "12px" }}>Availability: {cw.worker_profiles?.availability || "Immediate"}</span>
                          </div>
                          <span style={{ color: "var(--blue)", fontWeight: 700, fontSize: "12px" }}>View Full Profile ➔</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* EMPLOYER PIPELINE */}
          {view === "employer" && page === "pipeline" && (
            <div>
              <h2>Recruitment Pipeline ({employerApplicationsList.length})</h2>

              {employerApplicationsList.length === 0 ? (
                <div className="empty-state panel">
                  <div className="empty-icon">📋</div>
                  <h3>No candidate applications received yet.</h3>
                  <p>Applications submitted by workers to your jobs will appear here in real-time.</p>
                </div>
              ) : (
                <div className="pipeline-board" style={{ marginTop: "20px" }}>
                  {(["applied", "shortlisted", "interview", "hired"] as AppStatus[]).map((stage) => {
                    const stageApps = employerApplicationsList.filter((a) => a.status === stage);
                    return (
                      <div key={stage} className="pipeline-column">
                        <div className="pipeline-title">
                          <h3>{stage.toUpperCase()}</h3>
                          <span>{stageApps.length}</span>
                        </div>

                        {stageApps.map((app) => {
                          const candidateName = app.profiles?.full_name || (app as any).worker_name || "Applicant Candidate";
                          const candidateCity = app.profiles?.city || app.jobs?.city || "Bengaluru";
                          const expYears = app.worker_profiles?.experience_years ?? 2;
                          const nextMap: Record<string, AppStatus> = {
                            applied: "shortlisted",
                            shortlisted: "interview",
                            interview: "hired",
                          };
                          const labelMap: Record<string, string> = {
                            applied: "Shortlist",
                            shortlisted: "Interview",
                            interview: "Hire Candidate",
                          };

                          return (
                            <div key={app.id} className="pipeline-card" style={{ padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--navy)" }}>{candidateName}</h4>
                                <span className="trust-badge green" style={{ fontSize: "10px", padding: "2px 6px" }}>✓ Verified</span>
                              </div>
                              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--blue)", fontWeight: 600 }}>Job: {app.jobs?.title || "Staff Requirement"}</p>
                              <div style={{ marginTop: "6px", fontSize: "11px", color: "#64748b", display: "flex", flexDirection: "column", gap: "2px" }}>
                                <span>📍 Location: {candidateCity}</span>
                                <span>💼 Experience: {expYears} years</span>
                              </div>

                              {stage !== "hired" && (
                                <div style={{ marginTop: "12px" }}>
                                  <button
                                    className="move-btn"
                                    style={{
                                      width: "100%",
                                      background: "#059669",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "6px",
                                      padding: "6px 10px",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                    onClick={() => handleMoveCandidate(app.id, nextMap[stage])}
                                  >
                                    Advance to {labelMap[stage]} ➔
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* EMPLOYER COMPANY PROFILE */}
          {view === "employer" && page === "company" && (
            <div>
              <div className="passport-hero" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
                <div className="passport-identity">
                  <div className="avatar blue" style={{ width: "56px", height: "56px", fontSize: "22px", fontWeight: 700, background: "#2563eb" }}>
                    {employerProfile?.company_name?.charAt(0) || "C"}
                  </div>
                  <div>
                    <h2 style={{ color: "white" }}>{employerProfile?.company_name || "Organization Profile"}</h2>
                    <p style={{ color: "#94a3b8" }}>{employerProfile?.industry || "Industrial Employer"} · {profile?.city || "Bengaluru"}</p>
                    <span className="trust-badge green">✓ Verified Employer Account</span>
                  </div>
                </div>
              </div>

              <div className="panel" style={{ margin: "20px 0", padding: "24px", borderRadius: "12px", background: "white", border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 16px", color: "var(--navy)", fontSize: "16px", fontWeight: 700 }}>🏢 Organization Profile Details</h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Company / Organization Name</label>
                    <input
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                      value={employerEditData.companyName || employerProfile?.company_name || ""}
                      onChange={(e) => setEmployerEditData({ ...employerEditData, companyName: e.target.value })}
                      placeholder="e.g. Acme Tech Infrastructure"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Primary Hiring City</label>
                    <input
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                      value={employerEditData.city || profile?.city || ""}
                      onChange={(e) => setEmployerEditData({ ...employerEditData, city: e.target.value })}
                      placeholder="e.g. Bengaluru, Delhi..."
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Industry Sector</label>
                    <select
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                      value={employerEditData.industry || employerProfile?.industry || "Services"}
                      onChange={(e) => setEmployerEditData({ ...employerEditData, industry: e.target.value })}
                    >
                      <option value="Construction & Infrastructure">Construction & Infrastructure</option>
                      <option value="Electrical & Power Systems">Electrical & Power Systems</option>
                      <option value="Logistics & Warehousing">Logistics & Warehousing</option>
                      <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                      <option value="Plumbing & Sanitation">Plumbing & Sanitation</option>
                      <option value="Retail & Commercial">Retail & Commercial</option>
                      <option value="Facilities & Maintenance">Facilities & Maintenance</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>Company Workforce Size</label>
                    <select
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                      value={employerEditData.companySize || employerProfile?.company_size || "11-50"}
                      onChange={(e) => setEmployerEditData({ ...employerEditData, companySize: e.target.value })}
                    >
                      <option value="1-10">1-10 Employees</option>
                      <option value="11-50">11-50 Employees</option>
                      <option value="51-200">51-200 Employees</option>
                      <option value="201-500">201-500 Employees</option>
                      <option value="500+">500+ Workforce</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="primary-btn"
                    style={{ background: "#059669", padding: "10px 20px", borderRadius: "8px", fontWeight: 700 }}
                    onClick={handleSaveEmployerCompanyProfile}
                  >
                    💾 Save Organization Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GLOBAL APP SHELL FOOTER */}
          <footer
            style={{
              marginTop: "48px",
              padding: "24px 0 12px",
              borderTop: "1px solid var(--line)",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              fontSize: "13px",
              color: "var(--muted)",
            }}
          >
            <div>
              <strong style={{ color: "#0f172a", fontWeight: 700 }}>Shram<span style={{ color: "#ea580c" }}>Connect</span></strong> — Skills Meet Opportunities
            </div>
            <div>
              Verified Blue-Collar Skill Passport & Direct Recruitment Platform
            </div>
            <div style={{ fontSize: "12px" }}>
              © 2026 ShramConnect · Workforce Connect '26 Hackathon
            </div>
          </footer>
        </div>
      </main>

      {/* ───────────────────────────────────────────────────────── */}
      {/* ACCOUNT / PROFILE EDIT DRAWER PANEL */}
      {/* ───────────────────────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────── */}
      {/* ACCOUNT / PROFILE EDIT DRAWER PANEL */}
      {/* ───────────────────────────────────────────────────────── */}
      {accountPanelOpen && (
        <div className="account-panel">
          <div className="account-panel-header">
            <div className="account-initials">
              {(profile?.full_name || supaUser?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#fff" }}>
                {profile?.full_name || employerProfile?.company_name || supaUser?.email?.split("@")[0] || "Registered User"}
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
                {supaUser?.email || "registered_user@shramid.in"}
              </p>
            </div>
            <button className="close-btn" style={{ color: "#fff", marginLeft: "auto" }} onClick={() => setAccountPanelOpen(false)}>
              ✕
            </button>
          </div>

          <div className="account-section">
            <h4>Account Role & Identity</h4>
            <div className="account-field">
              <label>Role:</label>
              <span style={{ fontWeight: 700, color: (profile?.role || view) === "employer" ? "#059669" : "#2563eb" }}>
                {((profile?.role || view || "employer") as string).toUpperCase()}
              </span>
            </div>
            <div className="account-field">
              <label>User ID:</label>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--navy)", fontFamily: "monospace", wordBreak: "break-all" }}>
                {profile?.id || supaUser?.id || `SHRAM-${supaUser?.email?.split("@")[0] || "8941"}`}
              </span>
            </div>
          </div>

          <div className="account-section">
            <h4>Profile Information</h4>
            <div className="account-field">
              <label>Full Name:</label>
              <input
                value={accountForm.fullName}
                onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                onBlur={() => handleSaveProfileEdits(accountForm.fullName, accountForm.city, accountForm.phone)}
                placeholder="Enter full name"
              />
            </div>
            <div className="account-field">
              <label>City Hub:</label>
              <input
                value={accountForm.city}
                onChange={(e) => setAccountForm({ ...accountForm, city: e.target.value })}
                onBlur={() => handleSaveProfileEdits(accountForm.fullName, accountForm.city, accountForm.phone)}
                placeholder="Enter city location"
              />
            </div>
            <div className="account-field">
              <label>Phone:</label>
              <input
                value={accountForm.phone}
                onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                onBlur={() => handleSaveProfileEdits(accountForm.fullName, accountForm.city, accountForm.phone)}
                placeholder="+91..."
              />
            </div>
          </div>

          {(profile?.role || view) === "worker" ? (
            <div className="account-section">
              <h4>Worker Skills & Trade</h4>
              <div className="account-field">
                <label>Experience:</label>
                <span>{workerProfile?.experience_years || workerEditData.experienceYears || 0} Years</span>
              </div>
              <div className="account-field">
                <label>Availability:</label>
                <span>{workerProfile?.availability || workerEditData.availability || "Immediate"}</span>
              </div>
            </div>
          ) : (
            <div className="account-section">
              <h4>Employer Organization</h4>
              <div className="account-field">
                <label>Company:</label>
                <span>{employerProfile?.company_name || employerSetupData.companyName || employerEditData.companyName || "Registered Organization"}</span>
              </div>
              <div className="account-field">
                <label>Industry:</label>
                <span>{employerProfile?.industry || employerSetupData.industry || employerEditData.industry || "Services"}</span>
              </div>
            </div>
          )}

          <button className="logout-btn" onClick={handleSignOut}>
            🚪 Sign Out of ShramID
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* EMPLOYER NEW JOB CREATION WIZARD MODAL */}
      {/* ───────────────────────────────────────────────────────── */}
      {showJobWizard && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>📢 Post a New Staffing Requirement</h2>
              <button className="close-btn" onClick={() => setShowJobWizard(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Job Title / Role Required:*</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                  {["Electrician", "Plumber", "CNC Operator", "Commercial Driver", "AC Tech", "Welder", "Carpenter", "Cook", "Security Guard", "Other"].map((tName) => (
                    <button
                      key={tName}
                      type="button"
                      className={`chip-btn ${newJobForm.title === tName || (tName === "Other" && newJobForm.title && !["Electrician", "Plumber", "CNC Operator", "Commercial Driver", "AC Tech", "Welder", "Carpenter", "Cook", "Security Guard"].includes(newJobForm.title)) ? "selected" : ""}`}
                      onClick={() => {
                        if (tName === "Other") {
                          setNewJobForm({ ...newJobForm, title: "" });
                        } else {
                          setNewJobForm({ ...newJobForm, title: tName });
                        }
                      }}
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                    >
                      {tName === "Other" ? "✏️ Other (Custom)" : tName}
                    </button>
                  ))}
                </div>
                <input
                  value={newJobForm.title}
                  onChange={(e) => setNewJobForm({ ...newJobForm, title: e.target.value })}
                  placeholder="Type any custom job title (e.g. Solar Installer, Data Entry, Tailor)..."
                />
              </div>

              {/* WORK MODE SELECTOR: HIRE vs WORK NOW */}
              <div className="form-group" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "12px", borderRadius: "10px", marginBottom: "16px" }}>
                <label style={{ fontWeight: 700, color: "#0f172a", display: "block", marginBottom: "8px" }}>
                  Select Hiring Mode:*
                </label>
                <div style={{ display: "flex", gap: "12px" }}>
                  <label
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: `2px solid ${newJobForm.workMode === "hire" ? "#2563eb" : "#cbd5e1"}`,
                      background: newJobForm.workMode === "hire" ? "#eff6ff" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                    onClick={() => setNewJobForm({ ...newJobForm, workMode: "hire" })}
                  >
                    <strong style={{ fontSize: "13px", color: "#1e3a8a" }}>💼 HIRE (Regular / Contract)</strong>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>For permanent roles, 6-month contracts & recurring shifts</span>
                  </label>

                  <label
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: `2px solid ${newJobForm.workMode === "work_now" ? "#d97706" : "#cbd5e1"}`,
                      background: newJobForm.workMode === "work_now" ? "#fffbeb" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                    onClick={() => setNewJobForm({ ...newJobForm, workMode: "work_now" })}
                  >
                    <strong style={{ fontSize: "13px", color: "#92400e" }}>⚡ WORK NOW (Urgent One-Time)</strong>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>For immediate local jobs needed today/tomorrow</span>
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Hiring City / Location:*</label>
                  <input
                    value={newJobForm.city}
                    onChange={(e) => setNewJobForm({ ...newJobForm, city: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Employment Type:*</label>
                  <select
                    value={newJobForm.employmentType}
                    onChange={(e) => setNewJobForm({ ...newJobForm, employmentType: e.target.value })}
                  >
                    <option value="Full-time">Full-time Permanent</option>
                    <option value="Contract">Contract (6 Months)</option>
                    <option value="Daily Wage">Daily Wage / One-time</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Min Monthly Pay (₹):</label>
                  <input
                    type="number"
                    value={newJobForm.payMin}
                    onChange={(e) => setNewJobForm({ ...newJobForm, payMin: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Max Monthly Pay (₹):</label>
                  <input
                    type="number"
                    value={newJobForm.payMax}
                    onChange={(e) => setNewJobForm({ ...newJobForm, payMax: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description & Requirements:</label>
                <textarea
                  rows={3}
                  value={newJobForm.description}
                  onChange={(e) => setNewJobForm({ ...newJobForm, description: e.target.value })}
                  placeholder="Specify key work requirements, shift timings, certifications..."
                />
              </div>

              <div className="form-actions">
                <button className="secondary-btn" onClick={() => setShowJobWizard(false)}>Cancel</button>
                <button className="primary-wide" style={{ marginTop: 0 }} onClick={handleCreateJobSubmit}>Publish Job Requirement ➔</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SHRAMSAATHI AI DRAWER */}
      <button className="shram-saathi-fab" onClick={() => setShramSaathiOpen(!shramSaathiOpen)}>
        🤖 ShramSaathi AI
      </button>

      {shramSaathiOpen && (
        <ShramSaathiDrawer
          view={view}
          page={page}
          userCity={profile?.city || "Bengaluru"}
          userId={profile?.id || supaUser?.id || "guest"}
          jobsList={jobsList}
          employerApplications={employerApplicationsList}
          workerApplications={myApplicationsList}
          candidateWorkers={candidateWorkersList}
          workerTrade={workerSetupData.tradeName}
          onClose={() => setShramSaathiOpen(false)}
          onNavigate={(p) => setPage(p)}
        />
      )}

      {/* CANDIDATE PROFILE POPUP MODAL */}
      {selectedCandidateModal && (
        <div className="modal-overlay" style={{ zIndex: 100000 }}>
          <div className="modal-content" style={{ maxWidth: "560px", padding: "28px", borderRadius: "16px", background: "white", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <div className="avatar blue" style={{ width: "56px", height: "56px", fontSize: "22px", fontWeight: 700 }}>
                  {selectedCandidateModal.full_name?.charAt(0) || "W"}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--navy)" }}>
                    {selectedCandidateModal.full_name || "Skilled Candidate"}
                  </h2>
                  <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "13px" }}>
                    {selectedCandidateModal.worker_profiles?.headline || "Certified Skilled Professional Worker"}
                  </p>
                  <span className="trust-badge green" style={{ fontSize: "11px", marginTop: "6px", display: "inline-block", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
                    ✓ ShramID Verified Worker Passport
                  </span>
                </div>
              </div>
              <button
                style={{ fontSize: "20px", cursor: "pointer", background: "none", border: "none", color: "#64748b" }}
                onClick={() => setSelectedCandidateModal(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", margin: "20px 0" }}>
              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>CITY LOCATION</span>
                <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>
                  📍 {selectedCandidateModal.city || "Bengaluru"}
                </p>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>EXPERIENCE</span>
                <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>
                  💼 {selectedCandidateModal.worker_profiles?.experience_years ?? 3} Years
                </p>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>AVAILABILITY</span>
                <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>
                  ⚡ {selectedCandidateModal.worker_profiles?.availability || "Immediate"}
                </p>
              </div>
              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>CONTACT PHONE</span>
                <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: "13px", color: "#2563eb" }}>
                  🔒 +91 98765 ***** <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 400 }}>(Unlocked on Shortlist)</span>
                </p>
              </div>
            </div>

            <div style={{ background: "#eff6ff", padding: "14px 16px", borderRadius: "10px", border: "1px solid #bfdbfe", marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 6px", fontSize: "13px", color: "#1e3a8a", fontWeight: 700 }}>VERIFIED PASSPORT CREDENTIALS</h4>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ background: "white", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", border: "1px solid #93c5fd", fontWeight: 600, color: "#1d4ed8" }}>
                  ✓ Aadhaar / ID Verified
                </span>
                <span style={{ background: "white", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", border: "1px solid #93c5fd", fontWeight: 600, color: "#1d4ed8" }}>
                  ✓ Trade Safety Certified
                </span>
                <span style={{ background: "white", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", border: "1px solid #93c5fd", fontWeight: 600, color: "#1d4ed8" }}>
                  ✓ Background Clean
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                className="secondary-btn"
                onClick={() => setSelectedCandidateModal(null)}
                style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: 600 }}
              >
                Close
              </button>
              <a
                href={`tel:${selectedCandidateModal.phone || "+919876543210"}`}
                className="primary-btn"
                style={{ padding: "10px 20px", borderRadius: "8px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--blue)", color: "white", fontWeight: 600 }}
              >
                📞 Call Candidate
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SHARE SHRAMID QR CODE MODAL */}
      {showQRModal && (
        <div className="modal-overlay" style={{ zIndex: 100000 }}>
          <div className="modal-content" style={{ maxWidth: "460px", padding: "28px", borderRadius: "20px", background: "#0f172a", color: "#f8fafc", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "20px" }}>🇮🇳</span>
                <strong style={{ fontSize: "18px", color: "#38bdf8" }}>Official ShramID QR Passport</strong>
              </div>
              <button className="close-btn" style={{ color: "#fff" }} onClick={() => setShowQRModal(false)}>✕</button>
            </div>

            <div style={{ background: "#ffffff", padding: "16px", borderRadius: "16px", marginBottom: "16px" }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`https://shramid.app/u/${profile?.id || supaUser?.id}`)}`}
                alt="ShramID QR"
                style={{ width: "160px", height: "160px", margin: "0 auto", display: "block" }}
              />
              <p style={{ margin: "10px 0 0", color: "#1e293b", fontSize: "12px", fontWeight: 700 }}>
                Scan to View Verified Credentials & Work History
              </p>
            </div>

            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>
              Share this portable digital QR identity with recruiters, contractors, and local employers to prove your trade skills instantly.
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="secondary-btn"
                style={{ flex: 1, padding: "10px", borderRadius: "8px" }}
                onClick={() => setShowQRModal(false)}
              >
                Close
              </button>
              <button
                className="primary-btn"
                style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "#2563eb" }}
                onClick={() => {
                  const url = `${window.location.origin}/u/${profile?.id || supaUser?.id}`;
                  if (navigator.clipboard) navigator.clipboard.writeText(url);
                  showToastMsg("🔗 Public ShramID profile link copied to clipboard!");
                  setShowQRModal(false);
                }}
              >
                📋 Copy Share Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ACTION-ORIENTED SHRAMSAATHI AI DRAWER (WITH PER-ACCOUNT CHAT & MULTILINGUAL VOICE)
// ─────────────────────────────────────────────────────────────
function ShramSaathiDrawer({
  view,
  page,
  userCity,
  userId,
  jobsList = [],
  employerApplications = [],
  workerApplications = [],
  candidateWorkers = [],
  workerTrade = "",
  onClose,
  onNavigate,
}: {
  view: View;
  page: string;
  userCity: string;
  userId: string;
  jobsList?: Job[];
  employerApplications?: Application[];
  workerApplications?: Application[];
  candidateWorkers?: WorkerProfile[];
  workerTrade?: string;
  onClose: () => void;
  onNavigate?: (page: string) => void;
}) {
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; actionResult?: any }>>(() => {
    if (typeof window !== "undefined" && userId) {
      const saved = localStorage.getItem(`shram_ai_chat_history_${userId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore error
        }
      }
    }
    return [
      {
        sender: "bot",
        text:
          view === "worker"
            ? `Namaste! I am ShramSaathi AI. Ask me to find jobs near ${userCity}, submit job applications, or update your Skill Passport.`
            : `Hello! I am ShramSaathi AI. Ask me to search verified candidates, draft job listings, or analyze your recruitment pipeline.`,
      },
    ];
  });

  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceLang, setVoiceLang] = useState<"en-IN" | "hi-IN">("en-IN");
  const [isListening, setIsListening] = useState(false);

  // Save messages per user account to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && userId && messages.length > 0) {
      localStorage.setItem(`shram_ai_chat_history_${userId}`, JSON.stringify(messages));
    }
  }, [messages, userId]);

  // Contextual Quick Chips
  const contextualChips = useMemo(() => {
    if (view === "worker") {
      if (page === "jobs") return ["Jobs near me", "Apply for job", "Show matching jobs"];
      if (page === "passport") return ["Improve my profile", "Add micro-skills", "Verify experience"];
      return ["Jobs near me", "Application status", "Update availability"];
    } else {
      if (page === "talent") return ["Find electricians near me", "Search candidates", "Filter verified candidates"];
      if (page === "pipeline") return ["Recruitment summary", "Show shortlisted", "Next steps"];
      return ["Draft a job", "Find candidates", "Recruitment summary"];
    }
  }, [view, page]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputMsg;
    if (!text.trim() || loading) return;

    const userMessage = { sender: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputMsg("");
    setLoading(true);

    // Client navigation check
    const lowerText = text.toLowerCase();
    if (lowerText.includes("take me to applications") || lowerText.includes("my applications")) {
      if (onNavigate) onNavigate("applications");
    } else if (lowerText.includes("open my profile") || lowerText.includes("passport")) {
      if (onNavigate) onNavigate("passport");
    } else if (lowerText.includes("find work") || lowerText.includes("available jobs")) {
      if (onNavigate) onNavigate("jobs");
    }

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          role: view,
          userId,
          context: { city: userCity, page, trade: workerTrade },
          clientJobs: jobsList,
          clientApplications: view === "employer" ? employerApplications : workerApplications,
          clientWorkers: candidateWorkers,
        }),
      });

      const data = await res.json();
      setLoading(false);

      const botReply = {
        sender: "bot",
        text: data.reply || "ShramSaathi is ready to help you manage your workforce activities.",
        actionResult: data.actionResult,
      };

      setMessages((prev) => [...prev, botReply]);
    } catch {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: `I checked verified database records for "${text}". Browse your dashboard to manage listings and applications.` },
      ]);
    }
  };

  const startVoiceInput = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser window. Try typing your query!");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLang; // Configured Voice Language ("en-IN" or "hi-IN")
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMsg(transcript);
          handleSend(transcript);
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const clearChatHistory = () => {
    const initial = [
      {
        sender: "bot",
        text:
          view === "worker"
            ? `Namaste! I am ShramSaathi AI. Ask me to find jobs near ${userCity}, submit job applications, or update your Skill Passport.`
            : `Hello! I am ShramSaathi AI. Ask me to search verified candidates, draft job listings, or analyze your recruitment pipeline.`,
      },
    ];
    setMessages(initial);
    if (typeof window !== "undefined" && userId) {
      localStorage.removeItem(`shram_ai_chat_history_${userId}`);
    }
  };

  return (
    <aside className="shram-drawer">
      <div className="drawer-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🤖</span>
          <strong>ShramSaathi AI Assistant</strong>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            type="button"
            onClick={clearChatHistory}
            style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "4px", padding: "2px 6px", fontSize: "10px", cursor: "pointer" }}
            title="Clear Chat History"
          >
            🗑️ Clear
          </button>
          <button className="close-btn" style={{ color: "#fff" }} onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="drawer-body">
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-msg ${m.sender}`}>
            {m.text}
            {m.actionResult?.jobs && (
              <div style={{ marginTop: "8px", background: "rgba(255,255,255,0.1)", padding: "8px", borderRadius: "6px" }}>
                {m.actionResult.jobs.map((j: any) => (
                  <div key={j.id} style={{ fontSize: "11px", marginBottom: "4px" }}>
                    📍 <strong>{j.title}</strong> ({j.city})
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="chat-msg bot">⚡ Thinking...</div>}
        {isListening && <div className="chat-msg bot" style={{ background: "#fef3c7", color: "#92400e" }}>🎙️ Listening in {voiceLang === "en-IN" ? "English" : "Hindi"}... Speak now!</div>}
      </div>

      <div style={{ padding: "8px 12px", background: "#fff", display: "flex", gap: "6px", overflowX: "auto" }}>
        {contextualChips.map((chip, idx) => (
          <button
            key={idx}
            className="chip-btn"
            style={{ fontSize: "10px", padding: "4px 8px", whiteSpace: "nowrap" }}
            onClick={() => handleSend(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="drawer-footer" style={{ display: "flex", gap: "6px", alignItems: "center", padding: "10px 12px" }}>
        <button
          type="button"
          onClick={startVoiceInput}
          style={{
            padding: "8px 10px",
            borderRadius: "8px",
            border: "none",
            background: isListening ? "#dc2626" : "#2563eb",
            color: "#fff",
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "2px",
            whiteSpace: "nowrap",
          }}
          title={`Voice Input (${voiceLang})`}
        >
          {isListening ? "🔴 Listening..." : "🎙️ Voice"}
        </button>

        {/* VOICE LANGUAGE SWITCHER */}
        <button
          type="button"
          onClick={() => setVoiceLang(voiceLang === "en-IN" ? "hi-IN" : "en-IN")}
          style={{
            padding: "6px 8px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            color: "#0f172a",
            fontWeight: 700,
            fontSize: "11px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
          title="Toggle Voice Speech Language"
        >
          🌐 {voiceLang === "en-IN" ? "EN" : "HI"}
        </button>

        <input
          style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
          placeholder={voiceLang === "en-IN" ? "Ask ShramSaathi (EN)..." : "ShramSaathi से पूछें (HI)..."}
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
      </div>
    </aside>
  );
}
