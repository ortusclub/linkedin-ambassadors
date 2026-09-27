const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript'),ical=require('node-ical');
function load(file,mocks={}){const m={exports:{}};new Function('require','exports','module',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(n=>mocks[n]||require(n),m.exports,m);return m.exports}
const time=load('src/lib/meeting-time.ts');
test('30-minute slots are weekdays 9–5 Manila and enforce two hours notice',()=>{const now=new Date('2026-09-28T00:00:00Z');const slots=time.meetingSlots(now,[]);assert.equal(slots[0],'2026-09-28T02:00:00.000Z');for(const s of slots){const local=new Date(new Date(s).getTime()+8*3600000);assert.ok(local.getUTCDay()>0&&local.getUTCDay()<6);assert.ok(local.getUTCHours()>=9&&local.getUTCHours()<17);assert.equal(local.getUTCMinutes()%30,0)}assert.ok(slots.includes('2026-09-28T08:30:00.000Z'));assert.ok(!slots.includes('2026-09-28T09:00:00.000Z'))});
test('busy time overlaps are excluded while adjacent slots are retained',()=>{const slots=time.meetingSlots(new Date('2026-09-27T00:00:00Z'),[{start:new Date('2026-09-28T01:10Z'),end:new Date('2026-09-28T01:40Z')}]);assert.ok(!slots.includes('2026-09-28T01:00:00.000Z'));assert.ok(!slots.includes('2026-09-28T01:30:00.000Z'));assert.ok(slots.includes('2026-09-28T02:00:00.000Z'))});
test('invitation parses with correct duration, host, attendee and safe text',()=>{const source=time.meetingInvite({id:'test',name:'José\nBEGIN:VEVENT',email:'owner@example.test',contact:'WhatsApp:+639123456789',startsAt:new Date('2026-09-28T01:00Z'),createdAt:new Date('2026-09-27T00:00Z')});const events=Object.values(ical.sync.parseICS(source)).filter(e=>e.type==='VEVENT');assert.equal(events.length,1);assert.equal(events[0].end-events[0].start,30*60000);assert.match(source,/METHOD:REQUEST/);assert.match(source,/info@linkedvelocity.com/);assert.match(source,/owner@example.test/)});
test('application-bound booking tokens reject changes and expiry',()=>{process.env.ONBOARDING_EMAIL_CODE_SECRET='unit-test-secret';const token=load('src/lib/meeting-token.ts');const id='a376a0b9-ffe9-45a9-9ddd-69968cb601e2';const signed=token.meetingToken(id);assert.equal(token.meetingApplication(signed),id);assert.equal(token.meetingApplication(signed+'x'),null);const original=Date.now;Date.now=()=>original()+2*86400000;try{assert.equal(token.meetingApplication(signed),null)}finally{Date.now=original}});
test('calendar availability includes recurring busy events and excludes cancelled/transparent events',async()=>{const scheduler=load('src/lib/meeting-scheduler.ts',{'@/lib/prisma':{prisma:{}},'@/lib/meeting-time':time});process.env.CALENDAR_ICAL_URL='https://calendar.example.test/feed';const original=global.fetch;global.fetch=async()=>({ok:true,text:async()=>['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT','UID:busy','DTSTART:20260928T010000Z','DTEND:20260928T020000Z','RRULE:FREQ=DAILY;COUNT=3','END:VEVENT','BEGIN:VEVENT','UID:cancelled','DTSTART:20260928T030000Z','DTEND:20260928T040000Z','STATUS:CANCELLED','END:VEVENT','END:VCALENDAR'].join('\r\n')});try{const busy=await scheduler.calendarBusy(new Date('2026-09-27'));assert.equal(busy.length,3)}finally{global.fetch=original}});

test('rescheduled invitations retain UID and increment sequence',()=>{
 const booking={id:'stable-booking',name:'Owner',email:'owner@example.test',contact:'Phone',startsAt:new Date('2026-09-28T02:00Z'),createdAt:new Date('2026-09-27T00:00Z'),updatedAt:new Date('2026-09-27T01:00Z'),sequence:1};
 const event=Object.values(ical.sync.parseICS(time.meetingInvite(booking))).find(e=>e.type==='VEVENT');
 assert.equal(event.uid,'stable-booking@linkedvelocity.com');assert.equal(event.sequence,1);assert.equal(event.start.toISOString(),'2026-09-28T02:00:00.000Z');
});

test('native calendar email identifies applicant/account and preserves update identity and idempotency',async()=>{
 const nodemailer=require('nodemailer');
 const booking={id:'test-calendar',name:'Barry Test',email:'barry@example.test',host:time.MEETING_HOST,contact:'WhatsApp:+639123456789',startsAt:new Date('2026-10-01T04:00Z'),createdAt:new Date('2026-09-27T00:00Z'),updatedAt:new Date('2026-09-27T01:00Z'),sequence:2,inviteSentAt:null,application:{linkedinUrl:'https://www.linkedin.com/in/test-account',linkedinEmail:'account@example.test'}};
 let raw,options,updated;
 const scheduler=load('src/lib/meeting-scheduler.ts',{
  '@/lib/prisma':{prisma:{scheduledMeeting:{findUniqueOrThrow:async()=>booking,updateMany:async query=>{updated=query}}}},
  '@/lib/meeting-time':time,
  nodemailer:{default:{createTransport:()=>({sendMail:async message=>{options=message;raw=(await nodemailer.createTransport({streamTransport:true,buffer:true}).sendMail(message)).message.toString();return {rejected:[]}}})}}
 });
 const previous=process.env.RESEND_API_KEY;process.env.RESEND_API_KEY='mock';
 try{await scheduler.sendMeetingInvitation(booking.id)}finally{if(previous)process.env.RESEND_API_KEY=previous;else delete process.env.RESEND_API_KEY}
 assert.match(raw,/Content-Type: multipart\/alternative/);
 assert.match(raw,/Content-Type: text\/calendar; charset=utf-8; method=REQUEST/);
 assert.deepEqual(options.to,['barry@example.test',time.MEETING_HOST]);
 assert.match(options.subject,/Barry Test/);
 assert.match(options.text,/test-account/);assert.match(options.text,/account@example.test/);
 assert.equal(options.headers['Resend-Idempotency-Key'],'meeting-invitation/test-calendar/2');
 const event=Object.values(ical.sync.parseICS(options.icalEvent.content)).find(e=>e.type==='VEVENT');
 assert.equal(event.uid,'test-calendar@linkedvelocity.com');assert.equal(event.sequence,2);
 assert.match(event.description,/test-account/);assert.match(event.description,/LinkedVelocity onboarding team/);
 assert.deepEqual(updated.where,{id:'test-calendar',sequence:2});
});

test('SMTP failure falls back to a booking email for applicant and host with the original contact details',async()=>{
 const booking={id:'fallback-booking',name:'Test Owner',email:'owner@example.test',host:time.MEETING_HOST,contact:'Viber:+639123456789',startsAt:new Date('2026-09-30T03:30Z'),createdAt:new Date('2026-09-27T00:00Z'),updatedAt:new Date('2026-09-27T01:00Z'),sequence:1,inviteSentAt:null,application:{linkedinUrl:'https://linkedin.com/in/test',linkedinEmail:'account@example.test'}};
 let saved,message;const originalFetch=global.fetch,oldKey=process.env.RESEND_API_KEY;process.env.RESEND_API_KEY='mock';
 const scheduler=load('src/lib/meeting-scheduler.ts',{'@/lib/prisma':{prisma:{scheduledMeeting:{findUniqueOrThrow:async()=>booking,updateMany:async q=>{saved=q}}}},'@/lib/meeting-time':time,nodemailer:{default:{createTransport:()=>({sendMail:async()=>{throw Error('SMTP unavailable')}})}}});
 global.fetch=async(url,opts)=>{assert.equal(url,'https://api.resend.com/emails');message=JSON.parse(opts.body);return {ok:true}};
 try{assert.equal(await scheduler.sendMeetingInvitation(booking.id),'email')}finally{global.fetch=originalFetch;if(oldKey)process.env.RESEND_API_KEY=oldKey;else delete process.env.RESEND_API_KEY}
 assert.deepEqual(message.to,['owner@example.test',time.MEETING_HOST]);assert.match(message.text,/Viber:\+639123456789/);assert.match(message.text,/2026-09-30 03:30:00 UTC/);assert.match(message.text,/replaces the previous time/);assert.equal(saved.data.inviteDelivery,'email');assert.ok(saved.data.inviteSentAt);
});
