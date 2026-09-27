const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs'),ts=require('typescript');
const contactModule={exports:{}};new Function('exports',ts.transpileModule(fs.readFileSync('src/lib/booking-contact.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(contactModule.exports);
const moduleObject={exports:{}};const js=ts.transpileModule(fs.readFileSync('src/lib/inbound-bookings.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
new Function('require','exports','module',js)(n=>n==='@/lib/prisma'?{prisma:{}}:n==='@/lib/booking-contact'?contactModule.exports:require(n),moduleObject.exports,moduleObject);
const {parseInboundBookings}=moduleObject.exports;
const event=(uid,title,extra='')=>`BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:20260927T100000Z\r\nDTSTART;TZID=Europe/Belgrade:20260928T140000\r\nSUMMARY:${title}\r\nATTENDEE;CN=Test Person:mailto:person@example.com\r\nATTENDEE:mailto:info@linkedvelocity.com\r\n${extra}END:VEVENT\r\n`;
const feed=s=>`BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${s}END:VCALENDAR`;
const now=new Date('2026-09-27T00:00:00Z');
test('only scheduler appointments, external guests and correct timezone',()=>{const result=parseInboundBookings(feed(event('1','30 min with LinkedVelocity')+event('2','Internal meeting')),now);assert.equal(result.length,1);assert.equal(result[0].email,'person@example.com');assert.equal(result[0].scheduledAt.toISOString(),'2026-09-28T12:00:00.000Z');});
test('rescheduling preserves event key; cancellation changes fingerprint',()=>{const a=parseInboundBookings(feed(event('1','30 min with LinkedVelocity')),now)[0];const b=parseInboundBookings(feed(event('1','30 min with LinkedVelocity','STATUS:CANCELLED\r\n')),now)[0];assert.equal(a.key,b.key);assert.notEqual(a.fingerprint,b.fingerprint);assert.equal(b.cancelled,true);});
test('invalid feeds rejected and recurring meetings ignored',()=>{assert.throws(()=>parseInboundBookings('<html>error</html>',now));assert.equal(parseInboundBookings(feed(event('1','30 min with LinkedVelocity','RRULE:FREQ=WEEKLY\r\n')),now).length,0)});

test('uses the booking form name and number for the matching attendee',()=>{
const desc='<b>Booked by</b>\nJane  Smith\nperson@example.com\n+63 999 123 4567\n<br><b>Best way to reach you?</b>\nWhatsApp';
assert.deepEqual(contactModule.exports.bookingContact(desc,'person@example.com'),{name:'Jane Smith',phone:'+63 999 123 4567'});
assert.deepEqual(contactModule.exports.bookingContact(desc,'someoneelse@example.com'),{});
const result=parseInboundBookings(feed(event('name','30 min with LinkedVelocity','DESCRIPTION:'+desc.replace(/\n/g,'\\n')+'\r\n')),now)[0];
assert.equal(result.name,'Jane Smith');assert.equal(result.phone,'+63 999 123 4567');
});
