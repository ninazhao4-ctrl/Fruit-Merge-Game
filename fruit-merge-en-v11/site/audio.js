/* Original Web Audio composition. No recording, remote audio or third-party music. */
(function(root){
'use strict';
class FruitAudio{
 constructor(storage){this.storage=storage;this.ctx=null;this.timer=null;this.step=0;this.next=0;this.paused=false;this.music=false;this.sfx=true;try{const p=JSON.parse(storage.getItem('fruit-audio-v1')||'{}');this.music=p.music===true;this.sfx=p.sfx!==false}catch(_){} }
 save(){try{this.storage.setItem('fruit-audio-v1',JSON.stringify({music:this.music,sfx:this.sfx}))}catch(_){} }
 async unlock(){try{const C=root.AudioContext||root.webkitAudioContext;if(!C)return false;if(!this.ctx||this.ctx.state==='closed'){if(this.timer){root.clearInterval(this.timer);this.timer=null}this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=.55;this.master.connect(this.ctx.destination);this.musicBus=this.ctx.createGain();this.musicBus.connect(this.master);this.fxBus=this.ctx.createGain();this.fxBus.connect(this.master)}if(this.ctx.state!=='running')await this.ctx.resume();this.update();return this.ctx.state==='running'}catch(_){return false}}
 update(){if(!this.ctx)return;this.musicBus.gain.setValueAtTime(this.music&&!this.paused?1:0,this.ctx.currentTime);this.fxBus.gain.setValueAtTime(this.sfx&&!this.paused?1:0,this.ctx.currentTime);if(this.music&&!this.paused&&this.ctx.state==='running'){if(!this.timer){this.next=this.ctx.currentTime+.06;this.timer=root.setInterval(()=>this.schedule(),100);this.schedule()}}else if(this.timer){root.clearInterval(this.timer);this.timer=null}}
 toggle(kind){this[kind]=!this[kind];this.save();this.update();return this[kind]}
 setPaused(value){this.paused=value;this.update()}
 note(midi,time,duration,volume=.1,type='sine',bus=this.musicBus){if(!this.ctx)return;const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(440*Math.pow(2,(midi-69)/12),time);gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.012);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(gain);gain.connect(bus);osc.start(time);osc.stop(time+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect()}}
 schedule(){if(!this.ctx||this.paused||!this.music)return;const now=this.ctx.currentTime;if(this.next<now)this.next=now+.03;const tune=[72,76,79,76,74,77,81,77,71,74,79,74,72,76,79,84,79,76,74,72,77,81,79,77,74,79,77,74,76,72,67,72];while(this.next<now+.22){const s=this.step%32,t=this.next;this.note(tune[s],t,.24,.085,'sine');if(s%2===0)this.note([48,53,55,48][Math.floor(s/8)],t,.43,.07,'triangle');if(s%4===0)this.note(tune[s]-12,t,.42,.03,'sine');this.step++;this.next+=.25}}
 effect(name){if(!this.ctx||!this.sfx||this.paused)return;const t=this.ctx.currentTime;const notes={drop:[60],merge:[72,76,79],boost:[76,79,84,88],hammer:[46,34],bomb:[36,29,24],end:[72,67,64,60]}[name];if(!notes)return;notes.forEach((n,i)=>this.note(n,t+i*.055,name==='bomb'?.3:.17,name==='bomb'?.17:.12,name==='hammer'?'triangle':'sine',this.fxBus))}
}
root.FruitAudio=FruitAudio;
})(typeof window==='undefined'?globalThis:window);
