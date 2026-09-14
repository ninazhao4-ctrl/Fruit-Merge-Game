const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),source={};for(const n of ['fruits.js','engine.js','leaderboard.js','audio.js','share.js','game.js'])source[n]=fs.readFileSync(path.join(root,n),'utf8');
const context=vm.createContext({Math,console});for(const n of ['fruits.js','engine.js','leaderboard.js'])vm.runInContext(source[n],context,{filename:n});for(const n of ['engine.test.js','ranking.test.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,n),'utf8'),context,{filename:n});
const ui=require('./ui.test.cjs')(source),results=[...context.engineTestResults,...context.rankingTestResults,...ui.results];
for(const r of results)console.log(`${r.passed?'PASS':'FAIL'} ${r.name}${r.error?' — '+r.error:''}`);
console.log(`${results.filter(r=>r.passed).length}/${results.length} passed`);fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(results,null,2));if(results.some(r=>!r.passed))process.exitCode=1;
