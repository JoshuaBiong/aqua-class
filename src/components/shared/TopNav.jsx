import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function TopNav({ user }) {
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div style={{position:"sticky",top:0,zIndex:50,background:"rgba(6,21,36,.9)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(168,216,234,.08)",padding:"0 28px",height:60,display:"flex",alignItems:"center",gap:16}}>
      <div style={{fontFamily:"'Baloo 2',cursive",fontSize:22,fontWeight:800,background:"linear-gradient(135deg,var(--ocean-pale),var(--kelp-light))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>🌊 AquaClass</div>
      <div style={{flex:1}}/>
      <span className={user.role==="teacher"?"tag tag-teacher":"tag tag-student"}>{user.avatar} {user.role==="teacher"?"Teacher":"Student"}</span>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",borderRadius:50,background:"rgba(255,255,255,.06)",border:"1px solid rgba(168,216,234,.12)"}}>
        <span style={{fontSize:16}}>{user.avatar}</span>
        <span style={{fontSize:13,color:"var(--ocean-pale)",fontWeight:600}}>{user.name}</span>
      </div>
      <button className="ocean-btn btn-ghost" style={{padding:"8px 16px",fontSize:13}} onClick={logout}>Sign Out</button>
    </div>
  );
}
