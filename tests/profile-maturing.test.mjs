import test from 'node:test';
import assert from 'node:assert/strict';
import {visible,eligible,preparePlan,boardState} from '../src/lib/maturing/model.mjs';
import {newMaturePlan} from '../src/lib/maturing/shared/mature-profile-plan.mjs';
const account={id:'one',gologinProfileId:'one',name:'One',loginEmail:'one@example.com',linkedinUrl:'https://www.linkedin.com/in/one',workspace:'linkedvelocity',rented:false,restricted:false};
const recipient={...account,id:'two',gologinProfileId:'two',linkedinUrl:'https://www.linkedin.com/in/two'};
const plan=()=>({...newMaturePlan(),warmPool:'linkedvelocity_owned'});
test('only company-owned maturing campaigns are visible',()=>{
 assert.equal(visible({maturing:true,owner:'person@linkedvelocity.com'}),true);
 for(const owner of ['person@ortusclub.com','person@linkedvelocity.com.evil','a@b@linkedvelocity.com',''])assert.equal(visible({maturing:true,owner}),false);
 assert.equal(visible({owner:'person@linkedvelocity.com'}),false);
});
test('rented, restricted and missing browser identities fail closed',()=>{
 for(const change of [{rented:true},{restricted:true},{gologinProfileId:''},{removed:true},{showcase:true}])assert.equal(eligible({...account,...change}),false);
});
test('warm plan retains desktop schedule, engine workspace and acceptance metadata',()=>{
 const [stage]=preparePlan({plan:plan(),timezone:'Europe/Rome'},account,[account,recipient]);
 assert.deepEqual(stage.profileIds,['one']);assert.equal(stage.config.glAccount,'linkedvelocity');
 assert.deepEqual(stage.config.dailySchedule.amounts.slice(0,7),[3,3,3,6,6,6,6]);
 assert.equal(stage.leads[0].row['Pool Profile ID'],'two');assert.equal(stage.config.maturedAccount.profileUrl,account.linkedinUrl);
 assert.equal(stage.config.dailyCounterScope,'warm');
});
test('exclude previous attempts and ineligible warm recipients',()=>{
 assert.throws(()=>preparePlan({plan:plan()},account,[account,recipient],[recipient.linkedinUrl]),/No eligible/);
 assert.throws(()=>preparePlan({plan:plan()},account,[account,{...recipient,rented:true}]),/No eligible/);
});
test('fixed-duration warm plans end instead of repeating the last daily amount',()=>{
 const p={...plan(),warmUntilExhausted:false};const [stage]=preparePlan({plan:p},account,[account,recipient]);
 assert.equal(stage.config.dailySchedule.amounts.at(-1),0);assert.equal(stage.config.dailySchedule.amounts.length,29);
});
test('cold schedule excludes managed accounts, duplicates and attempted URLs',()=>{
 const p={...plan(),warmEnabled:false,coldEnabled:true,stages:[{id:'cold',name:'Cold',fromDay:1,toDay:60,warmDaily:0,coldDaily:1,likesDaily:0}]};
 const [stage]=preparePlan({plan:p,coldUrls:[recipient.linkedinUrl,'https://www.linkedin.com/in/new','https://www.linkedin.com/in/new/'].join('\n')},account,[account,recipient]);
 assert.equal(stage.leads.length,1);assert.equal(stage.kind,'cold');assert.equal(stage.config.dailySchedule.amounts.length,61);assert.equal(stage.config.dailySchedule.amounts.at(-1),0);
});
test('reject unsafe or malformed plans before dispatch',()=>{
 assert.throws(()=>preparePlan({plan:null},account,[recipient]),/Invalid/);
 assert.throws(()=>preparePlan({plan:plan(),timezone:'invalid'},account,[recipient]));
 const p=plan();p.stages[1].fromDay=99;assert.throws(()=>preparePlan({plan:p},account,[recipient]),/gaps or overlaps/);
});
test('board uses the desktop status labels',()=>{assert.equal(boardState({status:'paused'}).label,'Paused');assert.equal(boardState({status:'waiting_daily_reset'}).label,'Sleeping');});
test('stall labels preserve the recorded retry count',()=>{assert.equal(boardState({status:'needs_review',logs:[{line:'Suspected stall — 5 attempts made',t:1}]}).label,'Suspected stall — 5 attempts made');});

test('edited sender identity is used by receiving accounts',()=>{
 const p=plan();p.accounts={one:{name:'Updated identity',linkedinUrl:'https://www.linkedin.com/in/updated'}};
 const [stage]=preparePlan({plan:p},account,[account,recipient]);
 assert.deepEqual(stage.config.maturedAccount,{name:'Updated identity',profileUrl:'https://www.linkedin.com/in/updated'});
});
