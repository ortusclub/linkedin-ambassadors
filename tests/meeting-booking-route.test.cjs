const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript');
function load(file,mocks={}){const m={exports:{}};new Function('require','exports','module',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(n=>mocks[n]||require(n),m.exports,m);return m.exports}
const time=load('src/lib/meeting-time.ts');
function setup(){const records=[],notes=[],inbounds=[],links=[];let chain=Promise.resolve(),sent=0;const startsAt=time.meetingSlots(new Date(),[])[0];const tx={scheduledMeeting:{findUnique:async({where})=>records.find(r=>r.applicationId===where.applicationId)||null,findMany:async({where})=>records.filter(r=>r.id!==where.id?.not),update:async({where,data})=>{const row=records.find(r=>r.id===where.id);Object.assign(row,{...data,sequence:row.sequence+data.sequence.increment});return row},create:async({data})=>{const r={...data,id:'booking-'+records.length,inviteSentAt:null,sequence:0,createdAt:new Date()};records.push(r);return r}},inboundBooking:{findMany:async()=>[],create:async({data})=>links.push(data),findUnique:async({where})=>links.find(r=>r.key===where.key),update:async({where,data})=>Object.assign(links.find(r=>r.key===where.key),data)},inboundLead:{create:async({data})=>{inbounds.push(data);return {id:'inbound'}},update:async({data})=>Object.assign(inbounds[0],data)},$executeRaw:async(...args)=>notes.push(args)};const prisma={...tx,ambassadorApplication:{findFirst:async({where})=>where.id===where.submittedByUserId?{id:where.id}:null,findUnique:async({where})=>({id:where.id,fullName:'Owner',email:where.id+'@example.test',contactNumber:'+639123456789'})},$transaction:fn=>{const result=chain.then(()=>fn(tx));chain=result.catch(()=>{});return result}};const route=load('src/app/api/meetings/route.ts',{'next/server':{NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})}},'@/lib/prisma':{prisma},'@/lib/auth':{requireAuth:async()=>({id:'a',email:'a@example.test'})},'@/lib/application-ownership':{submittedApplicationsWhere:user=>({submittedByUserId:user.id})},'@/lib/meeting-token':{meetingApplication:t=>t==='invalid'?null:t},'@/lib/self-onboarding-gate':{verifyPermit:p=>p==='verified'},'@/lib/meeting-time':time,'@/lib/meeting-scheduler':{calendarBusy:async()=>[],sendMeetingInvitation:async()=>{sent++}}});const request=(id,permit='verified',override={})=>({url:'https://example.test/api/meetings',headers:new Headers({authorization:'Bearer '+id}),json:async()=>({startsAt,permit,...override})});return {route,request,records,notes,inbounds,links,startsAt,get sent(){return sent}}}
test('two applications competing for a slot create only one booking and inbound',async()=>{const f=setup();const responses=await Promise.all([f.route.POST(f.request('a')),f.route.POST(f.request('b'))]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(f.records.length,1);assert.equal(f.inbounds.length,1);assert.equal(f.records[0].applicationId,'a')});
test('retrying a booking does not duplicate the meeting or pipeline entry',async()=>{const f=setup();await f.route.POST(f.request('a'));await f.route.POST(f.request('a'));assert.equal(f.records.length,1);assert.equal(f.inbounds.length,1);assert.equal(f.notes.length,2)});
test('invalid token and unverified email cannot reserve time or send invites',async()=>{const f=setup();assert.equal((await f.route.POST(f.request('invalid'))).status,401);assert.equal((await f.route.POST(f.request('a','wrong'))).status,403);assert.equal(f.records.length,0);assert.equal(f.sent,0)});

test('rescheduling keeps the meeting ID, updates the inbound, and releases the old slot',async()=>{
 const f=setup();await f.route.POST(f.request('a'));const id=f.records[0].id;
 const next=time.meetingSlots(new Date(),[])[1];
 const response=await f.route.PUT(f.request('a','verified',{startsAt:next,sequence:0}));
 assert.equal(response.status,200);assert.equal(f.records.length,1);assert.equal(f.records[0].id,id);assert.equal(f.records[0].sequence,1);assert.equal(f.records[0].startsAt.toISOString(),next);assert.equal(f.inbounds.length,1);assert.equal(f.links[0].scheduledAt.toISOString(),next);
 assert.equal((await f.route.POST(f.request('b'))).status,200);
});
test('a conflicting reschedule preserves the original meeting',async()=>{
 const f=setup();await f.route.POST(f.request('a'));const next=time.meetingSlots(new Date(),[])[1];await f.route.POST(f.request('b','verified',{startsAt:next}));
 assert.equal((await f.route.PUT(f.request('a','verified',{startsAt:next,sequence:0}))).status,409);assert.equal(f.records[0].startsAt.toISOString(),f.startsAt);
});
test('stale reschedule cannot overwrite a newer time',async()=>{
 const f=setup();await f.route.POST(f.request('a'));const slots=time.meetingSlots(new Date(),[]);
 await f.route.PUT(f.request('a','verified',{startsAt:slots[1],sequence:0}));
 assert.equal((await f.route.PUT(f.request('a','verified',{startsAt:slots[2],sequence:0}))).status,409);assert.equal(f.records[0].startsAt.toISOString(),slots[1]);
});
test('dashboard ownership is checked before booking without a verification code',async()=>{
 const f=setup();const own=f.request('a','');own.url+='?applicationId=a';assert.equal((await f.route.POST(own)).status,200);
 const other=f.request('b','');other.url+='?applicationId=b';assert.equal((await f.route.POST(other)).status,401);assert.equal(f.records.length,1);
});
