// ─── Fish Simulation ──────────────────────────────────────────────────────────
export class FishSim {
  constructor(cw,ch){
    this.x=80+Math.random()*(cw-160); this.y=60+Math.random()*(ch-180);
    this.vx=(Math.random()-.5)*1.4; this.vy=(Math.random()-.5)*1.4;
    this.angle=0; this.targetAngle=0;
    this.wander={angle:Math.random()*Math.PI*2,timer:0};
    this.tailPhase=Math.random()*Math.PI*2;
    this.excited=false; this.exciteTimer=0; this.exciteX=0; this.exciteY=0;
    this.hovered=false; this.dialogAlpha=0;
  }
  update({mouseX,mouseY,mouseActive,isDone,cageArea,cw,ch,size}){
    this.tailPhase+=0.12;
    if(isDone){
      const inCage=this.x>cageArea.x+size&&this.x<cageArea.x+cageArea.w-size&&this.y>cageArea.y+size&&this.y<cageArea.y+cageArea.h-size;
      if(!inCage){
        const dx=(cageArea.x+cageArea.w/2)-this.x,dy=(cageArea.y+cageArea.h/2)-this.y,d=Math.sqrt(dx*dx+dy*dy)||1;
        this.vx+=dx/d*.1;this.vy+=dy/d*.1;
        const spd=Math.sqrt(this.vx*this.vx+this.vy*this.vy);if(spd>1.5){this.vx*=1.5/spd;this.vy*=1.5/spd;}
      }else{
        this.wander.timer--;
        if(this.wander.timer<=0){this.wander.angle+=(Math.random()-.5)*2;this.wander.timer=40+Math.random()*80;}
        this.vx+=Math.cos(this.wander.angle)*.04;this.vy+=Math.sin(this.wander.angle)*.04;
        const spd=Math.sqrt(this.vx*this.vx+this.vy*this.vy);if(spd>.9){this.vx*=.9/spd;this.vy*=.9/spd;}
        const m=size+4;
        if(this.x<cageArea.x+m){this.vx+=.25;this.wander.angle=0;}
        if(this.x>cageArea.x+cageArea.w-m){this.vx-=.25;this.wander.angle=Math.PI;}
        if(this.y<cageArea.y+m){this.vy+=.25;this.wander.angle=Math.PI/2;}
        if(this.y>cageArea.y+cageArea.h-m){this.vy-=.25;this.wander.angle=-Math.PI/2;}
      }
    }else if(this.excited&&this.exciteTimer>0){
      this.exciteTimer--;
      const dx=this.exciteX-this.x,dy=this.exciteY-this.y,d=Math.sqrt(dx*dx+dy*dy)||1;
      if(d>65){this.vx+=dx/d*.15;this.vy+=dy/d*.15;}
      else{const p={x:-dy/d,y:dx/d};this.vx+=p.x*.2;this.vy+=p.y*.2;}
      const spd=Math.sqrt(this.vx*this.vx+this.vy*this.vy);if(spd>2.5){this.vx*=2.5/spd;this.vy*=2.5/spd;}
      if(this.exciteTimer<=0)this.excited=false;
    }else if(mouseActive){
      const dx=mouseX-this.x,dy=mouseY-this.y,d=Math.sqrt(dx*dx+dy*dy)||1;
      if(d>80){this.vx+=dx/d*.06;this.vy+=dy/d*.06;}
      const spd=Math.sqrt(this.vx*this.vx+this.vy*this.vy);if(spd>2){this.vx*=2/spd;this.vy*=2/spd;}
    }else{
      this.wander.timer--;
      if(this.wander.timer<=0){this.wander.angle+=(Math.random()-.5)*1.5;this.wander.timer=60+Math.random()*120;}
      this.vx+=Math.cos(this.wander.angle)*.03;this.vy+=Math.sin(this.wander.angle)*.03;
      const spd=Math.sqrt(this.vx*this.vx+this.vy*this.vy);if(spd>1.2){this.vx*=1.2/spd;this.vy*=1.2/spd;}
    }
    this.x+=this.vx;this.y+=this.vy;
    if(!isDone){
      const m=size+10;
      const rightBound = Math.max(m + 100, cw - 280 - m);
      if(this.x < m) this.vx += 0.3; 
      if(this.x > rightBound) this.vx -= 0.3;
      if(this.y < m) this.vy += 0.3; 
      if(this.y > ch - m - 40) this.vy -= 0.3;
    }
    if(Math.abs(this.vx)>.05||Math.abs(this.vy)>.05)this.targetAngle=Math.atan2(this.vy,this.vx);
    let da=this.targetAngle-this.angle;
    while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
    this.angle+=Math.max(-.09,Math.min(.09,da*.12));
    this.dialogAlpha+=((this.hovered?1:0)-this.dialogAlpha)*.1;
  }
  contains(px,py,size){const dx=px-this.x,dy=py-this.y;return(dx*dx)/(size*size*.5)+(dy*dy)/(size*size*.12)<1;}
}
