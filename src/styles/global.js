// ─── Fonts & Global Styles ───────────────────────────────────────────────────
export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --ocean-deep:#0a2540;--ocean-mid:#1a4a6e;--ocean-light:#2d7db3;
  --ocean-pale:#a8d8ea;--foam:#e8f6ff;--coral:#ff6b6b;--coral-soft:#ffb3b3;
  --kelp:#52b788;--kelp-light:#95d5b2;--gold:#ffd166;--pearl:#f8fbff;
  --bubble:rgba(255,255,255,0.15);--glass:rgba(255,255,255,0.08);--radius:20px;--radius-sm:12px;
}
body{font-family:'Nunito',sans-serif;background:var(--ocean-deep);color:var(--pearl);overflow-x:hidden;min-height:100vh;}
h1,h2,h3,h4{font-family:'Baloo 2',cursive;}
::-webkit-scrollbar{width:6px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(168,216,234,0.3);border-radius:3px;}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes bubble-rise{0%{transform:translateY(0) scale(1);opacity:.6}100%{transform:translateY(-120px) scale(1.3);opacity:0}}
@keyframes modalIn{from{transform:scale(.88) translateY(20px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 0 0 rgba(168,216,234,.4)}50%{box-shadow:0 0 0 12px rgba(168,216,234,0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes uploadPulse{0%,100%{opacity:1}50%{opacity:.5}}
.anim-fadeup{animation:fadeUp .5s ease forwards;}
.anim-float{animation:float 4s ease-in-out infinite;}
.glass-card{background:var(--glass);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);border-radius:var(--radius);}
.ocean-btn{font-family:'Baloo 2',cursive;font-size:15px;font-weight:600;padding:12px 28px;border-radius:50px;border:none;cursor:pointer;transition:all .2s ease;letter-spacing:.02em;}
.ocean-btn:hover{transform:translateY(-2px);filter:brightness(1.1);}
.ocean-btn:active{transform:translateY(0);}
.ocean-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.btn-primary{background:linear-gradient(135deg,var(--ocean-light),var(--kelp));color:white;box-shadow:0 4px 20px rgba(45,125,179,.4);}
.btn-coral{background:linear-gradient(135deg,var(--coral),#ff9a3c);color:white;box-shadow:0 4px 20px rgba(255,107,107,.4);}
.btn-gold{background:linear-gradient(135deg,var(--gold),#ff9a3c);color:var(--ocean-deep);box-shadow:0 4px 20px rgba(255,209,102,.4);}
.btn-ghost{background:var(--bubble);color:var(--pearl);border:1px solid rgba(255,255,255,.15);}
.btn-ghost:hover{background:rgba(255,255,255,.2);}
.input-ocean{width:100%;padding:12px 16px;background:rgba(255,255,255,.06);border:1.5px solid rgba(168,216,234,.25);border-radius:var(--radius-sm);color:var(--pearl);font-family:'Nunito',sans-serif;font-size:14px;outline:none;transition:border-color .2s,background .2s;}
.input-ocean::placeholder{color:rgba(168,216,234,.45);}
.input-ocean:focus{border-color:var(--ocean-pale);background:rgba(255,255,255,.1);}
.tag{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:50px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;}
.tag-teacher{background:rgba(255,209,102,.2);color:var(--gold);border:1px solid rgba(255,209,102,.3);}
.tag-student{background:rgba(82,183,136,.2);color:var(--kelp-light);border:1px solid rgba(82,183,136,.3);}
.room-code{font-family:'Baloo 2',cursive;font-size:22px;font-weight:800;letter-spacing:.2em;color:var(--gold);background:rgba(255,209,102,.1);padding:8px 18px;border-radius:10px;border:1.5px dashed rgba(255,209,102,.4);cursor:pointer;transition:background .2s;}
.room-code:hover{background:rgba(255,209,102,.18);}
.upload-zone{border:2px dashed rgba(168,216,234,.25);border-radius:12px;padding:14px;text-align:center;cursor:pointer;transition:all .2s ease;background:rgba(168,216,234,.03);margin-top:10px;}
.upload-zone:hover,.upload-zone.drag-over{border-color:rgba(168,216,234,.6);background:rgba(168,216,234,.08);}
.file-chip{display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(82,183,136,.1);border:1px solid rgba(82,183,136,.25);border-radius:10px;margin-top:6px;font-size:12px;color:var(--kelp-light);}
.file-chip-teacher{background:rgba(168,216,234,.08);border-color:rgba(168,216,234,.2);color:var(--ocean-pale);}
.file-chip a{color:inherit;text-decoration:none;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.file-chip a:hover{text-decoration:underline;}
.remove-file{background:none;border:none;cursor:pointer;color:rgba(255,100,100,.6);font-size:14px;padding:0 2px;transition:color .15s;flex-shrink:0;}
.remove-file:hover{color:rgba(255,100,100,1);}
.uploading{animation:uploadPulse 1s ease infinite;}
.spinner{width:18px;height:18px;border:2px solid rgba(168,216,234,.3);border-top-color:var(--ocean-pale);border-radius:50%;animation:spin .7s linear infinite;display:inline-block;}
.err-box{background:rgba(255,107,107,.15);border:1px solid rgba(255,107,107,.3);border-radius:10px;padding:10px 14px;font-size:13px;color:#ff9a9a;margin-bottom:16px;}
.success-box{background:rgba(82,183,136,.15);border:1px solid rgba(82,183,136,.3);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--kelp-light);margin-bottom:16px;}
`;
