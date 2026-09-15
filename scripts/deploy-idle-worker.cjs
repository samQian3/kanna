const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync, spawn} = require('node:child_process');
const WebSocket = require('ws');
const root = process.env.KANNA_RELEASE_DIR;
if (!root) throw Error('Use scripts/deploy-local.cjs to stage a release first');
const appHome = path.join(require('node:os').homedir(), 'Library/Application Support/Kanna');
const installed = path.join(appHome, 'node_modules/kanna-code');
const base = 'http://127.0.0.1:3210';
const statusPath = path.join(root, 'status.json');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function status(state, extra = {}) {fs.writeFileSync(statusPath, JSON.stringify({state, at: new Date().toISOString(), ...extra}, null, 2));}
async function inspectIdle() {
  const r = await fetch(base+'/auth/login', {method:'POST', headers:{'Content-Type':'application/json',Origin:base}, body:JSON.stringify({password:fs.readFileSync(path.join(appHome,'password.txt'),'utf8').trim()}), signal:AbortSignal.timeout(10000)});
  if (!r.ok) throw Error('Login '+r.status);
  const cookie = r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
  const ws = new WebSocket('ws://127.0.0.1:3210/ws',{headers:{Cookie:cookie,Origin:base}});
  const pending = new Map(); let seq=0;
  ws.on('message', raw=>{const d=JSON.parse(raw); if(pending.has(d.id) && ['ack','error','snapshot'].includes(d.type)) {pending.get(d.id)(d);pending.delete(d.id);}});
  try {
    await Promise.race([new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);}),sleep(10000).then(()=>{throw Error('WS timeout');})]);
    async function send(body) {const id=String(++seq);let timer;try{return await Promise.race([new Promise(resolve=>{pending.set(id,resolve);ws.send(JSON.stringify({v:1,id,...body}));}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Snapshot timeout')),10000);})]);}finally{clearTimeout(timer);pending.delete(id);}}
    const snap=await send({type:'subscribe',topic:{type:'sidebar'}});
    const groups=snap.snapshot?.data?.projectGroups;
    if(!Array.isArray(groups))throw Error('Missing sidebar');
    const rows=[...new Map(groups.flatMap(g=>g.chats).map(c=>[c.chatId,c])).values()];
    const busy=[];
    for(const row of rows){
      const chat=await send({type:'subscribe',topic:{type:'chat',chatId:row.chatId}});
      const runtime=chat.snapshot?.data?.runtime;
      if(!runtime)throw Error('Missing task runtime');
      if(!['idle','failed'].includes(runtime.status)||runtime.isDraining)busy.push({chatId:row.chatId,title:row.title,status:runtime.status});
    }
    return busy;
  } finally {ws.close();}
}
function restart(){execFileSync('/bin/launchctl',['kickstart','-k',`gui/${process.getuid()}/local.kanna`]);}
async function deploy(){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
  for(const [file,hash] of Object.entries(manifest)){
    const p=path.join(installed,file);const current=fs.existsSync(p)?crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'):null;
    if(current!==hash)throw Error('Installed file changed after staging: '+file);
  }
  const backup=path.join(root,'backup');
  for(const file of Object.keys(manifest).filter(f=>f.startsWith('src/'))){const p=path.join(installed,file);if(fs.existsSync(p)){fs.mkdirSync(path.dirname(path.join(backup,file)),{recursive:true});fs.copyFileSync(p,path.join(backup,file));}}
  for(const dir of ['dist/client','dist/export-viewer'])fs.cpSync(path.join(installed,dir),path.join(backup,dir),{recursive:true});
  // Recheck after backups; do not activate while any task is active.
  const busy=await inspectIdle();if(busy.length)return false;
  status('deploying');
  for(const file of Object.keys(manifest).filter(f=>f.startsWith('src/')))fs.copyFileSync(path.join(root,'payload',file),path.join(installed,file));
  for(const dir of ['dist/client','dist/export-viewer'])fs.cpSync(path.join(root,'payload',dir),path.join(installed,dir),{recursive:true});
  restart();
  for(let i=0;i<30;i++){await sleep(1000);try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(2000)});if(r.ok){const html=await(await fetch(base)).text();const expected=fs.readFileSync(path.join(root,'payload/dist/client/index.html'),'utf8');const asset=expected.match(/src="([^"]+\.js)"/)[1];if(html.includes(asset)){status('complete',{asset, ...JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'))});return true;}}}catch{}}
  throw Error('Updated service failed health/asset verification; inspect deployment log and backup');
}
async function main(){
  let idleSamples=0;
  for(;;){
    try{const busy=await inspectIdle();if(busy.length){idleSamples=0;status('waiting_for_idle',{busy});}else{idleSamples++;status('confirming_idle');if(idleSamples>=2){if(await deploy())return;idleSamples=0;}}}
    catch(e){if(idleSamples>=2)throw e;status('waiting_for_connection',{error:e.message});}
    await sleep(15000);
  }
}
if(process.argv.includes('--launch')){
  const fd=fs.openSync(path.join(root,'deploy.log'),'a');
  const child=spawn(process.execPath,[__filename],{detached:true,stdio:['ignore',fd,fd]});child.unref();fs.closeSync(fd);console.log('Queued deployment PID '+child.pid);
}else main().catch(e=>{status('failed',{error:e.message});console.error(e);process.exitCode=1;});
