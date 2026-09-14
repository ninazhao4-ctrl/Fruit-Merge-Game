const fs=require('fs'),vm=require('vm'),path=require('path');const {createCanvas,loadImage}=require('/Users/zhaodehua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');const p=path.resolve(__dirname,'..');
(async()=>{const a=vm.createContext({Math,console});vm.runInContext(fs.readFileSync(p+'/fruits.js','utf8'),a);const prepared=a.FruitArt.prepareAtlas(await loadImage(p+'/assets/fruit-bodies.png'),createCanvas);const art=fs.readFileSync(p+'/fruits.js','utf8').replace("let atlas=null,atlasBoxes=[],ready=Promise.resolve(false);","let atlas=globalThis.injectAtlas,atlasBoxes=globalThis.injectBoxes,ready=Promise.resolve(true);");
 // Inject tested pixels into the VM harness without a browser or simulated screenshots.
 const src={};for(const n of ['fruits.js','engine.js','leaderboard.js','audio.js','share.js','game.js'])src[n]=fs.readFileSync(p+'/'+n,'utf8');
 // The harness options seed the real canvas atlas using a one-time preparation callback.
 src['fruits.js']=art.replace('globalThis.injectAtlas','document.getElementById("canvas").getContext("2d").canvas.__atlas').replace('globalThis.injectBoxes','document.getElementById("canvas").getContext("2d").canvas.__boxes');
 const h=require('./ui.test.cjs')(src,{inspect:true,createCanvas:(w,h)=>{const out=createCanvas(w,h);out.__atlas=prepared.image;out.__boxes=prepared.boxes;return out}});
 const e=h.e;let seed=839;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};e.random=rnd;
 for(let i=0;i<24;i++){e.spawn(e.pick(),120+rnd()*420,230,{vx:(rnd()-.5)*30});for(let k=0;k<85;k++)e.step(1/120)}
 h.api.draw();fs.writeFileSync(p+'/tests/game-canvas.png',h.elements.canvas.realCanvas.toBuffer('image/png'));console.log('Game canvas rendered with '+e.bodies.length+' real simulated bodies.');
})();
