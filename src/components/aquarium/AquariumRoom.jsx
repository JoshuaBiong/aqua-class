import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { FISH_COLORS, labelSt } from "../../lib/constants";
import { FishSim } from "../../lib/FishSim";
import { calcSize, drawOceanBg, drawSeaweed, drawCage, drawFish } from "../../lib/canvasUtils";
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
  const roleRef    = useRef(userRole);
  const userIdRef  = useRef(userId);
  const resizeRef  = useRef(null);
  const canvasInitialized = useRef(false);

  const [room, setRoom]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalAsgnId, setModalAsgnId] = useState(null);
  const [cursor, setCursor]         = useState({x:-100,y:-100});
  const [actionError, setActionError] = useState(null);

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

  // Auto-dismiss action errors after 4 seconds
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 4000);
    return () => clearTimeout(t);
  }, [actionError]);

  // ── Load room + realtime ────────────────────────────────────────────────────
  const loadRoom = useCallback(async () => {
    try {
      setLoadError(null);
      const { data, error } = await supabase
        .from("rooms")
        .select(`*, room_members(student_id), assignments(*, todos(*, submissions(*), student_completions(*)))`)
        .eq("id", roomId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setRoom(data);
        roomRef.current = data;
      } else {
        setLoadError("not_found");
      }
    } catch (err) {
      console.error("Error loading room:", err);
      setLoadError(err.message || "Failed to load room");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

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

  // ── Canvas callback ref — fires when canvas actually mounts in DOM ──────────
  const canvasRefCallback = useCallback((canvas) => {
    if (!canvas) return;
    canvasRef.current = canvas;

    // Size the canvas to fill the window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const cw = canvas.width, ch = canvas.height;

    // Initialize simulation state
    simRef.current = {
      mouseX: cw / 2, mouseY: ch / 2, mouseActive: false, mouseTimer: null,
      cageArea: { x: cw - 220, y: ch - 190, w: 200, h: 165 },
      fishMap: new Map()
    };

    // Sync fish map immediately if room is already loaded
    if (roomRef.current) {
      const assignments = roomRef.current.assignments || [];
      assignments.forEach(a => {
        if (!simRef.current.fishMap.has(a.id)) {
          simRef.current.fishMap.set(a.id, new FishSim(cw, ch));
        }
      });
    }

    // Resize handler
    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (simRef.current) {
        simRef.current.cageArea = { x: canvas.width - 220, y: canvas.height - 190, w: 200, h: 165 };
      }
    };
    resizeRef.current = onResize;
    window.addEventListener("resize", onResize);

    // Start animation loop
    const ctx = canvas.getContext("2d");
    const loop = ts => {
      if (!simRef.current || !roomRef.current) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const { mouseX, mouseY, mouseActive, cageArea, fishMap } = simRef.current;
      const r = roomRef.current, cw2 = canvas.width, ch2 = canvas.height;
      ctx.clearRect(0, 0, cw2, ch2);
      drawOceanBg(ctx, cw2, ch2, ts);
      drawSeaweed(ctx, cw2, ch2, ts);
      const assignments = r.assignments || [];
      const memberCount = (r.room_members || []).length;
      const isTeacherView = roleRef.current === "teacher";
      const currentUserId = userIdRef.current;

      // Determine isDone per assignment based on role
      const getIsDone = (asgn) => {
        const todos = asgn.todos || [];
        if (todos.length === 0) return false;
        if (!isTeacherView) {
          // Student: done when this student has completions for ALL todos
          return todos.every(t => (t.student_completions || []).some(c => c.student_id === currentUserId));
        } else {
          // Teacher: done when every room member has completions for ALL todos
          if (memberCount === 0) return false;
          return todos.every(t => {
            const completedStudents = new Set((t.student_completions || []).map(c => c.student_id));
            return completedStudents.size >= memberCount;
          });
        }
      };

      const doneCnt = assignments.filter(a => getIsDone(a)).length;
      drawCage(ctx, cageArea, doneCnt);
      assignments.forEach(asgn => {
        const fish = fishMap.get(asgn.id); if (!fish) return;
        const todos = asgn.todos || [];
        // Size based on total todos vs completed (student's own completions for size)
        const completedCount = isTeacherView
          ? todos.filter(t => { const s = new Set((t.student_completions || []).map(c => c.student_id)); return s.size >= memberCount; }).length
          : todos.filter(t => (t.student_completions || []).some(c => c.student_id === currentUserId)).length;
        const size = calcSize(todos.length, completedCount);
        const isDone = getIsDone(asgn);
        fish.update({ mouseX, mouseY, mouseActive, isDone, cageArea, cw: cw2, ch: ch2, size });

        let label;
        if (isTeacherView && memberCount > 0 && todos.length > 0) {
          // Show how many students have completed ALL todos for this assignment
          const studentsComplete = (r.room_members || []).filter(m => {
            return todos.every(t => (t.student_completions || []).some(c => c.student_id === m.student_id));
          }).length;
          label = isDone ? asgn.name : `${asgn.name} (${studentsComplete}/${memberCount})`;
        } else {
          const pending = todos.length - completedCount;
          label = pending > 0 ? `${asgn.name} (${pending})` : asgn.name;
        }

        const color = FISH_COLORS[(asgn.color_index || 0) % FISH_COLORS.length] || FISH_COLORS[0];
        drawFish(ctx, fish, color, size, label, fish.dialogAlpha);
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    canvasInitialized.current = true;
  }, []);

  // ── Cleanup animation frame + resize on unmount ─────────────────────────────
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resizeRef.current) window.removeEventListener("resize", resizeRef.current);
    };
  }, []);

  // ── Sync fish map when room data changes ────────────────────────────────────
  useEffect(() => {
    if (!simRef.current || !room) return;
    const { fishMap } = simRef.current;
    const canvas = canvasRef.current;
    const assignments = room.assignments || [];
    assignments.forEach(a => {
      if (!fishMap.has(a.id)) {
        fishMap.set(a.id, new FishSim(canvas?.width || window.innerWidth, canvas?.height || window.innerHeight));
      }
    });
    fishMap.forEach((_, id) => {
      if (!assignments.find(a => a.id === id)) fishMap.delete(id);
    });
  }, [room]);

  // ── Mouse ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = e => {
      setCursor({ x: e.clientX, y: e.clientY });
      if (!simRef.current || !roomRef.current) return;
      const s = simRef.current; s.mouseX = e.clientX; s.mouseY = e.clientY; s.mouseActive = true;
      clearTimeout(s.mouseTimer); s.mouseTimer = setTimeout(() => s.mouseActive = false, 2000);
      s.fishMap.forEach(f => f.hovered = false);
      (roomRef.current.assignments || []).forEach(a => {
        const fish = s.fishMap.get(a.id); if (!fish) return;
        const todos = a.todos || [];
        const size = calcSize(todos.length, todos.filter(t => t.done).length);
        fish.hovered = fish.contains(e.clientX, e.clientY, size);
      });
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  // ── Canvas click ─────────────────────────────────────────────────────────────
  const handleCanvasClick = useCallback(e => {
    if (!simRef.current || !roomRef.current) return;
    const px = e.clientX, py = e.clientY;
    for (const asgn of (roomRef.current.assignments || [])) {
      const fish = simRef.current.fishMap.get(asgn.id); if (!fish) continue;
      const todos = asgn.todos || [];
      const size = calcSize(todos.length, todos.filter(t => t.done).length);
      if (fish.contains(px, py, size)) {
        fish.excited = true; fish.exciteTimer = 120; fish.exciteX = px; fish.exciteY = py;
        setTimeout(() => setModalAsgnId(asgn.id), 200); return;
      }
    }
  }, []);

  // ── ESC ──────────────────────────────────────────────────────────────────────
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape"){setModalAsgnId(null);setShowNewAsgn(false);}};
    document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h);
  },[]);

  // ── Teacher actions ──────────────────────────────────────────────────────────
  const addAssignment = async () => {
    if(!newAsgnName.trim()){setActionError("Assignment name is required.");return;}
    setSaving(true);setActionError(null);
    const { error } = await supabase.from("assignments").insert({room_id:roomId,name:newAsgnName.trim(),color_index:newAsgnColor,due_date:newAsgnDue||null});
    setSaving(false);
    if (error) { setActionError("Failed to create assignment: " + error.message); return; }
    setNewAsgnName("");setNewAsgnDue("");setShowNewAsgn(false);
  };

  const addTodo = async () => {
    if(!newTodoTitle.trim()||!todoAsgnId){setActionError("Select an assignment and enter a title.");return;}
    setSaving(true);setActionError(null);
    const { error } = await supabase.from("todos").insert({assignment_id:todoAsgnId,title:newTodoTitle.trim(),notes:newTodoNotes.trim()});
    setSaving(false);
    if (error) { setActionError("Failed to add todo: " + error.message); return; }
    setNewTodoTitle("");setNewTodoNotes("");
  };

  const addModalTodo = async () => {
    if(!modalTodoInput.trim()||!modalAsgnId)return;
    setActionError(null);
    const { error } = await supabase.from("todos").insert({assignment_id:modalAsgnId,title:modalTodoInput.trim(),notes:""});
    if (error) { setActionError("Failed to add todo: " + error.message); return; }
    setModalTodoInput("");
  };

  const toggleTodo = async (todoId, currentDone) => {
    if (isTeacher) return; // Teachers cannot toggle
    if (currentDone) {
      // Uncheck: delete from student_completions
      const { error } = await supabase.from("student_completions").delete()
        .eq("todo_id", todoId).eq("student_id", userId);
      if (error) setActionError("Failed to update todo: " + error.message);
    } else {
      // Check: upsert into student_completions (ignores duplicates to prevent 409 errors)
      const { error } = await supabase.from("student_completions").upsert(
        { todo_id: todoId, student_id: userId },
        { onConflict: 'todo_id, student_id', ignoreDuplicates: true }
      );
      if (error) setActionError("Failed to update todo: " + error.message);
    }
  };

  const deleteAssignment = async (asgnId) => {
    if (!confirm("Delete this assignment and all its todos? This cannot be undone.")) return;
    setActionError(null);
    const { error } = await supabase.from("assignments").delete().eq("id", asgnId);
    if (error) { setActionError("Failed to delete assignment: " + error.message); return; }
    setModalAsgnId(null);
  };

  const deleteRoom = async () => {
    if (!confirm(`Are you sure you want to delete the aquarium "${room.name}"? This will delete all assignments, todos, and submissions inside it. This action cannot be undone.`)) return;
    setSaving(true); setActionError(null);
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);
    setSaving(false);
    if (error) { setActionError("Failed to delete room: " + error.message); return; }
    navigate("/teacher");
  };

  const deleteTodo = async (todoId) => {
    setActionError(null);
    const { error } = await supabase.from("todos").delete().eq("id", todoId);
    if (error) setActionError("Failed to delete todo: " + error.message);
  };

  // ── Student file upload ──────────────────────────────────────────────────────
  const submitFile = async (todoId, file) => {
    if(file.size>10*1024*1024){setActionError("File too large. Max 10MB.");return;}
    const path=`${userId}/${todoId}/${Date.now()}-${file.name}`;
    const{error:upErr}=await supabase.storage.from("submissions").upload(path,file);
    if(upErr){setActionError("Upload failed: " + upErr.message);return;}
    const { error } = await supabase.from("submissions").insert({todo_id:todoId,student_id:userId,file_name:file.name,file_type:file.type,file_size:file.size,storage_path:path});
    if (error) { setActionError("Failed to save submission: " + error.message); return; }
    await supabase.from("todos").update({done:true}).eq("id",todoId);
  };

  const removeFile = async (submissionId, storagePath, todoId) => {
    await supabase.storage.from("submissions").remove([storagePath]);
    await supabase.from("submissions").delete().eq("id",submissionId);
    const{data:remaining}=await supabase.from("submissions").select("id").eq("todo_id",todoId);
    if((remaining||[]).length===0) await supabase.from("todos").update({done:false}).eq("id",todoId);
  };

  const getSignedUrl = async (storagePath) => {
    const{data}=await supabase.storage.from("submissions").createSignedUrl(storagePath,3600);
    return data?.signedUrl;
  };

  // ── Early returns for loading / error / not found ───────────────────────────
  if (loading) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0a2540"}}>
        <Loader text="Diving into the aquarium..." />
      </div>
    );
  }

  if (loadError === "not_found") {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(160deg,#061524,#0d2d50,#0a1f3a)"}}>
        <div className="glass-card" style={{padding:48,textAlign:"center",maxWidth:420}}>
          <div style={{fontSize:56,marginBottom:16}}>🔍</div>
          <h2 style={{fontFamily:"'Baloo 2',cursive",color:"var(--ocean-pale)",marginBottom:8}}>Aquarium not found</h2>
          <p style={{color:"rgba(168,216,234,.6)",fontSize:14,marginBottom:24}}>This aquarium doesn't exist or you don't have permission to view it.</p>
          <button className="ocean-btn btn-primary" onClick={()=>navigate(isTeacher?"/teacher":"/student")}>← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(160deg,#061524,#0d2d50,#0a1f3a)"}}>
        <div className="glass-card" style={{padding:48,textAlign:"center",maxWidth:420}}>
          <div style={{fontSize:56,marginBottom:16}}>⚠️</div>
          <h2 style={{fontFamily:"'Baloo 2',cursive",color:"var(--ocean-pale)",marginBottom:8}}>Something went wrong</h2>
          <p style={{color:"rgba(168,216,234,.6)",fontSize:14,marginBottom:24}}>{loadError}</p>
          <div style={{display:"flex",gap:12,justifyContent:"center"}}>
            <button className="ocean-btn btn-primary" onClick={()=>{setLoading(true);loadRoom();}}>🔄 Retry</button>
            <button className="ocean-btn btn-ghost" onClick={()=>navigate(isTeacher?"/teacher":"/student")}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0a2540"}}>
        <Loader text="Loading aquarium..." />
      </div>
    );
  }

  const currentModalAsgn = room.assignments.find(a=>a.id===modalAsgnId) || null;
  const colors = currentModalAsgn ? FISH_COLORS[currentModalAsgn.color_index%FISH_COLORS.length] : null;

  return (
    <div style={{position:"relative",width:"100vw",height:"100vh",overflow:"hidden",cursor:"none"}}>
      <div style={{position:"fixed",left:cursor.x,top:cursor.y,width:18,height:18,borderRadius:"50%",background:"rgba(168,216,234,.3)",border:"2px solid rgba(168,216,234,.7)",pointerEvents:"none",transform:"translate(-50%,-50%)",zIndex:9999}}/>
      <canvas ref={canvasRefCallback} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%"}} onClick={handleCanvasClick}/>

      {/* Action error toast */}
      {actionError && (
        <div style={{position:"fixed",top:72,left:"50%",transform:"translateX(-50%)",zIndex:200,animation:"fadeUp .3s ease forwards"}}>
          <div className="err-box" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 18px",whiteSpace:"nowrap"}}>
            <span>{actionError}</span>
            <button onClick={()=>setActionError(null)} style={{background:"none",border:"none",color:"#ff9a9a",cursor:"pointer",fontSize:16,padding:0}}>✕</button>
          </div>
        </div>
      )}

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
        <div style={{padding:"72px 24px 20px",borderBottom:"1px solid rgba(168,216,234,.1)",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div style={{flex:1,paddingRight:12}}>
            <h2 style={{fontFamily:"'Baloo 2',cursive",fontSize:22,color:"var(--ocean-pale)",marginBottom:4,lineHeight:1.1}}>🌊 {room.name}</h2>
            <p style={{fontSize:12,color:"rgba(168,216,234,.45)"}}>{room.description}</p>
          </div>
          <button onClick={()=>setSidebarOpen(false)} style={{background:"rgba(255,255,255,.05)",border:"none",color:"rgba(168,216,234,.5)",width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:13,transition:"all .2s"}}>✕</button>
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
        
        {isTeacher && (
          <div style={{padding:"20px 24px",borderTop:"1px solid rgba(255,107,107,.15)",background:"rgba(255,107,107,.03)"}}>
            <button className="ocean-btn" style={{width:"100%",fontSize:13,padding:"10px",background:"rgba(255,107,107,.1)",color:"#ff6b6b",border:"1px solid rgba(255,107,107,.2)"}} onClick={deleteRoom} disabled={saving}>
              {saving?"Deleting...":"🗑️ Delete Aquarium"}
            </button>
          </div>
        )}
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
            <input className="input-ocean" type="date" value={newAsgnDue} onChange={e=>setNewAsgnDue(e.target.value)} />
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
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:700,color:colors.main,textTransform:"uppercase",letterSpacing:".07em",marginBottom:3}}>Assignment</div>
              <h3 style={{fontFamily:"'Baloo 2',cursive",fontSize:22,color:"var(--ocean-pale)",lineHeight:1.2}}>{currentModalAsgn.name}</h3>
            </div>
            {isTeacher && (
              <button onClick={()=>deleteAssignment(currentModalAsgn.id)} title="Delete assignment" style={{width:36,height:36,borderRadius:"50%",border:"none",background:"rgba(255,107,107,.15)",color:"var(--coral)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .2s"}}>🗑️</button>
            )}
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
            ) : currentModalAsgn.todos.map(todo => {
              const myCompletion = (todo.student_completions || []).some(c => c.student_id === userId);
              const completionCount = (todo.student_completions || []).length;
              const memberCount = (room.room_members || []).length;
              return (
              <TodoItem
                key={todo.id} todo={{...todo, done: isTeacher ? (memberCount > 0 && completionCount >= memberCount) : myCompletion}} colors={colors}
                isTeacher={isTeacher} userId={userId}
                onToggle={() => toggleTodo(todo.id, myCompletion)}
                onSubmitFile={(file) => submitFile(todo.id, file)}
                onRemoveFile={(subId, path) => removeFile(subId, path, todo.id)}
                onDeleteTodo={() => deleteTodo(todo.id)}
                getSignedUrl={getSignedUrl}
                completionCount={completionCount}
                memberCount={memberCount}
              />
              );
            })}
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
