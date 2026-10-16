const puppeteer=require('puppeteer');const assert=require('node:assert/strict');
(async()=>{
 const browser=await puppeteer.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const page=await browser.newPage();await page.setViewport({width:1440,height:1100});
 await page.setCookie({name:'session_token',value:'browser-fixture-only',domain:'127.0.0.1',path:'/'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));let posts=0;
 const account={id:'fixture',gologinProfileId:'profile',name:'Test account',loginEmail:'test@example.com',linkedinUrl:'https://www.linkedin.com/in/test',connections:10,rented:false,restricted:false};
 const campaign={id:'campaign',name:account.loginEmail,status:'waiting_daily_reset',profileIds:['profile'],createdAt:'2026-10-16T08:00:00Z',kind:'warm',live:false};
 await page.setRequestInterception(true);
 page.on('request',r=>{
  const u=new URL(r.url());let data;
  if(u.pathname==='/api/auth/me')data={user:{role:'admin',email:'admin@linkedvelocity.com'}};
  if(u.pathname==='/api/admin/profile-maturing')data={accounts:[account],campaigns:[campaign],updatedAt:new Date().toISOString()};
  if(u.pathname==='/api/admin/profile-maturing/campaign')data={...campaign,counts:{sent:7,pending:10},logs:[{line:'Daily batch complete',t:Date.now()}],resumeAt:'2026-10-17T07:00:00Z'};
  if(u.pathname.endsWith('/campaign/results'))data={rows:[{id:'recipient',name:'Recipient One',url:'https://www.linkedin.com/in/recipient',status:'sent',plannedDate:'2026-10-16',plannedDay:'1',acceptance:{label:'Accepted'}}],total:1};
  if(u.pathname.includes('/desktop/profiles'))data=[{id:'profile',name:account.loginEmail,account:'linkedvelocity',available:true}];
  if(u.pathname.includes('/desktop/mature/lv-identities'))data={accounts:[{...account,restricted:false}]};
  if(u.pathname.includes('/desktop/mature/cold-source'))data={url:'https://docs.google.com/spreadsheets/d/example/edit'};
  if(u.pathname.includes('/desktop/mature/warm-pool'))data={ready:50,total:50};
  if(u.pathname.startsWith('/api/admin/profile-maturing')&&r.method()==='POST'){posts++;data={ok:true};}
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
  console.log('PASS: board, Sleeping status, workbook, original plan editor, no accidental mutations, mobile layout, no browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
