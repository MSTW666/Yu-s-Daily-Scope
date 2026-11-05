// Input is a LOCAL envelope. Never commit the source chat or credentials.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {validateBriefing} from './validate.mjs';
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function checkEnvelope(e, day=today()) {
  if(e?.source?.threadId!=='6ade2348-ceb4-83e8-9ac5-450d59896427'||!e.source.messageId||e.source.complete!==true)throw Error('Missing complete source evidence');
  const b=e.briefing;
  if(e.source.date!==day||b?.date!==day)throw Error('Only today’s source can be published');
  const [,m,d]=day.split('-').map(Number);
  if(!new RegExp(`${m}\\s*月\\s*${d}\\s*日`).test(e.source.text||''))throw Error('Source must explicitly identify today');
  const {errors}=validateBriefing(b);if(errors.length)throw Error(errors.join('\n'));
  if(!b.sourceNote)throw Error('Missing source note');
  for(const it of b.items){if(it.source_url&&(!it.source_url.startsWith('https://')||!e.source.text.includes(it.source_url)))throw Error('Link not in original source');}
  return b;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const input=path.resolve(process.argv[2]||'');
  const envelope=JSON.parse(fs.readFileSync(input,'utf8'));
  const b=checkEnvelope(envelope);
  if(process.argv.includes('--check')){console.log('Validated '+b.date+' / '+b.items.length+' items');process.exit(0);}
  const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const git=(...args)=>execFileSync('git',['-c','http.proxy=http://127.0.0.1:7897','-c','http.sslBackend=openssl',...args],{cwd:repo,encoding:'utf8',windowsHide:true}).trim();
  if(git('remote','get-url','origin')!=='https://github.com/MSTW666/Yu-s-Daily-Scope.git')throw Error('Unexpected repository');
  if(git('status','--porcelain'))throw Error('Working tree has changes; preserve them and retry after review');
  git('pull','--ff-only','origin','main');
  const live=path.join(repo,'data/briefing.json');
  const current=JSON.parse(fs.readFileSync(live,'utf8'));
  if(current.date>b.date)throw Error('Refusing older content');
  if(current.date===b.date&&current.sourceMessageId!==envelope.source.messageId)throw Error('Today already has different content; review before overwriting');
  if(current.date!==b.date){
    b.issue=(current.issue||0)+1;b.sourceMessageId=envelope.source.messageId;
    b.published_at=new Date().toISOString();
    const archive=path.join(repo,'data/archive',current.date+'.json');
    fs.mkdirSync(path.dirname(archive),{recursive:true});if(!fs.existsSync(archive))fs.copyFileSync(live,archive);
    fs.writeFileSync(live,JSON.stringify(b,null,2)+'\n');
    git('add','--','data/briefing.json','data/archive/'+current.date+'.json');
    git('commit','-m','publish: '+b.date+' from existing daily collection');
  }
  // Retry also pushes a previous local commit if its network push failed.
  git('push','origin','HEAD:main');
  const expected=JSON.parse(fs.readFileSync(live,'utf8'));
  let verified=false;
  for(let i=0;i<12;i++){
    try{
      const output=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ProgressPreference='SilentlyContinue'; Invoke-RestMethod -Uri ('https://mstw666.github.io/Yu-s-Daily-Scope/data/briefing.json?t='+[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()) | ConvertTo-Json -Depth 20 -Compress"],{encoding:'utf8',windowsHide:true});
      const actual=JSON.parse(output.replace(/^\uFEFF/,''));
      if(actual.date===expected.date&&actual.sourceMessageId===expected.sourceMessageId&&JSON.stringify(actual.items)===JSON.stringify(expected.items)){verified=true;break;}
    }catch{}
    await new Promise(r=>setTimeout(r,10000));
  }
  if(!verified)throw Error('Pushed, but public Pages verification is pending; retry without generating a new issue');
  fs.writeFileSync(path.join(path.dirname(input),'last-success.json'),JSON.stringify({date:b.date,messageId:envelope.source.messageId,commit:git('rev-parse','HEAD'),verifiedAt:new Date().toISOString()},null,2));
  console.log('VERIFIED '+b.date+' / '+b.items.length+' items');
}
