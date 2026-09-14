/* Original procedural fruit artwork. No downloaded images, fonts, or libraries. */
(function(root){
'use strict';
const sizes=[17,23,28,32,51*2/3,64*2/3,78*2/3,93*2/3];
const rows=[
 [null,null,null,['Peach','peach','#ee778a','#ffd39d'],['Apple','apple','#e64f43','#fff0b0'],['Pomegranate','pomegranate','#d73d55','#ff8b9e'],['Dragon Fruit','dragon','#ee388c','#fff7e5'],['Watermelon','watermelon','#278660','#ff5669']],
 [['Kumquat','citrus','#f89025','#ffd559'],['Apricot','stone','#ed993b','#ffd08a'],['Lemon','citrus','#e5b527','#fff07d'],null,['Mango','mango','#f39b26','#ffcf41'],['Papaya','papaya','#f4a936','#ff9750'],['Pineapple','pineapple','#b99c25','#ffe15b'],['Cantaloupe','melon','#7eae5a','#ffa958']],
 [null,['Lime','citrus','#4caa57','#c8ed78'],['Kiwi','kiwi','#9a783f','#a6d849'],null,null,['Avocado','avocado','#487b46','#cae780'],['Pomelo','citrus','#e4be4b','#ffd3a1'],['Jackfruit','jackfruit','#64823a','#f9d150']],
 [['Blueberry','blueberry','#5f58a0','#b5a1dc'],['Mangosteen','mangosteen','#672a66','#fffbeb'],['Plum','stone','#755084','#ffc570'],['Fig','fig','#715198','#ed8c91'],['Passion Fruit','passion','#8e4575','#ffe565'],['Blood Orange','citrus','#e56836','#dd4759'],['Coconut','coconut','#8b5e3c','#fffcf0'],['Star Apple','star','#765089','#e9d4f1']]
];
const FRUITS=rows.flatMap((row,family)=>row.map((v,tier)=>v&&({id:family*8+tier,family,tier,name:v[0],kind:v[1],rind:v[2],flesh:v[3],radius:sizes[tier],density:0.85+tier*.09,juice:v[3]}))).filter(Boolean).filter(f=>!["Cranberry", "Cherry", "Strawberry", "Banana", "Gooseberry", "Pear", "Guava"].includes(f.name)).map((f,id)=>({...f,id}));
for(const family of [0,1,2,3])FRUITS.filter(f=>f.family===family).forEach((f,i)=>f.routeIndex=i);
const INK='#29363a',TAU=Math.PI*2;
function circle(c,x,y,r,fill,stroke=null,w=1){c.beginPath();c.arc(x,y,r,0,TAU);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke()}}
function ellipse(c,x,y,rx,ry,a,fill){c.beginPath();c.ellipse(x,y,rx,ry,a,0,TAU);c.fillStyle=fill;c.fill()}
function seed(c,x,y,a,size=0.055,color=INK){ellipse(c,x,y,size*.58,size,a,color)}
function petals(c,n,dist,rx,ry,color,offset=0){for(let i=0;i<n;i++){const a=i*TAU/n+offset;c.save();c.translate(Math.cos(a)*dist,Math.sin(a)*dist);c.rotate(a);ellipse(c,0,0,rx,ry,0,color);c.restore()}}
const atlasNames=['Peach','Apple','Pomegranate','Dragon Fruit','Watermelon','Kumquat','Apricot','Lemon','Mango','Papaya','Pineapple','Cantaloupe','Lime','Kiwi','Avocado','Pomelo','Jackfruit','Blueberry','Mangosteen','Plum','Fig','Passion Fruit','Blood Orange','Coconut','Star Apple'];
// Convert the generator's neutral preview backdrop into a runtime sprite mask.
// Only background-connected neutral pixels are cleared; white fruit flesh is preserved.
function prepareAtlas(img,makeCanvas){
 const out=makeCanvas(img.naturalWidth||img.width,img.naturalHeight||img.height),c=out.getContext('2d');c.drawImage(img,0,0);const w=out.width,h=out.height,pixels=c.getImageData(0,0,w,h),d=pixels.data,N=w*h,seen=new Uint8Array(N),queue=new Int32Array(N);let head=0,tail=0;
 const neutral=i=>{const k=i*4;return d[k+3]===0||(Math.min(d[k],d[k+1],d[k+2])>135&&Math.max(d[k],d[k+1],d[k+2])-Math.min(d[k],d[k+1],d[k+2])<38)};
 const push=i=>{if(i>=0&&i<N&&!seen[i]&&neutral(i)){seen[i]=1;queue[tail++]=i}};
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
 while(head<tail){const i=queue[head++],x=i%w;d[i*4+3]=0;if(x)push(i-1);if(x<w-1)push(i+1);push(i-w);push(i+w)}
 // Determine real sprite bounds, since generated atlas spacing can vary slightly.
 const boxes=[];for(let start=0;start<N;start++){if(seen[start]||!d[start*4+3])continue;head=0;tail=1;queue[0]=start;seen[start]=1;let minX=w,minY=h,maxX=0,maxY=0;while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(const j of [x?i-1:-1,x<w-1?i+1:-1,i-w,i+w])if(j>=0&&j<N&&!seen[j]&&d[j*4+3]){seen[j]=1;queue[tail++]=j}}if(tail>500)boxes.push({x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1})}
 if(boxes.length!==25)throw Error('Expected 25 fruit bodies, found '+boxes.length);boxes.sort((a,b)=>(a.y+a.h/2)-(b.y+b.h/2));const ordered=[];for(let i=0;i<25;i+=5)ordered.push(...boxes.slice(i,i+5).sort((a,b)=>a.x-b.x));c.putImageData(pixels,0,0);return {image:out,boxes:ordered};
}
let atlas=null,atlasBoxes=[],ready=Promise.resolve(false);
if(typeof root.Image==='function'){const img=new root.Image();ready=new Promise(resolve=>{img.onload=()=>{try{const result=prepareAtlas(img,(w,h)=>{const canvas=root.document.createElement('canvas');canvas.width=w;canvas.height=h;return canvas});atlas=result.image;atlasBoxes=result.boxes;resolve(true)}catch(e){console.warn('Fruit artwork loading failed',e);resolve(false)}};img.onerror=()=>resolve(false)});img.src='assets/fruit-bodies.png'}
function faceState(id,t=0,impact=0,uid=0){const name=FRUITS[id].name,base=['Apple','Pomegranate','Coconut'].includes(name)?'grumpy':['Lemon','Blueberry','Plum'].includes(name)?'teary':'happy';const phase=(t+id*.37+uid*.19)%4.7;return impact>.22?'bump':phase<.13?'blink':base}
function drawFace(c,f,t,state,gaze){
 c.save();c.translate(0,.18);c.lineCap='round';c.lineJoin='round';const ink='#291506';const ex=.28,ey=-.05;
 ellipse(c,-.44,.14,.12,.067,0,'#ff8a9b');ellipse(c,.44,.14,.12,.067,0,'#ff8a9b');
 for(const side of [-1,1]){const x=side*ex+gaze*.045;
  if(state==='blink'){c.beginPath();c.moveTo(x-.09,ey+.02);c.quadraticCurveTo(x,ey-.1,x+.09,ey+.02);c.strokeStyle=ink;c.lineWidth=.05;c.stroke()}
  else {ellipse(c,x,ey,.105,state==='bump'?.145:.125,0,ink);circle(c,x-.025+gaze*.03,ey-.041,.038,'#fff');circle(c,x+.035,ey+.037,.018,'#ffffffa0');
   if(state==='grumpy'){c.beginPath();c.moveTo(x-side*.11,ey-.13);c.lineTo(x+side*.10,ey-.21);c.strokeStyle=ink;c.lineWidth=.05;c.stroke()}
   if(state==='teary'){c.beginPath();c.moveTo(x-side*.10,ey-.2);c.quadraticCurveTo(x,ey-.29,x+side*.09,ey-.20);c.strokeStyle=ink;c.lineWidth=.035;c.stroke();const tear=.16+((t*1.3+side*.2)%1)*.13;ellipse(c,x,tear,.06,.09,0,'#70d9ff');circle(c,x-.02,tear-.025,.02,'#e8fbff')}
  }
 }
 c.strokeStyle=ink;c.lineWidth=.04;c.beginPath();
 if(state==='bump'){ellipse(c,0,.23,.07,.095,0,ink)}
 else if(state==='grumpy'){c.moveTo(-.07,.24);c.quadraticCurveTo(0,.16,.07,.24);c.stroke()}
 else if(state==='teary'){c.moveTo(-.08,.25);c.quadraticCurveTo(-.04,.12,0,.23);c.quadraticCurveTo(.04,.13,.08,.25);c.stroke()}
 else {c.moveTo(-.10,.18);c.bezierCurveTo(-.10,.34,.10,.34,.10,.18);c.stroke()}
 c.restore();
}
function drawFruit(c,id,x,y,r,angle=0,squish=0,visual={}){
 const f=FRUITS[id];c.save();c.translate(x,y);c.rotate(angle);c.scale(r*(1+squish*.11),r*(1-squish*.1));
 if(atlas){const box=atlasBoxes[atlasNames.indexOf(f.name)],scale=1.94/Math.max(box.w,box.h);c.drawImage(atlas,box.x,box.y,box.w,box.h,-box.w*scale/2,-box.h*scale/2,box.w*scale,box.h*scale)}
 else {circle(c,0,0,.94,f.rind,'#47230e',.075);ellipse(c,-.35,-.43,.16,.08,-.7,'#ffffff80');if(['Watermelon','Cantaloupe'].includes(f.name)){for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(i*.22,-.75);c.quadraticCurveTo(i*.36,0,i*.22,.75);c.strokeStyle=f.name==='Watermelon'?'#78be28':'#f9e1a0';c.lineWidth=.075;c.stroke()}}ellipse(c,.2,-.8,.27,.12,-.4,'#61bc29')}
 drawFace(c,f,visual.time||0,visual.expression||faceState(id,visual.time||0,squish,visual.uid||0),visual.gaze||0);c.restore();
}
root.FruitArt={FRUITS,drawFruit,circle,INK:'#542809',ready,faceState,prepareAtlas};
})(typeof window==='undefined'?globalThis:window);
