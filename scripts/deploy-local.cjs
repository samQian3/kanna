// Deployment for the existing macOS LaunchAgent installation. No credentials are stored in Git.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const git = (...args) => execFileSync('git', args, {cwd:repo, encoding:'utf8'}).trim();
const branch = 'sam-upgrade';
if (process.platform !== 'darwin') throw Error('This deployment target requires macOS');
if (git('branch','--show-current') !== branch) throw Error(`Deploy only from ${branch}`);
if (git('status','--porcelain')) throw Error('Commit or stash local changes before deployment');
if (!git('remote','get-url','origin').match(/github\.com[:/]samQian3\/kanna(?:\.git)?$/)) throw Error('origin must be your samQian3/kanna fork');
git('fetch','origin',branch);
const commit = git('rev-parse','HEAD');
if (commit !== git('rev-parse',`origin/${branch}`)) throw Error('Local branch must match the pushed upgrade branch');
const appHome = path.join(os.homedir(),'Library/Application Support/Kanna');
const installed = path.join(appHome,'node_modules/kanna-code');
const localPackage = JSON.parse(fs.readFileSync(path.join(repo,'package.json')));
const livePackage = JSON.parse(fs.readFileSync(path.join(installed,'package.json')));
if (JSON.stringify(localPackage.dependencies) !== JSON.stringify(livePackage.dependencies)) throw Error('Dependencies changed: prepare a compatible installation before deploying');
execFileSync('bun',['run','check'],{cwd:repo,stdio:'inherit'});
const root = path.join(repo,'.deploy',`${Date.now()}-${commit.slice(0,8)}`);
const payload = path.join(root,'payload');
const manifest = {};
const files = git('ls-files','src/server','src/shared').split('\n').filter(f=>f && !/\.(test|e2e)\./.test(f));
for (const file of files) {
  const dest=path.join(payload,file); fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.copyFileSync(path.join(repo,file),dest);
}
for (const dir of ['dist/client','dist/export-viewer']) fs.cpSync(path.join(repo,dir),path.join(payload,dir),{recursive:true});
for (const file of [...files,'dist/client/index.html','dist/export-viewer/index.html']) {
  const dest=path.join(installed,file); manifest[file]=fs.existsSync(dest)?crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex'):null;
}
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(root,'release.json'),JSON.stringify({repository:'samQian3/kanna',branch,commit},null,2));
execFileSync(process.execPath,[path.join(__dirname,'deploy-idle-worker.cjs'),'--launch'],{cwd:repo,stdio:'inherit',env:{...process.env,KANNA_RELEASE_DIR:root}});
console.log(`Waiting for all tasks to finish. Deployment status: ${path.join(root,'status.json')}`);
