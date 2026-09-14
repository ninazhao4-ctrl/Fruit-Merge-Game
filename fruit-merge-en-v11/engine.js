/* Original deterministic 2D circle impulse solver + game rules. Units: px, seconds. */
(function(root){
'use strict';
const {FRUITS}=root.FruitArt;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const BOUNDS=Object.freeze({left:89.375,right:584.625,floor:650,floorEdge:584,line:151,spawnY:103});
function rgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}
class FruitEngine{
 constructor({random=Math.random,onEvent=()=>{}}={}){this.random=random;this.onEvent=onEvent;this.reset()}
 reset(){this.bodies=[];this.drops=[];this.effects=[];this.time=0;this.runTime=0;this.started=false;this.score=0;this.merges=0;this.dropCount=0;this.ml=0;this.mix=[255,188,68];this.nextId=1;this.cooldown=0;this.autoClock=0;this.danger=0;this.ended=false;this.paused=false;this.selection=null;this.charges={boost:1,hammer:1,bomb:1};this.boostLeft=0;this.aim=337;this.current=this.pick();this.next=this.pick();this.events={merge:0,collected:0,hammer:0,bomb:0,boost:0};this.onEvent('reset',{})}
 get level(){return Math.min(12,1+Math.floor((this.merges+this.dropCount/3)/10))}
 get interval(){return Math.max(6,15-(this.level-1)*.65)}
 pick(){const t=this.random();const weights=[.06,.12,.19,.24,.165,.1275,.075,.0225];let tier=0,sum=0;for(let i=0;i<weights.length;i++){sum+=weights[i];if(t<sum){tier=i;break}}const pool=FRUITS.filter(f=>f.tier===tier);return pool[Math.floor(this.random()*pool.length)].id}
 spawn(type,x,y,opts={}){const f=FRUITS[type],r=f.radius,m=r*r*f.density;const b={uid:this.nextId++,type,x:clamp(x,BOUNDS.left+r,BOUNDS.right-r),y,r,m,invM:1/m,I:.5*m*r*r,vx:0,vy:0,angle:(this.random()-.5)*.4,w:0,age:0,lock:.13,squish:0,...opts};this.bodies.push(b);return b}
 drop(x=this.aim){if(this.ended||this.paused||this.cooldown>0||this.selection)return false;this.started=true;const b=this.spawn(this.current,x,BOUNDS.spawnY,{vx:(this.random()-.5)*10,w:(this.random()-.5)*.3});this.current=this.next;this.next=this.pick();this.cooldown=.48;this.autoClock=0;this.dropCount++;this.onEvent('drop',b);return b}
 select(tool){if(this.ended||this.paused)return false;if(tool==='boost'){if(this.charges.boost<=0||this.boostLeft>0)return false;this.charges.boost--;this.boostLeft=3;this.selection=null;this.events.boost++;this.onEvent('boost',{});return true}if(!['hammer','bomb'].includes(tool)||this.charges[tool]<=0)return false;this.selection=this.selection===tool?null:tool;this.onEvent('select',{tool:this.selection});return true}
 useAt(x,y){if(!this.selection||this.ended||this.paused)return false;const tool=this.selection;let targets=[];if(tool==='hammer'){const b=[...this.bodies].reverse().find(b=>Math.hypot(b.x-x,b.y-y)<=b.r+7);if(b)targets=[b]}else targets=this.bodies.filter(b=>Math.hypot(b.x-x,b.y-y)<=105+b.r*.5);if(!targets.length){this.onEvent('miss',{tool});return false}this.charges[tool]--;this.events[tool]++;this.selection=null;const ids=new Set(targets.map(b=>b.uid));this.bodies=this.bodies.filter(b=>!ids.has(b.uid));targets.forEach(b=>this.pulp(b.x,b.y,b.type,Math.round(b.r*.6)));if(tool==='bomb'){this.effects.push({kind:'blast',x,y,age:0});this.bodies.forEach(b=>{let dx=b.x-x,dy=b.y-y,d=Math.max(1,Math.hypot(dx,dy));if(d<260){const impulse=(260-d)*180; b.vx+=dx/d*impulse/b.m;b.vy+=dy/d*impulse/b.m}})}this.danger=Math.max(0,this.danger-.7);this.onEvent(tool,{count:targets.length});return true}
 pulp(x,y,type,volume){const color=rgb(FRUITS[type].juice),n=18;for(let i=0;i<n;i++){const a=this.random()*Math.PI*2,speed=70+this.random()*150;this.drops.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-80,r:2+this.random()*3,color,ml:volume/n,stage:0,age:0})}this.effects.push({kind:'merge',x,y,color:FRUITS[type].juice,age:0})}
 merge(a,b){if(!this.bodies.includes(a)||!this.bodies.includes(b))return;const f=FRUITS[a.type],x=(a.x*a.m+b.x*b.m)/(a.m+b.m),y=(a.y+b.y)/2;this.bodies=this.bodies.filter(q=>q!==a&&q!==b);let newBody=null;if(f.tier<7){newBody=this.spawn(a.type+1,x,y,{vx:(a.vx*a.m+b.vx*b.m)/(a.m+b.m),vy:Math.min(0,(a.vy+b.vy)*.35)-28,w:(a.w+b.w)/2,lock:.24,age:1.2,celebrate:.7});newBody.y=Math.min(newBody.y,BOUNDS.floor-newBody.r)}const boost=this.boostLeft>0?2:1;if(this.boostLeft>0)this.boostLeft--;this.pulp(x,y,a.type,(f.tier===7?350:18+f.tier*9)*boost);this.score+=Math.round(20*Math.pow(1.7,f.tier));this.merges++;this.events.merge++;this.onEvent('merge',{from:f.name,to:newBody?FRUITS[newBody.type].name:'Fresh juice',boost});}
 step(dt){if(this.ended||this.paused)return;dt=clamp(dt,0,1/30);const n=Math.max(1,Math.ceil(dt/(1/120)));for(let i=0;i<n&&!this.ended;i++)this.substep(dt/n)}
 substep(dt){
  this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);if(this.started)this.autoClock+=dt;
  // Tool targeting never disables timed pressure: cancel the aim and drop when due.
  if(this.autoClock>=this.interval){const sel=this.selection;this.selection=null;this.drop();this.selection=sel}
  for(const b of this.bodies){b.age+=dt;b.celebrate=Math.max(0,(b.celebrate||0)-dt);b.lock=Math.max(0,b.lock-dt);b.vy+=900*dt;b.vx*=Math.exp(-.075*dt);b.w*=Math.exp(-.07*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.w*dt;b.squish*=Math.exp(-9*dt)}
  const merges=[];const claimed=new Set();
  for(let k=0;k<6;k++){
   for(const b of this.bodies)this.walls(b);
   for(let i=0;i<this.bodies.length;i++)for(let j=i+1;j<this.bodies.length;j++){
    const a=this.bodies[i],b=this.bodies[j],dx=b.x-a.x,dy=b.y-a.y,rr=a.r+b.r;let d2=dx*dx+dy*dy;if(d2>rr*rr)continue;
    if(k===0&&a.type===b.type&&a.lock===0&&b.lock===0&&!claimed.has(a.uid)&&!claimed.has(b.uid)){merges.push([a,b]);claimed.add(a.uid);claimed.add(b.uid)}
    let d=Math.sqrt(d2),nx=d>1e-6?dx/d:1,ny=d>1e-6?dy/d:0;const inv=a.invM+b.invM,overlap=rr-d,correction=Math.max(0,overlap-.03)*.65/inv;a.x-=nx*correction*a.invM;a.y-=ny*correction*a.invM;b.x+=nx*correction*b.invM;b.y+=ny*correction*b.invM;
    const rvx=b.vx-a.vx,rvy=b.vy-a.vy,vn=rvx*nx+rvy*ny;if(vn<0){const e=vn < -70?.18:0,j=-(1+e)*vn/inv; a.vx-=j*nx*a.invM;a.vy-=j*ny*a.invM;b.vx+=j*nx*b.invM;b.vy+=j*ny*b.invM;
     const tx=-ny,ty=nx,vt=rvx*tx+rvy*ty-b.w*b.r-a.w*a.r,denom=inv+a.r*a.r/a.I+b.r*b.r/b.I,jt=clamp(-vt/denom,-.45*j,.45*j);a.vx-=jt*tx*a.invM;a.vy-=jt*ty*a.invM;b.vx+=jt*tx*b.invM;b.vy+=jt*ty*b.invM;a.w-=a.r*jt/a.I;b.w-=b.r*jt/b.I;
     a.squish=Math.max(a.squish,Math.min(.85,-vn/550));b.squish=Math.max(b.squish,Math.min(.85,-vn/550));
    }
   }
  }
  merges.forEach(pair=>this.merge(...pair));
  // Pair correction can push an edge fruit beyond a wall on the last iteration.
  // Project boundaries once more so even a crowded stack stays in the bucket.
  for(const b of this.bodies)this.walls(b);
  const above=this.bodies.some(b=>b.age>1.8&&b.y-b.r<BOUNDS.line);this.danger=above?this.danger+dt:Math.max(0,this.danger-dt*2);
  if(this.danger>=4){this.ended=true;this.selection=null;this.onEvent('end',{})}
  this.stepJuice(dt);this.effects.forEach(e=>e.age+=dt);this.effects=this.effects.filter(e=>e.age<.65);
 }
 walls(b){
  // The visible V-shaped bowl is also the collision surface: no invisible shelf.
  const slope=(BOUNDS.floor-BOUNDS.floorEdge)/((BOUNDS.right-BOUNDS.left)/2),norm=Math.hypot(1,slope);
  for(const direction of [-1,1]){
   const nx=direction*slope/norm,ny=-1/norm;
   const distance=(BOUNDS.floor-b.y+direction*slope*(b.x-337))/norm;
   if(distance>=b.r)continue;
   const depth=b.r-distance;b.x+=nx*depth;b.y+=ny*depth;
   const vn=b.vx*nx+b.vy*ny;let j=0;
   if(vn<0){j=-(vn < -70?1.16:1)*vn*b.m;b.vx+=j*nx*b.invM;b.vy+=j*ny*b.invM;b.squish=Math.max(b.squish,Math.min(.85,-vn/550))}
   const tx=-ny,ty=nx,vt=b.vx*tx+b.vy*ty-b.w*b.r;
   const jt=clamp(-vt/(b.invM+b.r*b.r/b.I),-.6*j,.6*j);
   b.vx+=jt*tx*b.invM;b.vy+=jt*ty*b.invM;b.w-=b.r*jt/b.I;b.w*=.999;
  }
  for(const side of [-1,1]){const hit=side<0?b.x-b.r<BOUNDS.left:b.x+b.r>BOUNDS.right;if(!hit)continue;b.x=side<0?BOUNDS.left+b.r:BOUNDS.right-b.r;if(b.vx*side>0){const j=Math.abs(b.vx)*b.m*1.12;b.vx=-b.vx*.12;const vt=b.vy+b.w*b.r*side,jt=clamp(-vt/(b.invM+b.r*b.r/b.I),-.4*j,.4*j);b.vy+=jt*b.invM;b.w+=side*b.r*jt/b.I}}
 }
 stepJuice(dt){
  for(const p of this.drops){p.age+=dt;if(p.stage===0){p.vy+=1100*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x<BOUNDS.left+5){p.x=BOUNDS.left+5;p.vx=Math.abs(p.vx)*.4}if(p.x>BOUNDS.right-5){p.x=BOUNDS.right-5;p.vx=-Math.abs(p.vx)*.4}if(p.y>=floorY(p.x)){p.y=floorY(p.x);p.stage=1}}
   else if(p.stage===1){const center=337;const distance=center-p.x;const travel=245*dt;if(Math.abs(distance)<=travel){p.x=center;p.y=666;p.vx=(this.random()-.5)*14;p.vy=95;p.stage=2}else {p.x+=Math.sign(distance)*travel;p.y=floorY(p.x)}}
   else if(p.stage===2){p.vy+=700*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;const surface=805-Math.min(1,(this.ml%500)/500)*86;if(p.y>=surface){const total=this.ml+p.ml;this.mix=this.mix.map((v,i)=>(v*this.ml+p.color[i]*p.ml)/total);this.ml=total;p.stage=3;this.events.collected++;}}
  }this.drops=this.drops.filter(p=>p.stage!==3);
 }
}
function floorY(x){return BOUNDS.floor-(BOUNDS.floor-BOUNDS.floorEdge)*Math.abs(x-337)/((BOUNDS.right-BOUNDS.left)/2)}
root.FruitPhysics={FruitEngine,BOUNDS,clamp,floorY};
})(typeof window==='undefined'?globalThis:window);
