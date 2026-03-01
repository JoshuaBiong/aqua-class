import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { labelSt } from "../../lib/constants";

export function LoginPage({ loadProfile }) {
  const [mode, setMode]       = useState("login");
  const [role, setRole]       = useState("student");
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async () => {
    setErr(""); setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setErr(error.message); return; }
        const prof = await loadProfile(data.user.id);
        if (prof) navigate(prof.role === "teacher" ? "/teacher" : "/student");
      } else {
        if (!name.trim()) { setErr("Please enter your name."); return; }
        const { data, error } = await supabase.auth.signUp({ email, password, options:{ data:{ name, role } } });
        if (error) { setErr(error.message); return; }
        if (data.user) {
          // If identities is empty, the email is already registered
          if (data.user.identities && data.user.identities.length === 0) {
            setErr("This email is already registered. Please sign in instead.");
            return;
          }
          await supabase.from("profiles").upsert(
            { id: data.user.id, name: name.trim(), role, avatar: role === "teacher" ? "🧑‍🏫" : "🧑‍🎓", email: email.toLowerCase() },
            { onConflict: "id" }
          );
          const prof = await loadProfile(data.user.id);
          if (prof) navigate(prof.role === "teacher" ? "/teacher" : "/student");
        } else {
          setErr("Check your email to confirm your account, then sign in.");
        }
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(160deg,#061524,#0d2d50,#0a1f3a)",padding:"20px"}}>
      <div style={{width:"100%",maxWidth:420,animation:"fadeUp .5s ease forwards"}}>
        <button onClick={()=>navigate("/")} style={{background:"none",border:"none",color:"var(--ocean-pale)",cursor:"pointer",fontSize:14,marginBottom:24,display:"flex",alignItems:"center",gap:6,fontFamily:"'Nunito',sans-serif"}}>← Back to shore</button>
        <div className="glass-card" style={{padding:"36px 32px"}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:48}} className="anim-float">🐟</div>
            <h2 style={{fontSize:28,marginTop:8,color:"var(--ocean-pale)"}}>{mode==="login"?"Welcome back!":"Join AquaClass"}</h2>
            <p style={{fontSize:13,color:"rgba(168,216,234,.5)",marginTop:4}}>{mode==="login"?"Sign in to your aquarium":"Create your account"}</p>
          </div>

          {mode==="register" && (
            <>
              <div style={{marginBottom:14}}>
                <label style={labelSt} htmlFor="register-name">Your Name</label>
                <input id="register-name" name="name" className="input-ocean" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Ms. Marina" />
              </div>
              <div style={{marginBottom:14}}>
                <label style={labelSt}>I am a...</label>
                <div style={{display:"flex",gap:10}}>
                  {["teacher","student"].map(r=>(
                    <button key={r} onClick={()=>setRole(r)} style={{flex:1,padding:"10px",borderRadius:12,border:"1.5px solid",cursor:"pointer",fontSize:13,fontFamily:"'Nunito',sans-serif",fontWeight:600,background:role===r?"rgba(168,216,234,.15)":"transparent",borderColor:role===r?"var(--ocean-pale)":"rgba(168,216,234,.2)",color:role===r?"var(--ocean-pale)":"rgba(168,216,234,.5)",transition:"all .2s"}}>
                      {r==="teacher"?"🧑‍🏫 Teacher":"🧑‍🎓 Student"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div style={{marginBottom:14}}>
            <label style={labelSt} htmlFor="auth-email">Email</label>
            <input id="auth-email" name="email" className="input-ocean" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.edu" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>
          <div style={{marginBottom:20}}>
            <label style={labelSt} htmlFor="auth-password">Password</label>
            <input id="auth-password" name="password" className="input-ocean" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          </div>

          {err && <div className="err-box">{err}</div>}

          <button className="ocean-btn btn-primary" style={{width:"100%",fontSize:16,padding:"14px"}} onClick={handleSubmit} disabled={loading}>
            {loading ? <><span className="spinner" style={{verticalAlign:"middle",marginRight:8}}/> Please wait...</> : mode==="login"?"🌊 Sign In":"🐠 Create Account"}
          </button>

          <p style={{textAlign:"center",fontSize:13,color:"rgba(168,216,234,.5)",marginTop:16}}>
            {mode==="login"?"New to AquaClass? ":"Already have an account? "}
            <span style={{color:"var(--ocean-pale)",cursor:"pointer",fontWeight:600}} onClick={()=>{setMode(mode==="login"?"register":"login");setErr("");}}>
              {mode==="login"?"Register here":"Sign in"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
