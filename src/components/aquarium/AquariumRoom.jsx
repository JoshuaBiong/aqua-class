import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { FISH_COLORS, labelSt } from "../../lib/constants";
import { FishSim } from "../../lib/FishSim";
import { calcSize, drawOceanBg, drawSeaweed, drawCage, drawFish } from "../../lib/canvasUtils";
import { TopNav } from "../shared/TopNav";
import { Loader } from "../shared/Loader";
import { Modal } from "../shared/Modal";
import { TodoItem } from "./TodoItem";

export function AquariumRoom({ userId, userRole }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const canvasRef  = useRef(null);
  const simRef     = useRef(null);
  const rafRef     = useRef(null);
  const roomRef    = useRef(null);

  const [room, setRoom]             = useState(null);
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalAsgnId, setModalAsgnId] = useState(null);
  const [cursor, setCursor]         = useState({x:-100,y:-100});

  // Teacher form state
  const [showNewAsgn, setShowNewAsgn] = useState(false);
  const [newAsgnName, setNewAsgnName] = useState("");
  const [newAsgnDue,  setNewAsgnDue]  = useState("");
  const [newAsgnColor,setNewAsgnColor] = useState(1);
  const [todoAsgnId,  setTodoAsgnId]  = useState("");
  const [newTodoTitle,setNewTodoTitle] = useState("");
  const [newTodoNotes,setNewTodoNotes] = useState("");
  const [modalTodoInput,setModalTodoInput] = useState("");
  const [saving, setSaving]         = useState(false);

  const isTeacher = userRole === "teacher";

  // ── Load room + realtime ────────────────────────────────────────────────────
  const loadRoom = useCallback(async () => {
    try {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id",userId).maybeSingle();
      if (prof) setProfile(prof);
      const { data, error } = await supabase
        .from("rooms")
        .select(`*, assignments(*, todos(*, submissions(*)))`)
        .eq("id", roomId)
        .maybeSingle();
      if (error) throw error;
      console.log("Room loaded:", data);
      if (data) { setRoom(data); roomRef.current = data; }
    } catch (err) {
      console.error("Error loading room:", err);
    } finally {
      setLoading(false);
    }
  }, [roomId, userId]);

  useEffect(() => { loadRoom(); }, [loadRoom]);

  useEffect(() => {
    if (!roomId) return;
    const ch = supabase.channel(`room-${roomId}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"assignments",filter:`room_id=eq.${roomId}`},loadRoom)
      .on("postgres_changes",{event:"*",schema:"public",table:"todos"},loadRoom)
      .on("postgres_changes",{event:"*",schema:"public",table:"submissions"},loadRoom)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [roomId, loadRoom]);

  // ── Canvas init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const cw=canvas.width,ch=canvas.height;
    simRef.current = { mouseX:cw/2,mouseY:ch/2,mouseActive:false,mouseTimer:null,cageArea:{x:cw-220,y:ch-190,w:200,h:165},fishMap:new Map() };
    const onResize=()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;simRef.current.cageArea={x:canvas.width-220,y:canvas.height-190,w:200,h:165};};
    window.addEventListener("resize",onResize);
    return ()=>window.removeEventListener("resize",onResize);
  }, []);

  // ── Sync fish map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!simRef.current || !room) return;
    const { fishMap } = simRef.current;
    const canvas = canvasRef.current;
    console.log("Syncing fish for room:", room.name, "Assignments:", room.assignments.length);
    room.assignments.forEach(a => {
      if (!fishMap.has(a.id)) {
        console.log("Creating new fish for:", a.name);
        fishMap.set(a.id, new FishSim(canvas?.width || window.innerWidth, canvas?.height || window.innerHeight));
      }
    });
    fishMap.forEach((_, id) => {
      if (!room.assignments.find(a => a.id === id)) fishMap.delete(id);
    });
  }, [room]);

  // ── Mouse ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove=e=>{
      setCursor({x:e.clientX,y:e.clientY});
      if(!simRef.current||!roomRef.current)return;
      const s=simRef.current;s.mouseX=e.clientX;s.mouseY=e.clientY;s.mouseActive=true;
      clearTimeout(s.mouseTimer);s.mouseTimer=setTimeout(()=>s.mouseActive=false,2000);
      s.fishMap.forEach(f=>f.hovered=false);
      (roomRef.current.assignments || []).forEach(a=>{
        const fish=s.fishMap.get(a.id);if(!fish)return;
        const todos=a.todos||[];
        const size=calcSize(todos.length,todos.filter(t=>t.done).length);
        fish.hovered=fish.contains(e.clientX,e.clientY,size);
      });
    };
    document.addEventListener("mousemove",onMove);
    return()=>document.removeEventListener("mousemove",onMove);
  },[]);

  // ── Canvas click ─────────────────────────────────────────────────────────────
  const handleCanvasClick = useCallback(e=>{
    if(!simRef.current||!roomRef.current)return;
    const px=e.clientX,py=e.clientY;
    for(const asgn of (roomRef.current.assignments || [])){
      const fish=simRef.current.fishMap.get(asgn.id);if(!fish)continue;
      const todos=asgn.todos||[];
      const size=calcSize(todos.length,todos.filter(t=>t.done).length);
      if(fish.contains(px,py,size)){
        fish.excited=true;fish.exciteTimer=120;fish.exciteX=px;fish.exciteY=py;
        setTimeout(()=>setModalAsgnId(asgn.id),200);return;
      }
    }
  },[]);

  // ── Animation loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas=canvasRef.current,ctx=canvas.getContext("2d");
    const loop=ts=>{
      if(!simRef.current||!roomRef.current){rafRef.current=requestAnimationFrame(loop);return;}
      const{mouseX,mouseY,mouseActive,cageArea,fishMap}=simRef.current;
      const r=roomRef.current,cw=canvas.width,ch=canvas.height;
      ctx.clearRect(0,0,cw,ch);drawOceanBg(ctx,cw,ch,ts);drawSeaweed(ctx,cw,ch,ts);
      const doneCnt=(r.assignments || []).filter(a=>{const t=a.todos||[];return t.length>0&&t.every(x=>x.done);}).length;
      drawCage(ctx,cageArea,doneCnt);
      (r.assignments || []).forEach(asgn=>{
        const fish=fishMap.get(asgn.id);if(!fish)return;
        const todos=asgn.todos||[];
        const done=todos.filter(t=>t.done).length,size=calcSize(todos.length,done);
        const isDone=todos.length>0&&done===todos.length;
        fish.update({mouseX,mouseY,mouseActive,isDone,cageArea,cw,ch,size});
        const pending=todos.filter(t=>!t.done).length;
        const color = FISH_COLORS[(asgn.color_index || 0) % FISH_COLORS.length] || FISH_COLORS[0];
        drawFish(ctx, fish, color, size, pending > 0 ? `${asgn.name} (${pending})` : asgn.name, fish.dialogAlpha);
      });
      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return()=>cancelAnimationFrame(rafRef.current);
  },[]);

  // ── ESC ──────────────────────────────────────────────────────────────────────
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape"){setModalAsgnId(null);setShowNewAsgn(false);}};
    document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);
  },[]);

  // ── Teacher actions ──────────────────────────────────────────────────────────
  const addAssignment = async () => {
    if(!newAsgnName.trim())return;setSaving(true);
    await supabase.from("assignments").insert({room_id:roomId,name:newAsgnName.trim(),color_index:newAsgnColor,due_date:newAsgnDue||null});
    setSaving(false);setNewAsgnName("");setNewAsgnDue("");setShowNewAsgn(false);
  };

  const addTodo = async () => {
    if(!newTodoTitle.trim()||!todoAsgnId)return;setSaving(true);
    await supabase.from("todos").insert({assignment_id:todoAsgnId,title:newTodoTitle.trim(),notes:newTodoNotes.trim()});
    setSaving(false);setNewTodoTitle("");setNewTodoNotes("");
  };

  const addModalTodo = async () => {
    if(!modalTodoInput.trim()||!modalAsgnId)return;
    await supabase.from("todos").insert({assignment_id:modalAsgnId,title:modalTodoInput.trim(),notes:""});
    setModalTodoInput("");
  };

  const toggleTodo = async (todoId, currentDone) => {
    await supabase.from("todos").update({done:!currentDone}).eq("id",todoId);
  };

  // ── Student file upload ──────────────────────────────────────────────────────
  const submitFile = async (todoId, file) => {
    if(file.size>10*1024*1024){alert("Max 10MB");return;}
    const path=`${userId}/${todoId}/${Date.now()}-${file.name}`;
    const{error:upErr}=await supabase.storage.from("submissions").upload(path,file);
    if(upErr){console.error(upErr);return;}
    await supabase.from("submissions").insert({todo_id:todoId,student_id:userId,file_name:file.name,file_type:file.type,file_size:file.size,storage_path:path});
    await supabase.from("todos").update({done:true}).eq("id",todoId);
  };

  const removeFile = async (submissionId, storagePath, todoId) => {
    await supabase.storage.from("submissions").remove([storagePath]);
    await supabase.from("submissions").delete().eq("id",submissionId);
    // un-done todo if no more submissions
    const{data:remaining}=await supabase.from("submissions").select("id").eq("todo_id",todoId);
    if((remaining||[]).length===0) await supabase.from("todos").update({done:false}).eq("id",todoId);
  };

  const getSignedUrl = async (storagePath) => {
    const{data}=await supabase.storage.from("submissions").createSignedUrl(storagePath,3600);
    return data?.signedUrl;
  };

  if (loading || !room) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0a2540"}}>
      <Loader text="Diving into the aquarium..." />
    </div>
  );

  const currentModalAsgn = room.assignments.find(a=>a.id===modalAsgnId);
  const colors = currentModalAsgn ? FISH_COLORS[currentModalAsgn.color_index%FISH_COLORS.length] : null;

  return (
    <div style={{position:"relative",width:"100vw",height:"100vh",overflow:"hidden",cursor:"none"}}>
      <div style={{position:"fixed",left:cursor.x,top:cursor.y,width:18,height:18,borderRadius:"50%",background:"rgba(168,216,234,.3)",border:"2px solid rgba(168,216,234,.7)",pointerEvents:"none",transform:"translate(-50%,-50%)",zIndex:9999}}/>
      <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0}} onClick={handleCanvasClick}/>

      {/* Top bar */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:56,background:"rgba(6,21,36,.85)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(168,216,234,.1)",display:"flex",alignItems:"center",padding:"0 20px",gap:16,zIndex:50}}>
        <button onClick={()=>navigate(isTeacher? "/teacher" : "/student")} style={{background:"none",border:"none",color:"rgba(168,216,234,.6)",cursor:"pointer",fontSize:13,fontFamily:"'Nunito',sans-serif"}}>← Back</button>
        <div style={{flex:1}}>
          <span style={{fontFamily:"'Baloo 2',cursive",fontWeight:700,color:"var(--ocean-pale)",fontSize:17}}>🌊 {room.name}</span>
          <span style={{fontSize:12,color:"rgba(168,216,234,.4)",marginLeft:10}}>Code: {room.code}</span>
        </div>
        <span className={isTeacher?"tag tag-teacher":"tag tag-student"}>{isTeacher?"🧑‍🏫 Teacher":"🧑‍🎓 Student"}</span>
        <button onClick={()=>setSidebarOpen(v=>!v)} style={{width:40,height:40,borderRadius:"50%",border:"none",background:"rgba(255,255,255,.08)",color:"var(--ocean-pale)",cursor:"pointer",fontSize:18}}>
          {sidebarOpen?"✕":"🐠"}
        </button>
      </div>

      <div style={{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",fontFamily:"'Baloo 2',cursive",fontSize:14,color:"rgba(168,216,234,.4)",pointerEvents:"none",zIndex:10}}>
        🐟 Click a fish to see its assignment
      </div>

      {/* ── Sidebar ── */}
      <div style={{position:"fixed",right:sidebarOpen?0:-380,top:0,width:360,height:"100vh",background:"rgba(6,21,36,.95)",backdropFilter:"blur(20px)",borderLeft:"1px solid rgba(168,216,234,.12)",transition:"right .4s cubic-bezier(.34,1.56,.64,1)",zIndex:100,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"72px 24px 20px",borderBottom:"1px solid rgba(168,216,234,.1)"}}>
          <h2 style={{fontFamily:"'Baloo 2',cursive",fontSize:22,color:"var(--ocean-pale)",marginBottom:4}}>🌊 {room.name}</h2>
          <p style={{fontSize:12,color:"rgba(168,216,234,.45)"}}>{room.description}</p>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 24px"}}>
          {isTeacher && (
            <div style={{marginBottom:20}}>
              <button className="ocean-btn btn-coral" style={{width:"100%",fontSize:13,padding:"10px",marginBottom:12}} onClick={()=>setShowNewAsgn(true)}>
                + New Assignment Fish 🐟
              </button>
              <div style={{background:"rgba(255,255,255,.04)",borderRadius:14,padding:14}}>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(168,216,234,.5)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:10}}>Add Todo Item</div>
                <select className="input-ocean" value={todoAsgnId} onChange={e=>setTodoAsgnId(e.target.value)} style={{marginBottom:8,fontSize:13}}>
                  <option value="">Select assignment...</option>
                  {room.assignments.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <input className="input-ocean" value={newTodoTitle} onChange={e=>setNewTodoTitle(e.target.value)} placeholder="Todo title..." style={{marginBottom:8,fontSize:13}} onKeyDown={e=>e.key==="Enter"&&addTodo()}/>
                <input className="input-ocean" value={newTodoNotes} onChange={e=>setNewTodoNotes(e.target.value)} placeholder="Notes (optional)..." style={{marginBottom:10,fontSize:13}}/>
                <button className="ocean-btn btn-primary" style={{width:"100%",fontSize:13,padding:"10px"}} onClick={addTodo} disabled={saving}>{saving?"Adding...":"Add Todo"}</button>
              </div>
            </div>
          )}
          <div style={{fontSize:11,fontWeight:700,color:"rgba(168,216,234,.5)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:12}}>
            Assignments ({room.assignments.length})
          </div>
          {room.assignments.length===0 ? (
            <div style={{textAlign:"center",padding:"30px 0",color:"rgba(168,216,234,.35)",fontSize:13}}>
              {isTeacher?"No assignments yet. Add one above!":"No assignments yet. Check back soon!"}
            </div>
          ) : room.assignments.map(asgn=>{
            const done=asgn.todos.filter(t=>t.done).length,total=asgn.todos.length;
            const c=FISH_COLORS[asgn.color_index%FISH_COLORS.length];
            return (
              <div key={asgn.id} onClick={()=>setModalAsgnId(asgn.id)} style={{padding:"14px",borderRadius:12,marginBottom:10,cursor:"pointer",background:"rgba(255,255,255,.04)",border:`1px solid ${c.main}33`,transition:"background .2s"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:c.main,flexShrink:0}}/>
                  <span style={{fontSize:14,fontWeight:600,color:"var(--ocean-pale)",flex:1}}>{asgn.name}</span>
                  <span style={{fontSize:11,color:"rgba(168,216,234,.4)"}}>{done}/{total}</span>
                </div>
                {asgn.due_date&&<div style={{fontSize:11,color:"rgba(168,216,234,.4)",marginBottom:6}}>📅 Due: {asgn.due_date}</div>}
                <div style={{height:4,background:"rgba(255,255,255,.08)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:total>0?`${done/total*100}%`:"0%",background:`linear-gradient(90deg,${c.main},${c.fin})`,borderRadius:2}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── New Assignment Modal ── */}
      {showNewAsgn && (
        <Modal onClose={()=>setShowNewAsgn(false)} title="New Assignment 🐟">
          <div style={{marginBottom:14}}>
            <label style={labelSt}>Assignment Name</label>
            <input className="input-ocean" value={newAsgnName} onChange={e=>setNewAsgnName(e.target.value)} placeholder="e.g. Marine Biology Chapter 3" autoFocus onKeyDown={e=>e.key==="Enter"&&addAssignment()}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={labelSt}>Due Date (optional)</label>
            <input className="input-ocean" value={newAsgnDue} onChange={e=>setNewAsgnDue(e.target.value)} placeholder="e.g. Mar 15, 2026"/>
          </div>
          <div style={{marginBottom:24}}>
            <label style={labelSt}>Fish Color</label>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {FISH_COLORS.map((c,i)=>(
                <div key={i} onClick={()=>setNewAsgnColor(i)} style={{width:30,height:30,borderRadius:"50%",background:c.main,cursor:"pointer",border:newAsgnColor===i?"3px solid white":"3px solid transparent",transition:"all .15s",transform:newAsgnColor===i?"scale(1.15)":"scale(1)"}}/>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:12}}>
            <button className="ocean-btn btn-primary" style={{flex:1}} onClick={addAssignment} disabled={saving}>{saving?"Creating...":"🐟 Create Fish"}</button>
            <button className="ocean-btn btn-ghost" onClick={()=>setShowNewAsgn(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* ── Assignment Detail Modal ── */}
      {currentModalAsgn && colors && (
        <Modal onClose={()=>setModalAsgnId(null)} title="">
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
            <div style={{width:52,height:52,borderRadius:"50%",background:`${colors.main}22`,border:`2px solid ${colors.main}66`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🐟</div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:colors.main,textTransform:"uppercase",letterSpacing:".07em",marginBottom:3}}>Assignment</div>
              <h3 style={{fontFamily:"'Baloo 2',cursive",fontSize:22,color:"var(--ocean-pale)",lineHeight:1.2}}>{currentModalAsgn.name}</h3>
            </div>
          </div>

          <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
            {currentModalAsgn.due_date&&<div style={{padding:"4px 12px",borderRadius:50,background:"rgba(255,209,102,.12)",border:"1px solid rgba(255,209,102,.25)",fontSize:12,color:"var(--gold)"}}>📅 Due: {currentModalAsgn.due_date}</div>}
            <div style={{padding:"4px 12px",borderRadius:50,background:"rgba(82,183,136,.12)",border:"1px solid rgba(82,183,136,.25)",fontSize:12,color:"var(--kelp-light)"}}>
              ✅ {currentModalAsgn.todos.filter(t=>t.done).length}/{currentModalAsgn.todos.length} done
            </div>
          </div>

          {currentModalAsgn.todos.length>0&&(
            <div style={{marginBottom:20}}>
              <div style={{height:8,background:"rgba(255,255,255,.06)",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${currentModalAsgn.todos.filter(t=>t.done).length/currentModalAsgn.todos.length*100}%`,background:`linear-gradient(90deg,${colors.main},${colors.fin})`,borderRadius:4,transition:"width .4s ease"}}/>
              </div>
            </div>
          )}

          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(168,216,234,.5)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:10}}>Todo Items</div>
            {currentModalAsgn.todos.length===0 ? (
              <p style={{fontSize:13,color:"rgba(168,216,234,.35)",padding:"16px 0",textAlign:"center"}}>No todos yet.</p>
            ) : currentModalAsgn.todos.map(todo=>(
              <TodoItem
                key={todo.id} todo={todo} colors={colors}
                isTeacher={isTeacher} userId={userId}
                onToggle={()=>toggleTodo(todo.id,todo.done)}
                onSubmitFile={(file)=>submitFile(todo.id,file)}
                onRemoveFile={(subId,path)=>removeFile(subId,path,todo.id)}
                getSignedUrl={getSignedUrl}
              />
            ))}
          </div>

          {isTeacher && (
            <div style={{display:"flex",gap:10}}>
              <input className="input-ocean" value={modalTodoInput} onChange={e=>setModalTodoInput(e.target.value)} placeholder="Add a todo item..." style={{flex:1,fontSize:13}} onKeyDown={e=>e.key==="Enter"&&addModalTodo()}/>
              <button className="ocean-btn btn-primary" style={{padding:"10px 16px",fontSize:13,whiteSpace:"nowrap"}} onClick={addModalTodo}>Add</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
