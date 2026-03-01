import { useState, useCallback, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { mkCode } from "../../lib/utils";
import { labelSt } from "../../lib/constants";
import { TopNav } from "../shared/TopNav";
import { Loader } from "../shared/Loader";
import { Modal } from "../shared/Modal";
import { TeacherRoomCard } from "./TeacherRoomCard";

export function TeacherDashboard({ user }) {
  const [rooms, setRooms]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]     = useState("");
  const [newDesc, setNewDesc]     = useState("");
  const [saving, setSaving]       = useState(false);

  const loadRooms = useCallback(async () => {
    try {
      setLoadError(null);
      const { data, error } = await supabase
        .from("rooms")
        .select(`*, room_members(student_id, profiles(name,avatar)), assignments(id, todos(id,done))`)
        .eq("teacher_id", user.id)
        .order("created_at", { ascending:false });
      if (error) throw error;
      setRooms(data || []);
    } catch (err) {
      console.error("loadRooms error:", err);
      setLoadError(err.message || "Failed to load rooms");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // Realtime: refresh when rooms change
  useEffect(() => {
    const ch = supabase.channel("teacher-rooms")
      .on("postgres_changes",{event:"*",schema:"public",table:"rooms",filter:`teacher_id=eq.${user.id}`},loadRooms)
      .on("postgres_changes",{event:"*",schema:"public",table:"room_members"},loadRooms)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user.id, loadRooms]);

  const createRoom = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("rooms").insert({
      name: newName.trim(),
      code: mkCode(),
      description: newDesc.trim() || "Welcome to your aquarium! Have you checked it today?",
      teacher_id: user.id,
    });
    setSaving(false);
    if (!error) { setNewName(""); setNewDesc(""); setShowCreate(false); loadRooms(); }
  };

  const stats = {
    rooms: rooms.length,
    students: [...new Set(rooms.flatMap(r => (r.room_members||[]).map(m=>m.student_id)))].length,
    assignments: rooms.reduce((a,r)=>a+(r.assignments||[]).length,0),
    completed: rooms.reduce((a,r)=>a+(r.assignments||[]).filter(asgn=>{const todos=asgn.todos||[];return todos.length>0&&todos.every(t=>t.done);}).length,0),
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#061524,#0d2d50,#0a1f3a)"}}>
      <TopNav user={user} />
      <div style={{maxWidth:1100,margin:"0 auto",padding:"32px 24px"}}>
        <div style={{marginBottom:40,animation:"fadeUp .5s ease forwards"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
            <div>
              <h1 style={{fontSize:"clamp(28px,5vw,42px)",fontWeight:800,color:"var(--ocean-pale)",marginBottom:6}}>Your Aquariums 🌊</h1>
              <p style={{color:"rgba(168,216,234,.6)",fontSize:15}}>Create class aquariums and watch your students' fish swim through assignments.</p>
            </div>
            <button className="ocean-btn btn-coral" onClick={()=>setShowCreate(true)}>+ New Aquarium</button>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:16,marginBottom:40}}>
          {[{icon:"🏊",label:"Aquariums",val:stats.rooms},{icon:"🧑‍🎓",label:"Students",val:stats.students},{icon:"🐟",label:"Assignments",val:stats.assignments},{icon:"✅",label:"Completed",val:stats.completed}].map((s,i)=>(
            <div key={i} className="glass-card" style={{padding:"20px",textAlign:"center",animation:`fadeUp ${.3+i*.1}s ease forwards`,opacity:0}}>
              <div style={{fontSize:28}}>{s.icon}</div>
              <div style={{fontFamily:"'Baloo 2',cursive",fontSize:28,fontWeight:800,color:"var(--ocean-pale)",margin:"4px 0"}}>{s.val}</div>
              <div style={{fontSize:12,color:"rgba(168,216,234,.5)"}}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? <Loader text="Loading your aquariums..." /> : loadError ? (
          <div className="glass-card" style={{padding:50,textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:14}}>⚠️</div>
            <h3 style={{color:"var(--ocean-pale)",marginBottom:8}}>Failed to load aquariums</h3>
            <p style={{color:"rgba(168,216,234,.5)",marginBottom:20,fontSize:14}}>{loadError}</p>
            <button className="ocean-btn btn-primary" onClick={()=>{setLoading(true);loadRooms();}}>🔄 Retry</button>
          </div>
        ) : rooms.length===0 ? (
          <div className="glass-card" style={{padding:60,textAlign:"center"}}>
            <div style={{fontSize:60,marginBottom:16}}>🐠</div>
            <h3 style={{color:"var(--ocean-pale)",marginBottom:8}}>No aquariums yet</h3>
            <p style={{color:"rgba(168,216,234,.5)",marginBottom:24}}>Create your first aquarium to get started!</p>
            <button className="ocean-btn btn-coral" onClick={()=>setShowCreate(true)}>+ Create Aquarium</button>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:20}}>
            {rooms.map((room,i)=>(
              <TeacherRoomCard key={room.id} room={room} userId={user.id}  onRefresh={loadRooms}
                style={{animation:`fadeUp ${.4+i*.1}s ease forwards`,opacity:0}} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal onClose={()=>setShowCreate(false)} title="Create New Aquarium 🌊">
          <div style={{marginBottom:16}}>
            <label style={labelSt} htmlFor="room-name">Aquarium Name</label>
            <input id="room-name" name="roomName" className="input-ocean" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. Ocean Explorers – Period 3" autoFocus onKeyDown={e=>e.key==="Enter"&&createRoom()} />
          </div>
          <div style={{marginBottom:24}}>
            <label style={labelSt} htmlFor="room-desc">Welcome Message</label>
            <textarea id="room-desc" name="roomDesc" className="input-ocean" value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Have you checked your aquarium today?" rows={3} style={{resize:"none"}} />
          </div>
          <div style={{display:"flex",gap:12}}>
            <button className="ocean-btn btn-primary" style={{flex:1}} onClick={createRoom} disabled={saving}>{saving?"Creating...":"🐟 Create"}</button>
            <button className="ocean-btn btn-ghost" onClick={()=>setShowCreate(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
