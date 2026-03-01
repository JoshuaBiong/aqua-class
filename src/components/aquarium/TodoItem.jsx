import { useState, useRef, useEffect } from "react";

export function TodoItem({ todo, colors, isTeacher, userId, onToggle, onSubmitFile, onRemoveFile, getSignedUrl }) {
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded]   = useState(false);
  const [signedUrls, setSignedUrls] = useState({});
  const fileRef = useRef(null);
  const submissions = todo.submissions || [];

  // Load signed URLs for files when expanded
  useEffect(() => {
    if (!expanded || submissions.length===0) return;
    const load = async () => {
      const urls = {};
      for (const s of submissions) {
        urls[s.id] = await getSignedUrl(s.storage_path);
      }
      setSignedUrls(urls);
    };
    load();
  }, [expanded, submissions.length, getSignedUrl]);

  const fileIcon = (type) => {
    if (!type) return "📎";
    if (type.startsWith("image/")) return "🖼️";
    if (type==="application/pdf") return "📄";
    if (type.includes("word")) return "📝";
    if (type.includes("spreadsheet")||type.includes("excel")) return "📊";
    if (type.startsWith("video/")) return "🎬";
    if (type.startsWith("audio/")) return "🎵";
    return "📎";
  };

  const fmtSize = (b) => b<1024?`${b}B`:b<1048576?`${(b/1024).toFixed(1)}KB`:`${(b/1048576).toFixed(1)}MB`;

  const handleFiles = async (files) => {
    setUploading(true);
    for (const f of Array.from(files)) await onSubmitFile(f);
    setUploading(false);
    setExpanded(true);
  };

  return (
    <div style={{borderBottom:"1px solid rgba(168,216,234,.08)",paddingBottom:12,marginBottom:4}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12,paddingTop:10}}>
        <div onClick={isTeacher?onToggle:undefined} style={{width:20,height:20,borderRadius:"50%",flexShrink:0,border:`2px solid ${colors.main}`,marginTop:2,background:todo.done?colors.main:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:isTeacher?"pointer":"default",fontSize:11,color:"white",transition:"all .2s",boxShadow:todo.done?`0 0 8px ${colors.main}66`:"none"}}>
          {todo.done?"✓":""}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600,color:todo.done?"rgba(168,216,234,.4)":"var(--pearl)",textDecoration:todo.done?"line-through":"none",transition:"all .2s"}}>{todo.title}</div>
          {todo.notes&&<div style={{fontSize:11,color:"rgba(168,216,234,.4)",marginTop:3}}>📝 {todo.notes}</div>}
          {submissions.length>0&&(
            <button onClick={()=>setExpanded(v=>!v)} style={{marginTop:6,display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:50,border:"none",cursor:"pointer",background:"rgba(82,183,136,.15)",color:"var(--kelp-light)",fontSize:11,fontWeight:700,fontFamily:"'Nunito',sans-serif"}}>
              📎 {submissions.length} file{submissions.length>1?"s":""} {expanded?"▲":"▼"}
            </button>
          )}
        </div>
        <div style={{flexShrink:0,padding:"2px 10px",borderRadius:50,fontSize:10,fontWeight:700,background:todo.done?"rgba(82,183,136,.15)":"rgba(255,209,102,.1)",border:`1px solid ${todo.done?"rgba(82,183,136,.3)":"rgba(255,209,102,.2)"}`,color:todo.done?"var(--kelp-light)":"var(--gold)"}}>
          {todo.done?"✓ Done":"Pending"}
        </div>
      </div>

      {/* Submitted files */}
      {expanded&&submissions.length>0&&(
        <div style={{marginTop:8,marginLeft:32}}>
          {submissions.map(sub=>(
            <div key={sub.id} className={`file-chip${isTeacher?" file-chip-teacher":""}`}>
              <span style={{fontSize:16,flexShrink:0}}>{fileIcon(sub.file_type)}</span>
              {signedUrls[sub.id]
                ? <a href={signedUrls[sub.id]} target="_blank" rel="noreferrer" title={sub.file_name}>{sub.file_name}</a>
                : <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sub.file_name}</span>
              }
              <span style={{fontSize:10,color:"rgba(168,216,234,.4)",flexShrink:0}}>{fmtSize(sub.file_size)}</span>
              <span style={{fontSize:10,color:"rgba(168,216,234,.3)",flexShrink:0}}>{sub.profiles?.name||"Student"}</span>
              {(!isTeacher && sub.student_id===userId) || isTeacher ? (
                <button className="remove-file" onClick={()=>onRemoveFile(sub.id,sub.storage_path)} title="Remove">✕</button>
              ):null}
            </div>
          ))}
        </div>
      )}

      {/* Upload zone — students only */}
      {!isTeacher&&(
        <div style={{marginLeft:32,marginTop:6}}>
          {uploading ? (
            <div className="upload-zone uploading" style={{cursor:"default"}}>
              <span className="spinner" style={{verticalAlign:"middle",marginRight:8}}/>
              <span style={{fontSize:13,color:"rgba(168,216,234,.6)"}}>Uploading...</span>
            </div>
          ):(
            <div className={`upload-zone${dragging?" drag-over":""}`}
              onDrop={e=>{e.preventDefault();setDragging(false);handleFiles(e.dataTransfer.files);}}
              onDragOver={e=>{e.preventDefault();setDragging(true);}}
              onDragLeave={()=>setDragging(false)}
              onClick={()=>fileRef.current?.click()}>
              <input ref={fileRef} type="file" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.mp4,.mp3"/>
              <div style={{fontSize:20,marginBottom:4}}>📤</div>
              <div style={{fontSize:12,color:"rgba(168,216,234,.55)",fontWeight:600}}>{submissions.length>0?"Upload another file":"Upload your submission"}</div>
              <div style={{fontSize:10,color:"rgba(168,216,234,.3)",marginTop:3}}>Click or drag & drop · Max 10MB</div>
            </div>
          )}
        </div>
      )}
      {isTeacher&&submissions.length===0&&(
        <div style={{marginLeft:32,marginTop:6,fontSize:11,color:"rgba(168,216,234,.25)",fontStyle:"italic"}}>No files submitted yet</div>
      )}
    </div>
  );
}
