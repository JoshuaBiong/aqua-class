export function Loader({ text }) {
  return (
    <div style={{textAlign:"center",padding:"60px 0"}}>
      <div style={{fontSize:48,marginBottom:12}} className="anim-float">🐠</div>
      <div className="spinner" style={{width:32,height:32,margin:"0 auto",borderWidth:3}}/>
      <p style={{color:"var(--ocean-pale)",marginTop:16,fontFamily:"'Baloo 2',cursive",fontSize:16}}>{text}</p>
    </div>
  );
}
