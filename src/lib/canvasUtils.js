// ─── Canvas Drawing Utilities ───────────────────────────────────────────────────

export function calcSize(total,done){
  if(total===0)return 30;
  return Math.min(30+total*15,140)*(1-(done/total)*.4);
}

export function drawOceanBg(ctx,w,h,t){
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,"#0d2b4e");g.addColorStop(.5,"#0e3d6e");g.addColorStop(1,"#0a2540");
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  for(let i=0;i<4;i++){
    const x=w*(.15+i*.25),sg=ctx.createLinearGradient(x,0,x+40,h);
    sg.addColorStop(0,"rgba(100,180,240,.06)");sg.addColorStop(1,"rgba(100,180,240,0)");
    ctx.fillStyle=sg;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+60,0);ctx.lineTo(x+80,h);ctx.lineTo(x+20,h);ctx.fill();
  }
  for(let i=0;i<18;i++){
    const bx=(Math.sin(t*.00008+i*83)*.5+.5)*(w*.75),by=((t*.00006+i*.11)%1)*h,r=1.5+(i%4);
    ctx.beginPath();ctx.arc(bx,by,r,0,Math.PI*2);ctx.fillStyle=`rgba(150,210,240,${.08+.06*(i%3)})`;ctx.fill();
  }
}

export function drawCage(ctx,cage,count){
  const{x,y,w,h}=cage;
  const g=ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,"rgba(100,160,220,.12)");g.addColorStop(1,"rgba(60,120,180,.08)");
  ctx.fillStyle=g;ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x,y,w,h,14);
  } else {
    ctx.rect(x,y,w,h);
  }
  ctx.fill();
  ctx.strokeStyle="rgba(100,180,240,.3)";ctx.lineWidth=1.5;ctx.stroke();
  ctx.strokeStyle="rgba(100,180,240,.15)";ctx.lineWidth=1;
  for(let i=1;i<7;i++){const bx=x+(w/7)*i;ctx.beginPath();ctx.moveTo(bx,y);ctx.lineTo(bx,y+h);ctx.stroke();}
  for(let i=1;i<4;i++){const by=y+(h/4)*i;ctx.beginPath();ctx.moveTo(x,by);ctx.lineTo(x+w,by);ctx.stroke();}
  ctx.font="500 11px Nunito,sans-serif";ctx.fillStyle="rgba(168,216,234,.7)";ctx.textAlign="center";
  ctx.fillText(`✓ Completed (${count})`,x+w/2,y-8);
}

export function drawSeaweed(ctx,w,h,t){
  [.05,.18,.35,.72,.88,.96].forEach((px,i)=>{
    const x=px*w,ht=60+i*20;
    ctx.save();ctx.strokeStyle=`rgba(82,183,136,${.25+.1*(i%2)})`;ctx.lineWidth=3;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(x,h);
    for(let j=0;j<5;j++){const sy=h-j*(ht/4),sw=Math.sin(t*.001+i*1.3+j*.8)*18*(j*.3+.4);ctx.quadraticCurveTo(x+sw,sy-ht/8,x+sw*.5,sy-ht/4);}
    ctx.stroke();ctx.restore();
  });
}

export function drawFish(ctx,sim,colors,size,label,labelAlpha){
  const{x,y,angle,tailPhase,hovered}=sim;const s=size;const tw=Math.sin(tailPhase)*.3;
  const goingLeft=Math.cos(angle)<0,da=goingLeft?angle+Math.PI:angle;
  ctx.save();ctx.translate(x,y);ctx.rotate(da);if(goingLeft)ctx.scale(-1,1);
  ctx.shadowColor=colors.shadow;ctx.shadowBlur=hovered?22:6;
  ctx.save();ctx.rotate(tw);
  ctx.beginPath();ctx.moveTo(-s*.55,0);ctx.bezierCurveTo(-s*.9,-s*.35,-s*1.1,-s*.1,-s,0);
  ctx.bezierCurveTo(-s*1.1,s*.1,-s*.9,s*.35,-s*.55,0);ctx.fillStyle=colors.fin+"cc";ctx.fill();ctx.restore();
  ctx.beginPath();ctx.moveTo(s*.05,s*.05);ctx.bezierCurveTo(-s*.15,s*.35,s*.2,s*.42,s*.3,s*.22);ctx.fillStyle=colors.fin+"aa";ctx.fill();
  ctx.beginPath();ctx.moveTo(-s*.1,-s*.18);ctx.bezierCurveTo(s*.05,-s*.52,s*.35,-s*.42,s*.35,-s*.18);ctx.fillStyle=colors.fin+"bb";ctx.fill();
  ctx.beginPath();ctx.ellipse(0,0,s*.62,s*.28,0,0,Math.PI*2);ctx.fillStyle=colors.main;ctx.fill();
  ctx.beginPath();ctx.ellipse(s*.08,s*.06,s*.3,s*.12,-.2,0,Math.PI*2);ctx.fillStyle="rgba(255,255,255,.3)";ctx.fill();
  ctx.shadowBlur=0;
  ctx.beginPath();ctx.arc(s*.38,-s*.06,s*.07,0,Math.PI*2);ctx.fillStyle="rgba(20,40,60,.95)";ctx.fill();
  ctx.beginPath();ctx.arc(s*.4,-s*.08,s*.025,0,Math.PI*2);ctx.fillStyle="rgba(255,255,255,.95)";ctx.fill();
  ctx.restore();
  const alpha = Math.max(label ? 0.65 : 0, labelAlpha);
  if(alpha>.02){
    ctx.save();ctx.globalAlpha=alpha;
    const fs=Math.max(10,s*.21);ctx.font=`600 ${fs}px Nunito,sans-serif`;
    const tw2=ctx.measureText(label).width,bx=x-tw2/2-9,by=y-s*.5-34,bw=tw2+18,bh=23;
    if (ctx.roundRect) {
      ctx.roundRect(bx, by, bw, bh, 11);
    } else {
      ctx.rect(bx, by, bw, bh);
    }
    ctx.fill();
    ctx.strokeStyle="rgba(168,216,234,.3)";ctx.lineWidth=1;ctx.stroke();
    ctx.beginPath();ctx.moveTo(x-5,by+bh);ctx.lineTo(x+5,by+bh);ctx.lineTo(x,by+bh+7);ctx.fillStyle="rgba(10,37,64,.85)";ctx.fill();
    ctx.fillStyle=colors.main;ctx.fillText(label,x-tw2/2,by+16);
    ctx.globalAlpha=1;ctx.restore();
  }
}
