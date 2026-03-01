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

function AppRoutes() {
  const [session, setSession] = useState(undefined); // undefined = not yet checked
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const navRef = useRef(navigate);
  navRef.current = navigate;

  const loadProfile = useCallback(async (uid) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (error) {
        console.error("loadProfile error:", error);
        setAuthError("Could not load profile: " + error.message);
        return null;
      }
      if (data) {
        setProfile(data);
        return data;
      }
      return null;
    } catch (err) {
      console.error("loadProfile exception:", err);
      setAuthError("Could not load profile: " + err.message);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      if (!mounted) return;
      setSession(existingSession);
      if (existingSession) {
        try {
          const prof = await loadProfile(existingSession.user.id);
          if (prof && mounted) {
            const path = window.location.pathname;
            if (path === "/" || path === "/login") {
              navRef.current(prof.role === "teacher" ? "/teacher" : "/student");
            }
          }
        } catch (err) {
          console.error("Initial session error:", err);
          if (mounted) setAuthError("Auth error: " + err.message);
        }
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      if (event === "INITIAL_SESSION") return;
      setSession(newSession);
      if (newSession) {
        try {
          const prof = await loadProfile(newSession.user.id);
          if (prof && mounted) {
            navRef.current(prof.role === "teacher" ? "/teacher" : "/student");
          }
        } catch (err) {
          console.error("Auth change error:", err);
          if (mounted) setAuthError("Auth error: " + err.message);
        }
      } else {
        setProfile(null);
        if (mounted) setLoading(false);
        navRef.current("/");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Show spinner until initial session check is done
  if (loading) return <LoadingScreen />;

  // Show error screen if auth or profile loading failed
  if (authError) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a2540" }}>
      <div className="glass-card" style={{ padding: 40, textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h3 style={{ color: "var(--ocean-pale)", marginBottom: 8 }}>Something went wrong</h3>
        <p style={{ color: "rgba(168,216,234,.6)", fontSize: 14, marginBottom: 20 }}>{authError}</p>
        <button className="ocean-btn btn-primary" onClick={() => { setAuthError(null); setLoading(true); window.location.reload(); }}>
          Try Again
        </button>
      </div>
    </div>
  );

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
