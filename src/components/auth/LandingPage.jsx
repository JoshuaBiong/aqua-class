import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const navigate = useNavigate();
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"linear-gradient(160deg,#061524 0%,#0d2d50 50%,#0a1f3a 100%)",padding:"40px 20px",overflow:"hidden",position:"relative"}}>
      {[...Array(12)].map((_,i)=>(
        <div key={i} style={{position:"absolute",borderRadius:"50%",width:8+i*6,height:8+i*6,left:`${(i*17)%90}%`,bottom:`-${20+i*10}px`,background:"rgba(100,180,240,.08)",border:"1px solid rgba(100,180,240,.12)",animation:`bubble-rise ${3+i*.7}s ease-in ${i*.4}s infinite`}}/>
      ))}
      <div style={{textAlign:"center",zIndex:1,animation:"fadeUp .8s ease forwards"}}>
        <div style={{fontSize:72,marginBottom:8}} className="anim-float">🌊</div>
        <h1 style={{fontFamily:"'Baloo 2',cursive",fontSize:"clamp(42px,8vw,80px)",fontWeight:800,lineHeight:1.1,marginBottom:16,background:"linear-gradient(135deg,#a8d8ea,#fff,#52b788)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>AquaClass</h1>
        <p style={{fontSize:18,color:"rgba(168,216,234,.8)",maxWidth:480,lineHeight:1.6,marginBottom:12}}>"Have you checked your aquarium today?"</p>
        <p style={{fontSize:14,color:"rgba(168,216,234,.5)",marginBottom:48,maxWidth:400}}>A classroom where every assignment is a fish waiting to be completed. Teachers create aquariums. Students dive in.</p>
        <button className="ocean-btn btn-primary" style={{fontSize:17,padding:"14px 36px"}} onClick={()=>navigate("/login")}>🐠 Dive In</button>
        <div style={{marginTop:64,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20,maxWidth:640}}>
          {[{icon:"🏫",title:"Create Aquariums",desc:"Teachers set up class rooms as underwater tanks"},{icon:"🐟",title:"Fish = Assignments",desc:"Each assignment category swims as a living fish"},{icon:"✅",title:"Done? To the cage!",desc:"Completed work moves to the done aquarium"}].map((f,i)=>(
            <div key={i} className="glass-card" style={{padding:"20px 16px",textAlign:"center",animation:`fadeUp ${.5+i*.15}s ease forwards`,opacity:0}}>
              <div style={{fontSize:28,marginBottom:8}}>{f.icon}</div>
              <div style={{fontFamily:"'Baloo 2',cursive",fontWeight:600,fontSize:14,color:"var(--ocean-pale)",marginBottom:6}}>{f.title}</div>
              <div style={{fontSize:12,color:"rgba(168,216,234,.5)",lineHeight:1.5}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
