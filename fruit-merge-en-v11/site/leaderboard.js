/* Independent local ranking store. No article copy or fictional entries. */
(function(root){
'use strict';
const KEY='fruit-merge-score-records-v1',PLAYER_NAME_KEY='fruit-merge-player-name-v1',PLAYER_CODE_KEY='fruit-merge-player-code-v1';
function formatTime(seconds){seconds=Math.max(0,Math.floor(Number(seconds)||0));const h=Math.floor(seconds/3600),m=Math.floor(seconds/60)%60,s=seconds%60;return (h?h+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function sanitizeName(value){return String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,20)}
function cleanName(value,fallback='You'){return sanitizeName(value)||fallback}
function legacyDefaultName(value){const name=sanitizeName(value);return !name||name==='You'}
function randomPlayerCode(){return 'Player-'+String(Math.floor(Math.random()*10000)).padStart(4,'0')}
function readStored(storage,key){try{return storage?storage.getItem(key):null}catch(_){return null}}
function writeStored(storage,key,value){try{if(storage)storage.setItem(key,value)}catch(_){}}
function loadPlayerIdentity(storage){const saved=readStored(storage,PLAYER_NAME_KEY);if(legacyDefaultName(saved)){const previous=sanitizeName(readStored(storage,PLAYER_CODE_KEY));let code=randomPlayerCode(),guard=0;while(code===previous&&guard++<8)code=randomPlayerCode();writeStored(storage,PLAYER_CODE_KEY,code);writeStored(storage,PLAYER_NAME_KEY,code);return {name:code,code}}const name=sanitizeName(saved);let code=sanitizeName(readStored(storage,PLAYER_CODE_KEY));if(!/^Player-\d{4}$/.test(code)){code=/^Player-\d{4}$/.test(name)?name:randomPlayerCode();writeStored(storage,PLAYER_CODE_KEY,code)}return {name,code}}
function rememberPlayerName(storage,value){const name=sanitizeName(value);if(!name||name==='You')return null;if(sanitizeName(readStored(storage,PLAYER_NAME_KEY))!==name)writeStored(storage,PLAYER_NAME_KEY,name);return name}
function nameKey(name){return cleanName(name).normalize('NFKC').toLocaleLowerCase('en-US')}
function topScores(records,current=null){const byName=new Map();for(const r of [...records,...(current?[current]:[])]){const key=nameKey(r.player),old=byName.get(key);if(!old||r.score>old.score||(r.score===old.score&&r.live))byName.set(key,{...r,player:cleanName(r.player)})}return [...byName.values()].sort((a,b)=>b.score-a.score||nameKey(a.player).localeCompare(nameKey(b.player))).slice(0,15)}
class RunStore{
 constructor(storage){this.storage=storage;this.persistent=true;this.records=[];this.load()}
 load(){try{const raw=JSON.parse(this.storage.getItem(KEY)||'[]');if(!Array.isArray(raw))return;const seen=new Set();this.records=raw.filter(r=>r&&typeof r.id==='string'&&!seen.has(r.id)&&seen.add(r.id)&&Number.isFinite(r.score)&&r.score>=0&&r.score<1e9).map(r=>({id:r.id,player:cleanName(r.player),score:Math.floor(r.score+1e-7),date:typeof r.date==='string'?r.date:''}));this.sort()}catch(_){this.persistent=false}}
 sort(){this.records=topScores(this.records)}
 add({id,player,score,date=new Date().toISOString()}){if(typeof id!=='string'||this.records.some(r=>r.id===id)||!Number.isFinite(score)||score<0||score>=1e9)return false;const previous=this.records.find(r=>nameKey(r.player)===nameKey(player));if(previous&&previous.score>=Math.floor(score+1e-7))return false;this.records.push({id,player:cleanName(player),score:Math.floor(score+1e-7),date});this.sort();try{this.storage.setItem(KEY,JSON.stringify(this.records))}catch(_){this.persistent=false}return true}
}
function formatMl(ml){return Math.floor(Math.max(0,ml)+1e-7).toLocaleString('en-US')}
root.FruitRanking={RunStore,formatTime,formatMl,cleanName,KEY,nameKey,topScores,PLAYER_NAME_KEY,PLAYER_CODE_KEY,loadPlayerIdentity,rememberPlayerName,legacyDefaultName};
})(typeof window==='undefined'?globalThis:window);
