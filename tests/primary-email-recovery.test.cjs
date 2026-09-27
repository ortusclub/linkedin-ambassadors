const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const crypto = require('node:crypto');
function load(file, mocks={}) { const m={exports:{}}; new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(n=>mocks[n]||require(n),m,m.exports);return m.exports; }
const policy = load('src/lib/primary-email-policy.ts');
const account = {id:'account-1', loginEmail:'owner@lv.test', personalEmail:'original@example.com', linkedinUrl:'https://linkedin.com/in/test', notes:'',selfServiceOnboarding:{applicationId:'app-1'}};
const apps = [{id:'app-1',email:'contact@example.com',linkedinUrl:account.linkedinUrl}];
test('ownership accepts only saved personal or uniquely linked contact email, never the LV inbox',()=>{
  assert.equal(policy.ownerMatches(account,apps,'contact@example.com'),true);
  assert.equal(policy.ownerMatches(account,apps,'original@example.com'),true);
  assert.equal(policy.ownerMatches(account,apps,'stranger@example.com'),false);
  assert.equal(policy.ownerMatches(account,apps,account.loginEmail),false);
  assert.equal(policy.ownerMatches({...account,selfServiceOnboarding:null},[...apps,{...apps[0],id:'duplicate'}],'contact@example.com'),false);
});
test('extracts only email confirmation and excludes login, reset, two-factor and foreign links',()=>{
  assert.equal(policy.emailConfirmation('Please confirm your email address','Confirm (https://www.linkedin.com/comm/psettings/email/confirm?token=example)'), 'Confirm your LinkedVelocity email address:\nhttps://www.linkedin.com/comm/psettings/email/confirm?token=example');
  assert.equal(policy.emailConfirmation('Verify your email address','Your verification code is 123456'), 'Your LinkedIn email-address confirmation code: 123456');
  for(const subject of ['Reset your password','Your sign-in email verification code','Two-factor verification','Security alert']) assert.equal(policy.emailConfirmation(subject,'Your verification code is 123456'),null);
  assert.equal(policy.emailConfirmation('Confirm email','https://linkedin.com.evil.test/comm/psettings/email/confirm?token=example'),null);
  assert.equal(policy.emailConfirmation('Confirm email','https://linkedin.com/checkpoint/challenge?token=example'),null);
});
class EmailSetupError extends Error { constructor(message,status=400){super(message);this.status=status;} }
function fixture({known=true, limit=0, expired=false, failMail=false}={}) {
  const token='a'.repeat(64), id=crypto.createHash('sha256').update(token).digest('hex');
  const now=Date.now(); let row={id,accountId:known?'account-1':null,address:known?account.loginEmail:null,destination:'contact@example.com',codeHash:'hash:123456',attempts:0,expiresAt:new Date(now+(expired?-1000:600000)),verifiedAt:null,forwardingUntil:null,completedAt:null};
  const deliveries=new Map(), sent=[],notes=[];
  const prisma={linkedInAccount:{findMany:async()=>known?[account]:[]},ambassadorApplication:{findMany:async()=>apps},primaryEmailRecovery:{
    findUnique:async()=>row,
    findMany:async()=>row.verifiedAt&&row.forwardingUntil>new Date()&&!row.completedAt?[row]:[],
    count:async()=>limit,
    create:async({data})=>row={...row,...data},
    update:async({data})=>{for(const[k,v]of Object.entries(data)) row[k]=v&&typeof v==='object'&&'increment'in v?row[k]+v.increment:v;return row;},
    updateMany:async({where,data})=>{if(where.verifiedAt&&!row.verifiedAt)return{count:0};Object.assign(row,data);return{count:1};}
  },primaryEmailDelivery:{findUnique:async({where})=>deliveries.get(where.emailId)||null,count:async()=>deliveries.size,upsert:async({where,create,update})=>{const prior=deliveries.get(where.emailId);deliveries.set(where.emailId,prior?{...prior,...update}:{...create,createdAt:new Date()});},update:async({where,data})=>{Object.assign(deliveries.get(where.emailId),data);}},$executeRaw:async(...a)=>notes.push(a)};
  prisma.$transaction=async f=>typeof f==='function'?f(prisma):Promise.all(f);
  const mod=load('src/lib/primary-email-recovery.ts',{'@/lib/prisma':{prisma},'@/lib/primary-email-policy':policy,'@/lib/onboarding-email-policy':{EmailSetupError,emailSetupConfig:()=>({ready:true,domains:['lv.test']}),hashEmailCode:(_id,_email,code)=>'hash:'+code,onboardingEmailFrom:()=> 'team@lv.test',linkedinSender:from=>from==='security@linkedin.com',forwardedText:text=>text},'@/services/onboarding-mail':{onboardingMailRequest:async(_path,body)=>{if(failMail)throw Error('mail failure');sent.push(body);}}});
  return {...mod,token,prisma,sent,notes,get row(){return row;},deliveries};
}
test('unverified and expired sessions cannot read assigned LV address',async()=>{
  const f=fixture();await assert.rejects(f.primaryRecoveryStatus(f.token),/session has ended/);
  const ex=fixture({expired:true});await assert.rejects(ex.verifyPrimaryRecovery(ex.token,'123456'),/incorrect, expired/);
});
test('failed verification attempts persist and stop after five',async()=>{
  const f=fixture();for(let i=0;i<6;i++)await assert.rejects(f.verifyPrimaryRecovery(f.token,'000000'));
  assert.equal(f.row.attempts,5);await assert.rejects(f.verifyPrimaryRecovery(f.token,'123456'));
});
test('verification opens a bounded window, and completion records only an owner attestation',async()=>{
  const f=fixture();const data=await f.verifyPrimaryRecovery(f.token,'123456');assert.equal(data.address,account.loginEmail);assert.ok(f.row.forwardingUntil-Date.now()<=1800000);
  await f.completePrimaryRecovery(f.token);assert.ok(f.row.completedAt);await assert.rejects(f.primaryRecoveryStatus(f.token));assert.ok(f.notes.some(n=>n.some(v=>typeof v==='string'&&v.includes('Team must still verify access'))));
});
test('unknown owners receive no email or account details; known owners get a personal verification code',async()=>{
  const unknown=fixture({known:false});const result=await unknown.startPrimaryRecovery('stranger@example.com','ip');assert.equal(unknown.sent.length,0);assert.equal(result.address,undefined);assert.equal(result.token.length,64);
  const known=fixture();await known.startPrimaryRecovery('contact@example.com','ip');assert.deepEqual(known.sent[0].to,['contact@example.com']);assert.equal(known.sent[0].text.includes(account.loginEmail),false);
});
test('rate limit prevents sending',async()=>{const f=fixture({limit:5});await assert.rejects(f.startPrimaryRecovery('contact@example.com','ip'),/Please wait/);assert.equal(f.sent.length,0);});
test('webhook forwards only email confirmation once to the verified owner, not sign-in challenges',async()=>{
  const f=fixture();await f.verifyPrimaryRecovery(f.token,'123456');
  const msg={id:'email-1',from:'security@linkedin.com',to:[account.loginEmail],created_at:new Date().toISOString(),subject:'Verify your email address',text:'Your verification code is 123456',html:null};
  assert.equal(await f.forwardPrimaryRecoveryEmail(msg.id,msg),true);assert.equal(f.sent.length,1);assert.deepEqual(f.sent[0].to,['contact@example.com']);
  await f.forwardPrimaryRecoveryEmail(msg.id,msg);assert.equal(f.sent.length,1);
  await f.forwardPrimaryRecoveryEmail('email-2',{...msg,id:'email-2',subject:'Your sign-in verification code'});assert.equal(f.sent.length,1);
});
test('forwarding rechecks current ownership before sending',async()=>{
  const f=fixture();await f.verifyPrimaryRecovery(f.token,'123456');f.prisma.linkedInAccount.findMany=async()=>[];
  await f.forwardPrimaryRecoveryEmail('email-1',{id:'email-1',from:'security@linkedin.com',to:[account.loginEmail],created_at:new Date().toISOString(),subject:'Verify email',text:'Verification code: 123456',html:null});assert.equal(f.sent.length,0);
});
