import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testReloadHang() {
  const email = 'joshuabiong7@gmail.com';
  const password = 'joshuabiong@gmail'; // or whatever the user meant

  console.log("1. Logging in...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  
  if (authErr) {
    console.error("Auth error:", authErr.message);
    return;
  }
  
  console.log("Login successful. User ID:", authData.session.user.id);
  
  // Simulate page reload
  console.log("2. Simulating page reload (getSession)...");
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log("No session found after reload.");
    return;
  }
  
  console.log("Session restored. User ID:", session.user.id);
  
  console.log("3. Calling loadProfile...");
  const uid = session.user.id;
  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (error) {
      console.error("loadProfile returned error:", error);
    } else {
      console.log("loadProfile success. Role:", data?.role);
    }
  } catch (err) {
    console.error("loadProfile THREW exception:", err);
  }
  
  console.log("4. Simulating TeacherDashboard loadRooms...");
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select(`*, room_members(student_id, profiles(name,avatar)), assignments(id, todos(id,done))`)
      .eq("teacher_id", uid)
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Teacher loadRooms error:", error);
    } else {
      console.log(`Teacher loadRooms success. Found ${data?.length} rooms.`);
    }
  } catch (err) {
    console.error("Teacher loadRooms THREW exception:", err);
  }
  
  console.log("Done.");
}

testReloadHang();
