const fs=require('fs'),vm=require('vm'),path=require('path');
const {createCanvas,loadImage}=require('/Users/zhaodehua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const p=path.resolve(__dirname,'..');
(async()=>{
 const artContext=vm.createContext({console,Math});vm.runInContext(fs.readFileSync(p+'/fruits.js','utf8'),artContext);
 const input=await loadImage(p+'/assets/fruit-bodies.png');const prepared=artContext.FruitArt.prepareAtlas(input,createCanvas);
 console.log('Sprite bodies extracted:',prepared.boxes.length);
 // Run the real artwork module with a real Canvas implementation.
 const win={document:{createElement:()=>createCanvas(10,10)},console,Math};let resolveImage;class Img{set src(s){loadImage(p+'/assets/fruit-bodies.png').then(img=>{Object.assign(this,{_img:img,naturalWidth:img.width,naturalHeight:img.height});this.onload?.()})}}
 // Draw the processed atlas through the real renderer using an injected image promise.
 let code=fs.readFileSync(p+'/fruits.js','utf8').replace("let atlas=null,atlasBoxes=[],ready=Promise.resolve(false);","let atlas=TEST_ATLAS,atlasBoxes=TEST_BOXES,ready=Promise.resolve(true);");
 const ctx=vm.createContext({console,Math,TEST_ATLAS:prepared.image,TEST_BOXES:prepared.boxes});vm.runInContext(code,ctx);vm.runInContext(fs.readFileSync(p+'/engine.js','utf8'),ctx);
 const canvas=createCanvas(1000,1100),c=canvas.getContext('2d');c.fillStyle='#ffbf29';c.fillRect(0,0,1000,1100);const {FRUITS,drawFruit}=ctx.FruitArt;
 FRUITS.forEach((f,i)=>{const x=100+(i%5)*200,y=100+Math.floor(i/5)*200;drawFruit(c,f.id,x,y,78,0,0,{time:2,uid:i,gaze:.6});c.fillStyle='#63300c';c.font='18px sans-serif';c.textAlign='center';c.fillText(f.name,x,y+95)});fs.writeFileSync(p+'/tests/fruits-render.png',canvas.toBuffer('image/png'));
 const share=vm.createContext({console,Math});vm.runInContext(fs.readFileSync(p+'/share.js','utf8'),share);const sc=createCanvas(1200,1200);share.FruitShareCard.drawCard(sc.getContext('2d'),await loadImage(p+'/assets/share-template.png'),await loadImage(p+'/assets/qr.png'),{player:'Alex',score:18420});fs.writeFileSync(p+'/tests/share-render.png',sc.toBuffer('image/png'));
 const og=createCanvas(1200,1200);share.FruitShareCard.drawCard(og.getContext('2d'),await loadImage(p+'/assets/share-template.png'),await loadImage(p+'/assets/qr.png'),{player:'PLAY FREE',score:0});fs.writeFileSync(p+'/assets/share.png',og.toBuffer('image/png'));
 console.log('Rendered real fruit renderer and share card.');
})();
