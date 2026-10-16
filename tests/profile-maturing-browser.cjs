const puppeteer=require('puppeteer');const assert=require('node:assert/strict');
(async()=>{
 const browser=await puppeteer.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const page=await browser.newPage();await page.setViewport({width:1440,height:1100});
 await page.setCookie({name:'session_token',value:'browser-fixture-only',domain:'127.0.0.1',path:'/'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));let posts=0;let launch=null;
 const account={id:'fixture',gologinProfileId:'profile',name:'Test account',loginEmail:'test@example.com',linkedinUrl:'https://www.linkedin.com/in/test',connections:10,rented:false,restricted:false};
 const fresh={...account,id:'new-account',gologinProfileId:'new-profile',name:'New account',loginEmail:'new@example.com'};
 const rented={...account,id:'rented-account',gologinProfileId:'rented-profile',loginEmail:'rented@example.com',rented:true};
 const campaign={id:'campaign',name:account.loginEmail,status:'waiting_daily_reset',profileIds:['profile'],createdAt:'2026-10-16T08:00:00Z',kind:'warm',live:false};
 await page.setRequestInterception(true);
 page.on('request',r=>{
  const u=new URL(r.url());let data;
  if(u.pathname==='/api/auth/me')data={user:{role:'admin',email:'admin@linkedvelocity.com'}};
  if(u.pathname==='/api/admin/profile-maturing')data={accounts:[account,fresh,rented],campaigns:[campaign],updatedAt:new Date().toISOString()};
  if(u.pathname==='/api/admin/profile-maturing/campaign')data={...campaign,counts:{sent:7,pending:10},logs:[{line:'Daily batch complete',t:Date.now()}],resumeAt:'2026-10-17T07:00:00Z'};
  if(u.pathname.endsWith('/campaign/results'))data={rows:[{id:'recipient',name:'Recipient One',url:'https://www.linkedin.com/in/recipient',status:'sent',plannedDate:'2026-10-16',plannedDay:'1',acceptance:{label:'Accepted'}}],total:1};
  if(u.pathname.includes('/desktop/profiles')){const a=u.searchParams.get('profileId')==='new-profile'?fresh:account;data=[{id:a.gologinProfileId,name:a.loginEmail,account:'linkedvelocity',available:true}];}
  if(u.pathname.includes('/desktop/mature/lv-identities'))data={accounts:[account,fresh]};
  if(u.pathname.includes('/desktop/mature/cold-source'))data={url:'https://docs.google.com/spreadsheets/d/example/edit'};
  if(u.pathname.includes('/desktop/mature/warm-pool'))data={ready:50,total:50};
  if(u.pathname.startsWith('/api/admin/profile-maturing')&&r.method()==='POST'){posts++;launch=JSON.parse(r.postData());data={ok:true,ids:['created']};}
  if(u.pathname==='/api/admin/profile-maturing/created')data={...campaign,id:'created',name:fresh.loginEmail,profileIds:['new-profile'],status:'queued'};
  if(u.pathname.endsWith('/created/results'))data={rows:[],total:0};
  if(data!==undefined)return r.respond({status:200,contentType:'application/json',body:JSON.stringify(data)});
  r.continue();
 });
 try{
  await page.goto('http://127.0.0.1:3127/admin/profile-maturing',{waitUntil:'networkidle0',timeout:120000});
  await page.waitForFunction(()=>document.body.innerText.includes('test@example.com'));
  assert.match(await page.$eval('.maturing-row',e=>e.innerText),/Sleeping/i);
  await page.click('.maturing-row .maturing-open');await page.waitForFunction(()=>document.body.innerText.includes('Recipient One'));
  await page.screenshot({path:'/private/tmp/lv-maturing-board.png',fullPage:true});
  const buttons=await page.$$('button');for(const b of buttons){if((await b.evaluate(e=>e.textContent))==='Create replacement plan'){await b.click();break;}}
  await page.waitForSelector('#mature-warm-section');await page.waitForFunction(()=>document.querySelector('#mature-plan-editor')?.innerText.includes('test@example.com'));
  await page.screenshot({path:'/private/tmp/lv-maturing-editor.png',fullPage:true});
  assert.match(await page.$eval('#mature-plan-editor',e=>e.innerText),/Default moderate warming/);
  assert.equal(posts,0,'Opening and editing must not launch campaigns');assert.deepEqual(errors,[]);
  await page.setViewport({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Page should fit mobile width');
  await page.setViewport({width:1440,height:1100});
  await page.click('.maturing-heading .maturing-open');
  await page.waitForSelector('.maturing-picker');
  assert.doesNotMatch(await page.$eval('.maturing-picker',e=>e.innerText),/rented@example.com/);
  assert.match(await page.$eval('.maturing-picker',e=>e.innerText),/View campaign/i);
  await page.type('[aria-label="Find account to mature"]','new@example.com');
  await page.click('.maturing-picker-row button');
  await page.waitForFunction(()=>document.querySelector('#mature-plan-editor')?.innerText.includes('new@example.com'));
  await page.select('#mature-warm-pool','linkedvelocity_owned');
  assert.equal(posts,0,'Choosing an account and configuring it must not launch');
  const startButtons=await page.$$('button');for(const b of startButtons){if((await b.evaluate(e=>e.textContent))==='Start campaign'){await b.click();break;}}
  await page.waitForFunction(()=>document.querySelector('[role="status"].maturing-notice')?.innerText.includes('new@example.com'));
  assert.equal(posts,1);assert.equal(launch.accountId,'new-account');assert.deepEqual(launch.plan.targetProfileIds,['new-profile']);assert.equal(launch.plan.warmPool,'linkedvelocity_owned');assert.ok(launch.launchId);
  assert.deepEqual(errors,[]);
  console.log('PASS: board, workbook, original editor, new account selection, eligibility, explicit single launch, mobile layout, no browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
