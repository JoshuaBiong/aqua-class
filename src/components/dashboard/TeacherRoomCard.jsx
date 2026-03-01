import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function TeacherRoomCard({ room, userId, onRefresh, style }) {
  const navigate = useNavigate();
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentEmail, setStudentEmail]     = useState("");
  const [msg, setMsg]                       = useState("");
  const [adding, setAdding]                 = useState(false);

  const members  = room.room_members || [];
  const doneAsgn = (room.assignments||[]).filter(a=>{const t=a.todos||[];return t.length>0&&t.every(x=>x.done);}).length;

  const addStudent = async () => {
    if (!studentEmail.trim()) return;
    setAdding(true); setMsg("");
    const { data: found } = await supabase.from("profiles").select("id,name").eq("email",studentEmail.toLowerCase()).eq("role","student").maybeSingle();
    if (!found) { setMsg("Student not found. Make sure they've registered first."); setAdding(false); return; }
    const already = members.find(m=>m.student_id===found.id);
    if (already) { setMsg("Already in this aquarium."); setAdding(false); return; }
    const { error } = await supabase.from("room_members").insert({ room_id:room.id, student_id:found.id });
    setAdding(false);
    if (error) { setMsg(error.message); return; }
    setMsg(`✓ ${found.name} added!`); setStudentEmail(""); onRefresh();
  };

  const copyCode = () => { navigator.clipboard?.writeText(room.code).then(()=>{}); };

  return (
    <div className="glass-card" style={{padding:24,...style}}>
      <h3 style={{color:"var(--ocean-pale)",fontSize:18,marginBottom:4}}>{room.name}</h3>
      <p style={{fontSize:12,color:"rgba(168,216,234,.5)",lineHeight:1.5,marginBottom:12}}>{room.description}</p>

      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <span style={{fontSize:12,color:"rgba(168,216,234,.5)"}}>Room code:</span>
        <span className="room-code" onClick={copyCode} title="Click to copy">{room.code}</span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        {[{label:"Students",val:members.length,icon:"🧑‍🎓"},{label:"Assignments",val:(room.assignments||[]).length,icon:"🐟"},{label:"Completed",val:doneAsgn,icon:"✅"}].map((s,i)=>(
          <div key={i} style={{textAlign:"center",padding:"10px 6px",background:"rgba(255,255,255,.04)",borderRadius:10}}>
            <div style={{fontSize:18}}>{s.icon}</div>
            <div style={{fontFamily:"'Baloo 2',cursive",fontSize:20,fontWeight:700,color:"var(--ocean-pale)"}}>{s.val}</div>
            <div style={{fontSize:10,color:"rgba(168,216,234,.45)"}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Student chips */}
      {members.length>0 && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,color:"rgba(168,216,234,.45)",fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>Students</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {members.map(m=>(
              <div key={m.student_id} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:"rgba(82,183,136,.12)",border:"1px solid rgba(82,183,136,.25)",borderRadius:50,fontSize:12,color:"var(--kelp-light)"}}>
                {m.profiles?.avatar} {m.profiles?.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add student */}
      {showAddStudent ? (
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",gap:8}}>
            <input className="input-ocean" style={{flex:1,fontSize:13,padding:"8px 12px"}} value={studentEmail}
              onChange={e=>{setStudentEmail(e.target.value);setMsg("");}} placeholder="student@email.edu"
              onKeyDown={e=>e.key==="Enter"&&addStudent()} />
            <button className="ocean-btn btn-primary" style={{padding:"8px 14px",fontSize:13}} onClick={addStudent} disabled={adding}>{adding?"...":"Add"}</button>
            <button className="ocean-btn btn-ghost" style={{padding:"8px 14px",fontSize:13}} onClick={()=>{setShowAddStudent(false);setMsg("");}}>✕</button>
          </div>
          {msg && <p style={{fontSize:12,color:msg.startsWith("✓")?"var(--kelp-light)":"var(--coral-soft)",marginTop:6}}>{msg}</p>}
        </div>
      ) : (
        <button onClick={()=>setShowAddStudent(true)} style={{width:"100%",padding:"8px",background:"rgba(255,255,255,.04)",border:"1.5px dashed rgba(168,216,234,.2)",borderRadius:10,color:"rgba(168,216,234,.5)",fontSize:13,cursor:"pointer",marginBottom:12,fontFamily:"'Nunito',sans-serif",transition:"all .2s"}}>
          + Add Student by Email
        </button>
      )}

      <button className="ocean-btn btn-primary" style={{width:"100%",fontSize:14,padding:"11px"}} onClick={()=>navigate(`/aquarium/${room.id}`)}>
        🌊 Open Aquarium
      </button>
    </div>
  );
}
