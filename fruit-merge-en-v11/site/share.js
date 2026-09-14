/* Share images stay on the device. Social links open only after an explicit click. */
(function(root){
'use strict';
const URL_HOME='https://fruitmergegame.net/';
function socialLinks(score){const text=`I scored ${Math.max(0,Math.floor(score)).toLocaleString('en-US')} points in Fruit Merge Game! Can you beat my score?`;return {text,url:URL_HOME,x:'https://twitter.com/intent/tweet?text='+encodeURIComponent(text)+'&url='+encodeURIComponent(URL_HOME),facebook:'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(URL_HOME),whatsapp:'https://wa.me/?text='+encodeURIComponent(text+' '+URL_HOME)}}
function loadImage(src){return new Promise((resolve,reject)=>{const i=new root.Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Image could not load'));i.src=src})}
function drawCard(c,bg,qr,run){
 c.clearRect(0,0,1200,1200);c.drawImage(bg,0,0,1200,1200);
 const label=(value,x,y,size,color,max)=>{c.fillStyle=color;c.font=`900 ${size}px "Trebuchet MS", Arial, sans-serif`;c.textAlign='center';c.fillText(value,x,y,max)};
 // Aligned with the reusable poster's blank fields. Data is text, never HTML.
 label(run.player,585,585,47,'#542006',380);label('SCORE',600,657,42,'#087729',450);label(Math.max(0,Math.floor(run.score)).toLocaleString('en-US'),600,784,108,'#a94a00',505);
 label('Can your friends beat this?',610,880,31,'#ffffff',495);
 c.fillStyle='#fff';c.fillRect(44,922,194,194);c.imageSmoothingEnabled=false;c.drawImage(qr,48,926,186,186);c.imageSmoothingEnabled=true;
}
class FruitShare{
 constructor({document:d,art,audio,getRun,onOpen}){
  this.d=d;this.getRun=getRun;this.onOpen=onOpen;this.blob=null;this.objectURL=null;this.restore=null;this.generation=0;this.assets=null;const $=id=>d.getElementById(id);this.$=$;
  $('shareButton').onclick=()=>this.open();$('overlayShare').onclick=()=>this.open();$('closeShare').onclick=()=>$('shareDialog').close();$('shareDialog').addEventListener('close',()=>{this.restore?.();this.restore=null});
  $('copyLink').onclick=async()=>{try{await root.navigator.clipboard.writeText(URL_HOME);this.status('Link copied.')}catch(_){$('shareURL').focus();$('shareURL').select();this.status('Select and copy the link above.')}};

 }
 status(value){this.$('shareStatus').textContent=value}
 async open(){const $=this.$;if(!$('shareDialog').open){this.restore=this.onOpen();$('shareDialog').showModal()}this.snapshot={...this.getRun()};const version=++this.generation;this.blob=null;$('shareImage').hidden=true;this.status('Creating your share image…');$('shareURL').value=URL_HOME;const links=socialLinks(this.snapshot.score);for(const name of ['x','facebook','whatsapp'])$('share-'+name).href=links[name];
  try{if(!this.assets)this.assets=Promise.all([loadImage('assets/share-template.png'),loadImage('assets/qr.png')]).catch(e=>{this.assets=null;throw e});const [bg,qr]=await this.assets;if(version!==this.generation)return;const canvas=$('shareCanvas');drawCard(canvas.getContext('2d'),bg,qr,this.snapshot);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(version!==this.generation)return;if(!blob)throw Error('No image');if(this.objectURL)URL.revokeObjectURL(this.objectURL);this.blob=blob;this.objectURL=URL.createObjectURL(blob);$('shareImage').src=this.objectURL;$('shareImage').hidden=false;this.status('')}catch(_){this.status('Image unavailable. You can still copy or share the game link.')}
 }
}
root.FruitShare=FruitShare;root.FruitShareCard={drawCard,socialLinks,URL_HOME};
})(typeof window==='undefined'?globalThis:window);
