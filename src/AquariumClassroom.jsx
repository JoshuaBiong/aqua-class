import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { GLOBAL_CSS } from "./styles/global";

import { LandingPage } from "./components/auth/LandingPage";
import { LoginPage } from "./components/auth/LoginPage";
import { TeacherDashboard } from "./components/dashboard/TeacherDashboard";
import { StudentDashboard } from "./components/dashboard/StudentDashboard";
import { AquariumRoom } from "./components/aquarium/AquariumRoom";

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a2540" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 16 }} className="anim-float">🌊</div>
        <div className="spinner" style={{ width: 36, height: 36, margin: "0 auto", borderWidth: 3 }} />
        <p style={{ color: "var(--ocean-pale)", marginTop: 16, fontFamily: "'Baloo 2',cursive" }}>Diving in...</p>
      </div>
    </div>
  );
}

function ProfileErrorScreen({ onRetry, onSignOut }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a2540" }}>
      <div className="glass-card" style={{ padding: 40, textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🐠</div>
        <h3 style={{ color: "var(--ocean-pale)", marginBottom: 8 }}>Profile not found</h3>
        <p style={{ color: "rgba(168,216,234,.6)", fontSize: 14, marginBottom: 20 }}>
          We couldn't load your profile. This can happen if your account wasn't set up properly.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="ocean-btn btn-primary" onClick={onRetry}>🔄 Retry</button>
          <button className="ocean-btn btn-ghost" onClick={onSignOut}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const [session, setSession] = useState(undefined); // undefined = not yet checked
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const navRef = useRef(navigate);
  navRef.current = navigate;

  console.log("[AppRoutes] render — loading:", loading, "session:", !!session, "profile:", !!profile, "profileLoaded:", profileLoaded, "authError:", authError);

  const loadProfile = useCallback(async (uid) => {
    console.log("[loadProfile] starting for uid:", uid);
    try {
      // Race the query against a 7-second timeout to prevent infinite hangs
      const result = await Promise.race([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Profile query timed out after 7s")), 7000))
      ]);
      const { data, error } = result;
      if (error) {
        console.error("[loadProfile] supabase error:", error);
        setAuthError("Could not load profile: " + error.message);
        setProfileLoaded(true);
        return null;
      }
      if (data) {
        console.log("[loadProfile] profile loaded:", data.role, data.name);
        setProfile(data);
        setProfileLoaded(true);
        return data;
      }
      console.warn("[loadProfile] no profile found for uid:", uid);
      setProfileLoaded(true);
      return null;
    } catch (err) {
      console.error("[loadProfile] exception:", err);
      setAuthError("Could not load profile: " + err.message);
      setProfileLoaded(true);
      return null;
    }
  }, []);

  const handleRetryProfile = useCallback(async () => {
    if (!session) return;
    setAuthError(null);
    setProfileLoaded(false);
    await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const handleRetryAuth = useCallback(() => {
    setAuthError(null);
    setLoading(true);
    window.location.reload();
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setProfileLoaded(false);
    setAuthError(null);
    navRef.current("/");
  }, []);

  // Safety-net timeout: always fires if loading is stuck for 12s
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      console.error("[AppRoutes] ⚠️ SAFETY TIMEOUT: still loading after 12 seconds.");
      setLoading(false);
      setAuthError("Loading timed out. Supabase may be unreachable. Check your network connection.");
    }, 12000);
    return () => clearTimeout(timeout);
  }, [loading]);

  // Auth: onAuthStateChange sets session only — does NOT await anything
  useEffect(() => {
    console.log("[AppRoutes] subscribing to onAuthStateChange...");

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("[AppRoutes] onAuthStateChange event:", event, "newSession:", !!newSession);
      setSession(newSession || null);

      if (!newSession) {
        setProfile(null);
        setProfileLoaded(false);
        if (event !== "INITIAL_SESSION") {
          navRef.current("/");
        }
        setLoading(false);
      }
      // If newSession exists, the useEffect below will handle profile loading
    });

    return () => subscription.unsubscribe();
  }, []);

  // Profile loading: reacts to session changes (runs OUTSIDE the auth callback)
  useEffect(() => {
    if (session === undefined) return; // not yet checked
    if (!session) {
      // No session — done loading
      setLoading(false);
      return;
    }
    // Session exists — load profile
    let cancelled = false;
    console.log("[AppRoutes] session detected, loading profile...");
    loadProfile(session.user.id).then(prof => {
      if (cancelled) return;
      console.log("[AppRoutes] loadProfile returned:", prof ? prof.role : null);
      if (prof) {
        const path = window.location.pathname;
        if (path === "/" || path === "/login") {
          navRef.current(prof.role === "teacher" ? "/teacher" : "/student");
        }
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [session, loadProfile]);

  // Show spinner until initial session check is done
  if (loading) return <LoadingScreen />;

  // Show error screen if auth or profile loading failed
  if (authError) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a2540" }}>
      <div className="glass-card" style={{ padding: 40, textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h3 style={{ color: "var(--ocean-pale)", marginBottom: 8 }}>Something went wrong</h3>
        <p style={{ color: "rgba(168,216,234,.6)", fontSize: 14, marginBottom: 20 }}>{authError}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="ocean-btn btn-primary" onClick={handleRetryAuth}>
            Try Again
          </button>
          <button className="ocean-btn btn-ghost" onClick={handleSignOut}>Sign Out</button>
        </div>
      </div>
    </div>
  );

  // Session exists but profile couldn't be found — show actionable error instead of infinite spinner
  if (session && profileLoaded && !profile) {
    return <ProfileErrorScreen onRetry={handleRetryProfile} onSignOut={handleSignOut} />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={
        !session ? <LandingPage />
        : !profile ? <LoadingScreen />
        : <Navigate to={profile.role === "teacher" ? "/teacher" : "/student"} replace />
      } />
      <Route path="/login" element={
        !session ? <LoginPage loadProfile={loadProfile} />
        : !profile ? <LoadingScreen />
        : <Navigate to={profile.role === "teacher" ? "/teacher" : "/student"} replace />
      } />

      {/* Protected Routes */}
      {session && profile ? (
        <>
          <Route path="/teacher" element={profile.role === "teacher" ? <TeacherDashboard user={profile} /> : <Navigate to="/student" replace />} />
          <Route path="/student" element={profile.role === "student" ? <StudentDashboard user={profile} /> : <Navigate to="/teacher" replace />} />
          <Route path="/aquarium/:roomId" element={<AquariumRoom userId={profile.id} userRole={profile.role} />} />
        </>
      ) : null}

      {/* Fallback */}
      <Route path="*" element={
        !session ? <Navigate to="/" replace />
        : !profile ? <LoadingScreen />
        : <Navigate to="/" replace />
      } />
    </Routes>
  );
}

export default function AquariumClassroom() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <style>{GLOBAL_CSS}</style>
      <AppRoutes />
    </BrowserRouter>
  );
}
