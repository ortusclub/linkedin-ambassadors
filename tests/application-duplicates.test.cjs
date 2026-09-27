const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript');
function load(file,mocks={}){const m={exports:{}};new Function('require','exports','module',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(n=>mocks[n]||require(n),m.exports,m);return m.exports}
test('duplicate checks include normalized account email and precise profile identity',async()=>{
 let appQuery,accountQuery;
 const helper=load('src/lib/application-duplicates.ts',{'@/lib/prisma':{prisma:{ambassadorApplication:{findFirst:async q=>{appQuery=q;return null}},linkedInAccount:{findFirst:async q=>{accountQuery=q;return {id:'inventory-id'}}}}}});
 const note=await helper.existingApplicationAccount(' OWNER@Example.com ','https://linkedin.com/in/person?tracking=yes');
 assert.match(note,/Existing account submission/);assert.match(note,/inventory-id/);
 assert.equal(appQuery.where.OR[0].email.equals,'owner@example.com');
 assert.ok(accountQuery.where.OR.some(q=>q.linkedinUrl?.endsWith==='/in/person'));
 assert.ok(!accountQuery.where.OR.some(q=>q.linkedinUrl?.contains==='/in/person'));
});
test('an existing account is accepted for review without granting an existing session or provisioning',async()=>{
 const created=[]; let permitValid=true;
 const route=load('src/app/api/self-onboarding/start/route.ts',{
  '@/lib/application-duplicates':{existingApplicationAccount:async()=> '[Existing account submission] Existing inventory account: account-id.'},
  '@/lib/prisma':{prisma:{referrer:{findUnique:async()=>({id:'diy-id',slug:'diy'})},$transaction:async fn=>fn({$executeRaw:async()=>{},ambassadorApplication:{findFirst:async()=>null,create:async q=>{created.push(q.data)}}})}},
  '@/lib/self-service-input':load('src/lib/self-service-input.ts'),
  '@/lib/self-service-onboarding':{OnboardingError:class extends Error{},DIY_REFERRER_SLUG:'diy',reserveOnboarding:async()=>{throw Error('must not provision')},mintSelfToken:async()=>{throw Error('must not expose old access')}},
  '@/lib/auth':{getSession:async()=>({id:'submitter-id'})},'@/lib/self-onboarding-gate':{verifyPermit:()=>permitValid}
 });
 const previous=process.env.GOLOGIN_API_TOKEN_KLABBER;process.env.GOLOGIN_API_TOKEN_KLABBER='mock';
 const body={fullName:'Test Owner',email:'owner@example.com',linkedinUrl:'https://linkedin.com/in/person',country:'PH',contactNumber:'WhatsApp:+639123456789',accountFreshness:'established',paymentMethod:'GCash',paymentDetails:'09123456789',payoutName:'Test Owner',consent:true,tier:'partial',permit:'mock'};
 const request=()=>new Request('https://example.test/api/self-onboarding/start',{method:'POST',body:JSON.stringify(body)});
 try {
  const r=await route.POST(request());assert.equal(r.status,200);assert.deepEqual(await r.json(),{lead:true});assert.equal(created.length,1);assert.equal(created[0].submittedByUserId,'submitter-id');assert.equal(created[0].diyTier,'partial');assert.equal(created[0].status,'reviewing');assert.match(created[0].adminNotes,/Existing account submission/);
  permitValid=false;assert.equal((await route.POST(request())).status,403);assert.equal(created.length,1);
 } finally {if(previous)process.env.GOLOGIN_API_TOKEN_KLABBER=previous;else delete process.env.GOLOGIN_API_TOKEN_KLABBER}
});
