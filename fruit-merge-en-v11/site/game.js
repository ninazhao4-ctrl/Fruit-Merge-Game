(function(){
'use strict';
const {FRUITS,drawFruit,circle,INK}=FruitArt,{FruitEngine,BOUNDS,clamp,floorY}=FruitPhysics;
const $=id=>document.getElementById(id),canvas=$('canvas'),c=canvas.getContext('2d');
let best=0;try{best=Number(localStorage.getItem('fruit-merge-best-v2'))||0}catch(_){}
const {RunStore,formatTime,formatMl,cleanName}=FruitRanking;
let storage;try{storage=localStorage}catch(_){}const rankings=new RunStore(storage);
const audio=new FruitAudio(storage);
let runId='',runSaved=false;
function updateAudioUI(){for(const k of ['music','sound']){const enabled=k==='music'?(audio.music&&audio.ctx?.state==='running'&&!audio.paused):audio.sfx;const button=$(k);if(button._audioEnabled===enabled)continue;button._audioEnabled=enabled;
 // Music uses an action icon: while playing, offer mute; while muted, offer play.
 const showMute=k==='music'?enabled:!enabled;
 button.innerHTML='<svg class="speaker-icon" viewBox="0 0 32 32" aria-hidden="true"><path class="speaker-body" d="M3 12h6l8-7v22l-8-7H3z"/>'+(showMute?'<path class="speaker-detail" d="m22 12 8 8m0-8-8 8"/>':'<path class="speaker-detail" d="M22 12q4 4 0 8M26 7q9 9 0 18"/>')+'</svg>';
 button.setAttribute('aria-label',(k==='music'?'Music':'Sound')+(enabled?' on; click to mute':' off; click to enable'));button.setAttribute('title',(k==='music'?'Music':'Sound')+(enabled?' on · Mute':' off · Enable'));button.setAttribute('aria-pressed',String(enabled))}}
for(const k of ['music','sound'])$(k).onclick=async()=>{if(k==='music'){const playing=audio.music&&audio.ctx?.state==='running'&&!audio.paused;if(playing){audio.toggle('music');updateAudioUI();return}audio.music=true;audio.save();audio.setPaused(document.hidden);const ok=await audio.unlock();if(!ok)message('Audio could not start. Check the browser or device sound settings.');else message('Music on. Click the crossed speaker to mute.')}else{audio.toggle('sfx');await audio.unlock()}updateAudioUI()};
updateAudioUI();
let last=performance.now(),accumulator=0,hover={x:337,y:300},noticeUntil=0,wasPaused=false,touchAim=false;
function newRunId(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
let rankingStamp='';
function renderRankings(force=false){const current=engine.started&&!runSaved?{id:runId,player:cleanName($('playerName').value),score:engine.score,live:true}:null;const top=FruitRanking.topScores(rankings.records,current),stamp=JSON.stringify(top);if(!force&&stamp===rankingStamp)return;rankingStamp=stamp;const frame=$('scoresFrame');if(frame.contentWindow)frame.contentWindow.postMessage({type:'fruit-scores',records:top,persistent:rankings.persistent},'*')}
$('scoresFrame').addEventListener('load',()=>renderRankings(true));
function saveRun(){if(runSaved||!engine.started||!engine.ended||engine.drops.length)return;runSaved=true;rankings.add({id:runId,player:cleanName($('playerName').value),score:engine.score});renderRankings()}

function message(text){$('message').textContent=text;noticeUntil=performance.now()+4000}
const engine=new FruitEngine({onEvent(type,data){
 if(['drop','merge','boost','hammer','bomb','end'].includes(type))audio.effect(type);
 if(type==='merge')message(`${data.from} → ${data.to}${data.boost===2?' · Double juice!':' · Fresh juice'}`);
 if(type==='boost')message('Juice Boost active: double juice for the next 3 merges.');
 if(type==='select')message(data.tool===null?'Tool cancelled.':data.tool==='hammer'?'Tap one fruit to smash. Tap Hammer again to cancel.':'Choose the blast center. Fruit inside the ring will be squeezed.');
 if(type==='miss')message('No fruit there. Your tool was not used. Try another spot.');
 if(type==='hammer'||type==='bomb')message(`Cleared ${data.count} fruit. Juice is flowing into the glass.`);
 if(type==='drop'&&!runId)runId=newRunId()
 if(type==='end'){saveRun();showOverlay(true);}
}});
function roundRect(x,y,w,h,r,fill,stroke=INK,width=2){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}}
function text(str,x,y,size=16,color=INK,align='left',weight=600){c.fillStyle=color;c.font=`${weight} ${size}px "PingFang SC",sans-serif`;c.textAlign=align;c.fillText(str,x,y)}
function path(points,stroke,width,fill=null){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));if(fill){c.closePath();c.fillStyle=fill;c.fill()}c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke()}
function sync(){
 updateAudioUI();renderRankings();
 $('score').textContent=engine.score.toLocaleString();$('merges').textContent=engine.merges;$('juice').textContent=formatMl(engine.ml);
 if(engine.score>best){best=engine.score;try{localStorage.setItem('fruit-merge-best-v2',best)}catch(_){}}$('best').textContent=best.toLocaleString();
 $('runTime').textContent=formatTime(engine.runTime);$('liveRun').textContent=engine.score.toLocaleString();$('playerName').disabled=false;
 for(const name of ['boost','hammer','bomb']){const b=$(name);b.disabled=engine.ended||engine.paused||engine.charges[name]<=0||(name==='boost'&&engine.boostLeft>0);b.setAttribute('aria-pressed',String(name==='boost'?engine.boostLeft>0:engine.selection===name));$(name+'Count').textContent=name==='boost'&&engine.boostLeft?`${engine.boostLeft} left`:(engine.charges[name]?'1 use':'Used');}
 $('pause').textContent=engine.paused?'Continue':'Ⅱ Pause';canvas.style.cursor=engine.selection?'crosshair':'pointer';
 if(performance.now()>noticeUntil&&!engine.paused&&!engine.ended){$('message').textContent=engine.danger>.3?`Danger! Clear the top · ${(4-engine.danger).toFixed(1)}s`:(engine.selection?'Choose a target · Esc cancels':engine.started?'Match fruit. Stay below the line.':'Drop your first fruit to start the timer.')}
}
function draw(){
 c.clearRect(0,0,760,843);const sky=c.createLinearGradient(0,0,0,843);sky.addColorStop(0,'#ffce36');sky.addColorStop(.6,'#ffa129');sky.addColorStop(1,'#ffc414');c.fillStyle=sky;c.fillRect(0,0,760,843);
 // Quiet graph-paper texture helps reveal rotation and movement.
 for(let i=0;i<9;i++){c.save();c.globalAlpha=.09;circle(c,(i*173)%760,(i*137)%843,35+(i%3)*18,'#fff5a0');c.restore()}
 text('FRUIT MERGE GAME',90,32,15,'#783708','left',900);
 roundRect(632,18,104,65,13,'#fff5bf','#e8780a',3);text('NEXT',684,75,13,'#783708','center');drawFruit(c,engine.next,684,44,22);
 text(engine.selection?'Choose your target':'Move to aim · Click to drop',55,47,13,'#87420b');
 // The continuous sloped bowl is both the visible floor and collision boundary.
 path([[82.375,112],[82.375,585],[320,657],[354,657],[592.625,585],[592.625,112]],'#c52522',12);
 path([[91.125,118],[91.125,581],[337,646],[583.75,581],[583.75,118]],'#ff7760',4);
 c.fillStyle='#ffef9420';c.beginPath();c.moveTo(92,151);c.lineTo(582,151);c.lineTo(582,582);c.lineTo(337,647);c.lineTo(92,582);c.closePath();c.fill();
 c.save();c.setLineDash([8,8]);c.strokeStyle=engine.danger>.1?'#df533f':'#ed4931';c.lineWidth=2;c.beginPath();c.moveTo(93,151);c.lineTo(580.25,151);c.stroke();c.restore();
 text(engine.danger>.1?`Danger ${(4-engine.danger).toFixed(1)}s`:'Danger',100.375,141,12,engine.danger>.1?'#ce3e2b':'#ad3d18');
 if(engine.danger>.15){c.fillStyle=`rgba(240,92,56,${.035+.045*(1+Math.sin(engine.time*9))})`;c.fillRect(93,153,487.25,75)}
 // Target guide stops at the stack, rather than passing through the fruit.
 const f=FRUITS[engine.current],aim=clamp(engine.aim,BOUNDS.left+f.radius,BOUNDS.right-f.radius);
 if(!engine.selection&&!engine.ended){let landing=floorY(aim)-f.radius*Math.hypot(1,(BOUNDS.floor-BOUNDS.floorEdge)/((BOUNDS.right-BOUNDS.left)/2));for(const b of engine.bodies){const dx=Math.abs(b.x-aim),sum=b.r+f.radius;if(dx<sum)landing=Math.min(landing,b.y-Math.sqrt(sum*sum-dx*dx))}
  c.save();c.setLineDash([4,8]);c.strokeStyle='#88ac9077';c.lineWidth=2;c.beginPath();c.moveTo(aim,95+Math.min(36,f.radius));c.lineTo(aim,Math.max(125,landing));c.stroke();c.globalAlpha=.15;drawFruit(c,engine.current,aim,landing,f.radius);c.restore();
  c.save();c.globalAlpha=engine.cooldown>0?.35:1;drawFruit(c,engine.current,aim,95,Math.min(36,f.radius),Math.sin(engine.time*1.5)*.045,0,{time:engine.time,gaze:clamp((hover.x-aim)/160,-1,1)});c.restore();
 }
 for(const b of engine.bodies){c.save();c.globalAlpha=.08;ellipseShadow(b);c.restore();drawFruit(c,b.type,b.x,b.y,b.r,b.angle,b.squish,{time:engine.time,expression:b.celebrate>0?'happy':undefined,uid:b.uid,gaze:clamp((engine.aim-b.x)/160,-1,1)})}
 path([[321,652],[321,670],[353,670],[353,652]],INK,3,'#ffc342');roundRect(319,665,36,10,4,'#e97f1b',INK,2);
 // Physical drops move from merge point to gutter, outlet, then glass.
 for(const p of engine.drops){c.save();c.fillStyle=`rgb(${p.color.map(Math.round).join(',')})`;c.strokeStyle='#91552b33';c.lineWidth=.7;c.beginPath();c.ellipse(p.x,p.y,p.r,p.r*(p.stage===2?1.65:1.15),0,0,Math.PI*2);c.fill();c.stroke();c.restore()}
 c.save();c.translate(0,-19);
 const mx=engine.mix.map(Math.round),cupMl=engine.ml%500,fill=clamp(cupMl/500,0,1),surface=824-fill*86;
 // Glass is a clipping mask; liquid keeps a sloshing free surface.
 c.save();c.beginPath();c.moveTo(276,732);c.lineTo(399,732);c.lineTo(387,829);c.quadraticCurveTo(337,841,287,829);c.closePath();c.clip();c.globalAlpha=engine.ml>0?1:0;
 c.fillStyle=`rgb(${mx.join(',')})`;c.beginPath();c.moveTo(274,842);c.lineTo(274,surface);for(let x=274;x<=401;x+=4)c.lineTo(x,surface+Math.sin(x*.055+engine.time*3.2)*Math.min(3.5,engine.drops.length*.1+.6));c.lineTo(401,842);c.closePath();c.fill();
 c.strokeStyle='#fff6d6aa';c.lineWidth=3;c.beginPath();for(let x=275;x<=400;x+=4){const y=surface+Math.sin(x*.055+engine.time*3.2)*Math.min(3.5,engine.drops.length*.1+.6);x===275?c.moveTo(x,y):c.lineTo(x,y)}c.stroke();
 if(engine.ml>1)for(let i=0;i<6;i++){let by=824-((engine.time*17+i*17)%Math.max(2,824-surface));circle(c,301+i*13,by,2.3,'#ffffff40')}
 c.restore();path([[274,730],[286,831],[299,836],[377,836],[389,831],[401,730]],INK,3);c.beginPath();c.ellipse(337.5,731,63.5,7,0,0,Math.PI*2);c.strokeStyle=INK;c.lineWidth=2.5;c.stroke();path([[287,744],[294,812]],'#ffffffbb',5);
 text('Fresh juice',169,740,13,'#85410c');path([[226,746],[253,758],[267,758]],'#ba6819',1.5);text(`${Math.floor(cupMl)} / 500 ml`,458,782,16,'#66300a');text(`${Math.floor(engine.ml/500)} glasses filled`,458,805,12,'#814411');text('100% freshly squeezed',337,859,11,'#814411','center');c.restore();
 for(const e of engine.effects){const t=e.age/.65;c.save();c.globalAlpha=1-t;if(e.kind==='blast'){circle(c,e.x,e.y,105*t,null,'#ed9860',8*(1-t));text('BOOM!',e.x,e.y-20*t,28,INK,'center',900)}else{circle(c,e.x,e.y,20+t*52,null,e.color,5*(1-t));text('+ Juice',e.x,e.y-20-35*t,16,'#4b755a','center',800)}c.restore()}
 if(engine.selection){c.save();c.setLineDash([7,5]);c.strokeStyle='#e2633e';c.lineWidth=3;circle(c,hover.x,hover.y,engine.selection==='bomb'?105:24,'#f1a05720','#e2633e',3);c.restore();text(engine.selection==='bomb'?'Tap to blast':'Tap to smash',clamp(hover.x,100,550),Math.max(185,hover.y-115),14,'#bf5738','center')}
}
function ellipseShadow(b){c.beginPath();c.ellipse(b.x+2,b.y+b.r*.55,b.r*.85,b.r*.3,0,0,Math.PI*2);c.fillStyle=INK;c.fill()}
function point(e){const rect=canvas.getBoundingClientRect();return {x:(e.clientX-rect.left)*760/rect.width,y:(e.clientY-rect.top)*843/rect.height}}
canvas.addEventListener('pointermove',e=>{hover=point(e);engine.aim=clamp(hover.x,BOUNDS.left+17,BOUNDS.right-17)});
function canvasAction(){if(engine.selection)engine.useAt(hover.x,hover.y);else if(hover.x>=BOUNDS.left&&hover.x<=BOUNDS.right&&hover.y<BOUNDS.floor)engine.drop(hover.x);sync()}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;audio.unlock();e.preventDefault();canvas.focus({preventScroll:true});hover=point(e);engine.aim=hover.x;if(e.pointerType==='touch'&&!engine.selection){touchAim=true;canvas.setPointerCapture(e.pointerId)}else canvasAction()});
canvas.addEventListener('pointerup',e=>{if(!touchAim)return;touchAim=false;hover=point(e);engine.aim=hover.x;canvasAction()});
canvas.addEventListener('pointercancel',()=>{touchAim=false});
for(const tool of ['boost','hammer','bomb'])$(tool).addEventListener('click',()=>{audio.unlock();engine.select(tool);sync()});
function showOverlay(ended=false){$('overlay').hidden=false;$('overlayTitle').textContent=ended?'Fresh run, fresh start.':'Paused';$('overlayEyebrow').textContent=ended?'FRESH START, FRESH FRUIT':'TAKE A LITTLE BREAK';$('overlayText').textContent=ended?(engine.drops.length?'Collecting your last drops…':`You squeezed ${formatMl(engine.ml)} ml in ${formatTime(engine.runTime)}. Score: ${engine.score.toLocaleString()} points.`):'Your fruit can wait. The timer is paused.';$('resume').hidden=ended;$('overlayRestart').textContent=ended?'Play again ↻':'Restart';(ended?$('overlayRestart'):$('resume')).focus()}
function pause(){if(engine.ended)return;engine.paused=!engine.paused;audio.setPaused(engine.paused);if(!engine.paused)audio.unlock();last=performance.now();accumulator=0;if(engine.paused)showOverlay();else {$('overlay').hidden=true;canvas.focus({preventScroll:true})}sync()}
function restart(){if(engine.ended&&!runSaved){for(let i=0;i<2400&&engine.drops.length;i++)engine.stepJuice(1/120);saveRun()}engine.reset();audio.setPaused(false);runId='';runSaved=false;touchAim=false;$('overlay').hidden=true;last=performance.now();accumulator=0;message('Drop your first fruit to start the timer.');sync();canvas.focus({preventScroll:true})}
function openGuide(){wasPaused=engine.paused;engine.paused=true;audio.setPaused(true);$('guide').showModal();sync()}
$('pause').onclick=pause;$('resume').onclick=pause;$('restart').onclick=restart;$('overlayRestart').onclick=restart;$('guideButton').onclick=openGuide;$('closeGuide').onclick=()=>$('guide').close();$('guide').addEventListener('close',()=>{engine.paused=wasPaused;audio.setPaused(wasPaused);last=performance.now();sync()});
document.addEventListener('visibilitychange',()=>{audio.setPaused(document.hidden||engine.paused);if(document.hidden&&!engine.paused&&!engine.ended)pause();last=performance.now();accumulator=0});
document.addEventListener('keydown',e=>{if($('guide').open||$('shareDialog').open||$('settingsDialog').open)return;if(e.key==='Escape'){if(stage.classList.contains('expanded-game')){stage.classList.remove('expanded-game');document.body.style.overflow='';fullscreenState()}engine.selection=null;message('Tool cancelled.');sync();return}if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;if(e.target.tagName==='BUTTON'&&(e.code==='Space'||e.code==='Enter'))return;if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.key==='ArrowLeft')engine.aim=clamp(engine.aim-18,BOUNDS.left+17,BOUNDS.right-17);if(e.key==='ArrowRight')engine.aim=clamp(engine.aim+18,BOUNDS.left+17,BOUNDS.right-17);if(e.code==='Space'){audio.unlock();engine.drop();}if(e.key==='1')engine.select('boost');if(e.key==='2')engine.select('hammer');if(e.key==='3')engine.select('bomb');if(e.key.toLowerCase()==='p')pause();sync()});
function renderGuide(){ $('fruitGuide').replaceChildren();for(let family=0;family<4;family++){const row=document.createElement('div');row.className='fruit-route';row.setAttribute('style','--route-count:'+FRUITS.filter(f=>f.family===family).length);for(const f of FRUITS.filter(f=>f.family===family)){const cell=document.createElement('div');cell.className='fruit-cell';const icon=document.createElement('canvas');icon.width=140;icon.height=140;icon.setAttribute('role','img');icon.setAttribute('aria-label',f.name);drawFruit(icon.getContext('2d'),f.id,70,70,Math.min(61,18+f.tier*6));cell.append(icon);const label=document.createElement('span');label.textContent=f.name;cell.append(label);const sub=document.createElement('small');sub.textContent=f.tier===7?'Squeezed into juice':`Lv.${f.routeIndex+1} →`;cell.append(sub);row.append(cell)}$('fruitGuide').append(row)}}
renderGuide();
FruitArt.ready.then(renderGuide);
function frame(now){const activeDelta=Math.max(0,(now-last)/1000);const elapsed=Math.min(activeDelta,.1);last=now;if(!engine.paused&&!engine.ended){if(engine.started)engine.runTime+=activeDelta;accumulator+=elapsed;while(accumulator>=1/120){engine.step(1/120);accumulator-=1/120}}else {accumulator=0;if(engine.ended&&!runSaved){for(let i=0;i<Math.ceil(elapsed*120);i++)engine.stepJuice(1/120);if(!engine.drops.length){saveRun();showOverlay(true)}}}draw();sync();requestAnimationFrame(frame)}
const sharing=new FruitShare({document,art:FruitArt,audio,getRun:()=>({player:cleanName($('playerName').value),score:engine.score}),onOpen:()=>{const previous=engine.paused;engine.paused=true;audio.setPaused(true);return ()=>{engine.paused=previous;audio.setPaused(previous);last=performance.now();accumulator=0}}});
let settingsWasPaused=false,settingsActive=false;
function restoreSettings(){if(!settingsActive)return;settingsActive=false;engine.paused=settingsWasPaused;audio.setPaused(settingsWasPaused);last=performance.now();accumulator=0;sync()}
function closeSettings(){restoreSettings();$('settingsDialog').close()}
$('settingsButton').onclick=()=>{settingsWasPaused=engine.paused;settingsActive=true;engine.paused=true;audio.setPaused(true);$('settingsDialog').showModal();sync()};
$('closeSettings').onclick=closeSettings;$('settingsDialog').addEventListener('close',restoreSettings);
for(const id of ['guideButton','pause','restart']){const action=$(id).onclick;$(id).onclick=()=>{if(settingsActive)closeSettings();action()}}
const stage=$('gameShell');
function fullscreenState(){const active=!!document.fullscreenElement||stage.classList.contains('expanded-game');const button=$('fullscreen');button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');button.setAttribute('title',active?'Exit fullscreen':'Enter fullscreen');button.innerHTML='<svg class="action-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="'+(active?'M4 11h7V4m17 7h-7V4M4 21h7v7m17-7h-7v7':'M11 4H4v7m17-7h7v7M4 21v7h7m17-7v7h-7')+'"/></svg>'}
$('fullscreen').onclick=()=>{const active=stage.classList.contains('expanded-game');stage.classList.toggle('expanded-game');document.body.style.overflow=active?'':'hidden';fullscreenState()};
document.addEventListener('fullscreenchange',fullscreenState);fullscreenState();
$('scoresFrame').setAttribute('src',$('scoresFrame').dataset.src);renderRankings(true);sync();requestAnimationFrame(frame);
if(window.addEventListener)window.addEventListener('storage',e=>{if(e.key===FruitRanking.KEY){rankings.load();renderRankings(true)}});
// Debug access is opt-in and omitted in normal play. It uses the real engine and handlers.
if(new URLSearchParams(location.search).has('test'))window.fruitTest={engine,draw,sync,restart,FRUITS,rankings,saveRun,audio};
})();
