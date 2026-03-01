import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { TopNav } from "../shared/TopNav";
import { Loader } from "../shared/Loader";

export function StudentDashboard({ user }) {
  const navigate = useNavigate();
  const [rooms, setRooms]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinErr, setJoinErr]  = useState("");
  const [joining, setJoining]  = useState(false);

  const loadRooms = useCallback(async () => {
    try {
      setLoadError(null);
      const { data, error } = await supabase
        .from("room_members")
        .select(`room_id, rooms(*, profiles!rooms_teacher_id_fkey(name,avatar), assignments(id, todos(id,done)))`)
        .eq("student_id", user.id);
      if (error) throw error;
      setRooms((data||[]).map(d=>d.rooms).filter(Boolean));
    } catch (err) {
      console.error("loadRooms error:", err);
      setLoadError(err.message || "Failed to load rooms");
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    const ch = supabase.channel("student-rooms")
      .on("postgres_changes",{event:"*",schema:"public",table:"room_members",filter:`student_id=eq.${user.id}`},loadRooms)
      .on("postgres_changes",{event:"*",schema:"public",table:"todos"},loadRooms)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user.id, loadRooms]);

  const joinRoom = async () => {
    setJoinErr(""); setJoining(true);
    const code = joinCode.trim().toUpperCase();
    const { data: room } = await supabase.from("rooms").select("id,name").eq("code",code).maybeSingle();
    if (!room) { setJoinErr("Aquarium not found. Double-check your room code."); setJoining(false); return; }
    const { data: already } = await supabase.from("room_members").select("room_id").eq("room_id",room.id).eq("student_id",user.id).maybeSingle();
    if (already) { navigate(`/aquarium/${room.id}`); setJoining(false); return; }
    const { error } = await supabase.from("room_members").insert({ room_id:room.id, student_id:user.id });
    setJoining(false);
    if (error) { setJoinErr("Could not join. Ask your teacher to add you."); return; }
    setJoinCode(""); loadRooms();
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#061524,#0d2d50,#0a1f3a)"}}>
      <TopNav user={user} />
      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 24px"}}>
        <div style={{marginBottom:36,animation:"fadeUp .5s ease forwards"}}>
          <h1 style={{fontSize:"clamp(26px,5vw,38px)",fontWeight:800,color:"var(--ocean-pale)",marginBottom:6}}>Your Aquariums 🐠</h1>
          <p style={{color:"rgba(168,216,234,.6)",fontSize:15}}>There's a fish in the aquarium. Have you checked your assignments?</p>
        </div>

        {/* Join room */}
        <div className="glass-card" style={{padding:24,marginBottom:32}}>
          <h3 style={{color:"var(--ocean-pale)",marginBottom:4,fontSize:17}}>🔑 Join an Aquarium</h3>
          <p style={{fontSize:13,color:"rgba(168,216,234,.5)",marginBottom:16}}>Enter the room code your teacher gave you</p>
          <div style={{display:"flex",gap:12}}>
            <input className="input-ocean" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. ABC123" style={{flex:1,letterSpacing:".15em",fontWeight:700}} onKeyDown={e=>e.key==="Enter"&&joinRoom()} />
            <button className="ocean-btn btn-gold" style={{padding:"12px 24px"}} onClick={joinRoom} disabled={joining}>{joining?"Diving...":"Dive In 🤿"}</button>
          </div>
          {joinErr && <p style={{fontSize:13,color:"var(--coral-soft)",marginTop:8}}>{joinErr}</p>}
        </div>

        {loading ? <Loader text="Checking your aquariums..." /> : loadError ? (
          <div className="glass-card" style={{padding:50,textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:14}}>⚠️</div>
            <h3 style={{color:"var(--ocean-pale)",marginBottom:8}}>Failed to load aquariums</h3>
            <p style={{color:"rgba(168,216,234,.5)",marginBottom:20,fontSize:14}}>{loadError}</p>
            <button className="ocean-btn btn-primary" onClick={()=>{setLoading(true);loadRooms();}}>🔄 Retry</button>
          </div>
        ) : rooms.length===0 ? (
          <div className="glass-card" style={{padding:50,textAlign:"center"}}>
            <div style={{fontSize:56,marginBottom:14}}>🐠</div>
            <h3 style={{color:"var(--ocean-pale)",marginBottom:8}}>No aquariums yet</h3>
            <p style={{color:"rgba(168,216,234,.5)"}}>Enter a room code above to join your teacher's aquarium!</p>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:20}}>
            {rooms.map((room,i)=>{
              const teacher  = room.profiles;
              const allTodos = (room.assignments||[]).flatMap(a=>a.todos||[]);
              const done     = allTodos.filter(t=>t.done).length;
              const pct      = allTodos.length>0?Math.round(done/allTodos.length*100):0;
              return (
                <div key={room.id} className="glass-card" style={{padding:24,animation:`fadeUp ${.3+i*.1}s ease forwards`,opacity:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <h3 style={{color:"var(--ocean-pale)",fontSize:17,marginBottom:3}}>{room.name}</h3>
                      <p style={{fontSize:12,color:"rgba(168,216,234,.45)"}}>{teacher?.avatar} {teacher?.name}</p>
                    </div>
                    <span className="tag tag-student">Active</span>
                  </div>
                  <p style={{fontSize:12,color:"rgba(168,216,234,.5)",lineHeight:1.5,marginBottom:14}}>{room.description}</p>
                  <div style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(168,216,234,.5)",marginBottom:6}}><span>Progress</span><span>{pct}%</span></div>
                    <div style={{height:6,background:"rgba(255,255,255,.08)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,var(--kelp),var(--ocean-light))",borderRadius:3,transition:"width .5s ease"}}/>
                    </div>
                  </div>
                  {pct<100 && done<allTodos.length && (
                    <div style={{padding:"8px 12px",borderRadius:10,marginBottom:14,background:"rgba(255,209,102,.1)",border:"1px solid rgba(255,209,102,.2)",fontSize:12,color:"var(--gold)",display:"flex",alignItems:"center",gap:6}}>
                      🐟 There's a fish in the aquarium waiting for you!
                    </div>
                  )}
                  <button className="ocean-btn btn-primary" style={{width:"100%",fontSize:14,padding:"11px"}} onClick={()=>navigate(`/aquarium/${room.id}`)}>🌊 Dive Into Aquarium</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
