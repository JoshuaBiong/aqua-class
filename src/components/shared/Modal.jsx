export function Modal({ children, onClose, title }) {
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(6,21,36,.7)",backdropFilter:"blur(10px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#0d2540",border:"1px solid rgba(168,216,234,.15)",borderRadius:24,padding:"32px",width:"100%",maxWidth:460,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 30px 80px rgba(0,0,0,.5)",animation:"modalIn .3s cubic-bezier(.34,1.56,.64,1)",position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:16,right:16,width:32,height:32,border:"none",background:"rgba(255,255,255,.08)",borderRadius:"50%",cursor:"pointer",fontSize:14,color:"rgba(168,216,234,.6)",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        {title&&<h3 style={{fontFamily:"'Baloo 2',cursive",fontSize:22,color:"var(--ocean-pale)",marginBottom:20}}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}
