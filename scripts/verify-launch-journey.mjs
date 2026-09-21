import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.VERIFY_BASE_URL||'http://127.0.0.1:3047';
const mailbox=process.env.VERIFY_MAILBOX_URL||'http://127.0.0.1:8026';
for(const url of [base,mailbox]) assert(['127.0.0.1','localhost'].includes(new URL(url).hostname),'Local verification only');
assert.equal(process.env.LOCAL_EMAIL,'true','Require local email delivery');
assert(!process.env.STRIPE_SECRET_KEY && !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,'Stripe must be disabled');
const directory='.local/launch'; await fs.mkdir(directory,{recursive:true,mode:0o700});
const report={startedAt:new Date().toISOString(),checks:[],errors:[],limitations:['No real Stripe payments exercised','Synthetic photo fixture tests upload plumbing only']};
const check=(name,details)=>{report.checks.push({name,passed:true,details});console.log('PASS '+name)};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,timeout:120000});
let lastPage;
async function pageFor(){const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>report.errors.push(e.message));await page.route('**/api/stripe/**',r=>r.abort());lastPage=page;return page}
// Server-rendered markup answers clicks with nothing until React attaches its
// handlers, so interacting before hydration silently drops the interaction and
// looks exactly like a broken feature.
const hydrated=page=>page.waitForFunction(()=>Object.keys(document.body).some(key=>key.startsWith('__react')),null,{timeout:120000});
const consented=new WeakSet();let consentChecked=false;
// A first-time visitor must answer the privacy banner before it stops covering
// the bottom of the page, so the journey answers it exactly like a real user.
async function dismissConsent(page){if(consented.has(page))return;consented.add(page);const button=page.getByRole('button',{name:'Essential only',exact:true});
 // The banner mounts one frame after hydration, so a plain count() races it and
 // leaves it free to intercept clicks later in the journey.
 await button.waitFor({state:'visible',timeout:30000}).catch(()=>{});if(!await button.isVisible().catch(()=>false))return;
 await button.click();await button.waitFor({state:'hidden'});if(!consentChecked){consentChecked=true;check('Privacy banner accepts a choice and hides')}}
async function visit(page,path){lastPage=page;const res=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:120000});assert(res.status()<400,`HTTP ${res.status()} ${path}`);await page.locator('h1').first().waitFor();await hydrated(page);await dismissConsent(page)}
async function login(page,email,next='/dashboard'){
 await visit(page,`/signin?next=${encodeURIComponent(next)}`);await page.getByLabel('Email address').fill(email);await page.getByRole('button',{name:'Email me a secure link'}).click();await page.waitForURL('**/signin?sent=1');
 let message;for(let i=0;i<20&&!message;i++){const inbox=await fetch(mailbox+'/api/v1/messages?limit=100').then(r=>r.json());message=inbox.messages.find(m=>m.Subject==='Your secure VeroTask sign-in link'&&m.To.some(to=>to.Address===email));if(!message)await new Promise(r=>setTimeout(r,500))}
 assert(message,'Local magic link delivered');const body=await fetch(mailbox+'/api/v1/message/'+message.ID).then(r=>r.json());const link=body.HTML.match(/https?:\/\/[^"\s<>]+\/api\/auth\/verify\?token=[a-f0-9]+/)?.[0];assert(link);assert.equal(new URL(link).origin,new URL(base).origin);await page.goto(link,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForURL('**'+next);await hydrated(page);check('Magic-link registration '+(email.startsWith('pro')?'PRO':'customer'));return link;
}
try{
 const anonymous=await pageFor();
 for(const [prefix,lang] of (process.env.VERIFY_SKIP_PUBLIC ? [] : [['','en-US'],['/pt-br','pt-BR'],['/es','es-US']])){
  for(const path of ['', '/services','/how-it-works','/providers']){
   await visit(anonymous,prefix+path);const metadata=await anonymous.evaluate(()=>({lang:document.documentElement.lang,canonical:document.querySelector('link[rel=canonical]')?.href,alternates:[...document.querySelectorAll('link[rel=alternate][hreflang]')].map(n=>({lang:n.hreflang,href:n.href})),overflow:document.documentElement.scrollWidth>innerWidth}));assert.equal(metadata.lang.toLowerCase(),lang.toLowerCase());assert(metadata.canonical?.endsWith(prefix+path||'/'));assert(!metadata.overflow,'Desktop overflow');check('Public '+(prefix+path||'/'),metadata);
  }
  await anonymous.setViewportSize({width:390,height:844});await visit(anonymous,prefix||'/');assert(await anonymous.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow');await anonymous.screenshot({path:`${directory}/home-${lang}-mobile.png`,fullPage:true,timeout:120000});check('Mobile no overflow '+lang);await anonymous.setViewportSize({width:1280,height:900});
 }
 await visit(anonymous,'/dashboard');assert.equal(new URL(anonymous.url()).pathname,'/signin');check('Anonymous dashboard redirects to signin');
 const previous=process.env.VERIFY_RESUME ? JSON.parse(await fs.readFile(directory+'/fixtures.json','utf8')) : null;const suffix=Date.now();const customerEmail=previous?.customerEmail||`customer-${suffix}@verotask.invalid`,providerEmail=previous?.providerEmail||`pro-${suffix}@verotask.invalid`;
 const customer=await pageFor();const link=await login(customer,customerEmail);await anonymous.goto(link,{waitUntil:'domcontentloaded',timeout:120000});assert.equal(new URL(anonymous.url()).pathname,'/signin');check('Magic link replay rejected');
 const provider=await pageFor();await login(provider,providerEmail,'/providers/join');
 if(!previous){await provider.getByLabel('Business or professional name').fill('Launch QA Professional '+suffix);await provider.getByLabel('Phone',{exact:true}).fill('407-555-0101');await provider.getByLabel('ZIP code',{exact:true}).fill('32801');await provider.getByLabel('Primary city').fill('Orlando');await provider.getByLabel('Primary service').selectOption('furniture-assembly');await provider.getByLabel('Private service base address').fill('400 S Orange Ave');await provider.getByLabel('What kind of work do you do?').fill('Isolated launch verification fixture for furniture assembly. This is not a real service provider.');await provider.getByRole('button',{name:'Create provider profile'}).click();await provider.waitForURL('**/onboarding');await hydrated(provider);
 }const businessId=previous?.businessId||new URL(provider.url()).pathname.split('/')[3];report.fixtures={businessId,customerEmail,providerEmail};await fs.writeFile(directory+'/fixtures.json',JSON.stringify(report.fixtures,null,2),{mode:0o600});check(previous?'Existing isolated PRO fixture resumed':'PRO profile created from UI');
 if(!previous){const fixture=await provider.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=600;canvas.height=600;const ctx=canvas.getContext('2d');ctx.fillStyle='#d1fae5';ctx.fillRect(0,0,200,200);ctx.fillStyle='#064e3b';ctx.font='24px sans-serif';for(let i=0;i<12000;i++){ctx.fillStyle=`rgb(${i%255},${(i*17)%255},${(i*37)%255})`;ctx.fillRect((i*37)%600,(i*53)%600,3,3)}ctx.fillStyle='#000';ctx.fillText('TEST FIXTURE',12,100);return canvas.toDataURL('image/png').split(',')[1]});
 await provider.getByRole('checkbox').check();const uploaded=provider.waitForResponse(r=>r.url().endsWith(`/api/providers/${businessId}/photo`)&&r.request().method()==='POST');await provider.locator('input[type=file]').setInputFiles({name:'isolated-test.png',mimeType:'image/png',buffer:Buffer.from(fixture,'base64')});assert((await uploaded).ok());await provider.waitForLoadState('domcontentloaded');check('PRO photo upload from UI (synthetic fixture)');}
 await visit(provider,`/dashboard/providers/${businessId}/services`);await provider.locator('[name=categoryId]').selectOption({label:'Furniture Assembly'});await provider.locator('[name=name]').fill('QA furniture assembly');await provider.locator('textarea[name=description]').fill('Assembly of one flat-pack desk with packaging cleanup.');await provider.locator('[name=price]').fill('125');await provider.locator('[name=durationMinutes]').fill('90');await provider.getByRole('button',{name:'Add service',exact:true}).click();await provider.getByText('Service created successfully.').waitFor();check('Service description price duration saved');
 await visit(provider,`/dashboard/providers/${businessId}/availability`);for(let day=0;day<7;day++)await provider.locator(`[name="active-${day}"]`).check();await provider.getByRole('button',{name:'Save working hours'}).click();await provider.getByText('Availability saved.').waitFor();check('Weekly availability saved');
 await visit(customer,`/dashboard/providers/${businessId}/services`);assert.equal(new URL(customer.url()).pathname,'/dashboard');check('Customer cannot manage PRO services');
 const publicPath=`/providers/pro-${businessId}`;await visit(customer,publicPath);assert(await customer.getByText('QA furniture assembly',{exact:true}).isVisible());assert(await customer.getByText('Assembly of one flat-pack desk with packaging cleanup.',{exact:true}).isVisible());assert(await customer.getByText('90 min',{exact:false}).isVisible());await customer.screenshot({path:directory+'/provider-public.png',fullPage:true});check('Public service catalog displays description price duration');
 const firstTimeVisitor=await pageFor();await firstTimeVisitor.setViewportSize({width:390,height:844});
 await firstTimeVisitor.goto(base+publicPath,{waitUntil:'domcontentloaded',timeout:120000});
 await firstTimeVisitor.getByRole('button',{name:'Essential only',exact:true}).waitFor({state:'visible',timeout:30000});
 // The banner is fixed to the bottom until answered, so the end of the page has
 // to stay reachable underneath it instead of being permanently covered.
 const bottomReachable=await firstTimeVisitor.evaluate(async()=>{window.scrollTo(0,document.body.scrollHeight);await new Promise(resolve=>setTimeout(resolve,500));const banner=document.querySelector('div.fixed.bottom-3');if(!banner)return 'banner missing';const last=[...document.querySelectorAll('a,button')].filter(node=>!banner.contains(node)&&node.getBoundingClientRect().height>0).at(-1);if(!last)return 'no interactive element';const box=last.getBoundingClientRect();const top=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2);return banner.contains(top)?'covered by the privacy banner':'reachable'});
 assert.equal(bottomReachable,'reachable','Privacy banner must not permanently cover the end of the page');
 check('Page bottom stays reachable on mobile while the privacy banner is open');await firstTimeVisitor.context().close();
 await customer.getByRole('link',{name:'Request quote',exact:true}).click();await hydrated(customer);await customer.locator('[name=task]').fill('Assemble one flat-pack desk');await customer.locator('[name=scheduledLocal]').fill(new Date(Date.now()+7*86400000).toISOString().slice(0,10)+'T10:00');await customer.locator('[name=postalCode]').fill('32801');await customer.locator('[name=serviceAddress]').fill('400 S Orange Ave, Orlando, FL 32801');await customer.locator('[name=details]').fill('Please assemble one new flat-pack desk. All parts and instructions are present, with easy ground-floor access.');await customer.locator('[name=acceptsPolicy]').check();await customer.getByRole('button',{name:'Request a quote',exact:true}).click();await customer.waitForURL('**/bookings/**');const bookingPath=new URL(customer.url()).pathname;report.fixtures.bookingPath=bookingPath;check('Customer quote request submitted');
 await visit(provider,bookingPath);await provider.locator('input[inputmode=decimal]').fill('140');
 // The button label flips to "Sending quote…" the instant it is pressed, so
 // waiting for that label to disappear would pass while the quote is still in
 // flight and let the customer be checked against the not-yet-saved booking.
 const quoteAccepted=provider.waitForResponse(r=>r.url().endsWith(bookingPath+'/accept')&&r.request().method()==='POST');
 await provider.getByRole('button',{name:'Send quote and accept'}).click();
 assert((await quoteAccepted).ok(),'Provider quote accepted by the API');
 await provider.getByText('Review the job and send your price').waitFor({state:'hidden'});check('PRO sends quote and accepts');
 await visit(customer,bookingPath);await customer.getByText('Your professional sent a quote').waitFor();await customer.screenshot({path:directory+'/customer-quote.png',fullPage:true});customer.once('dialog',dialog=>dialog.accept('Isolated verification cancellation'));await customer.getByRole('button',{name:'Cancel request',exact:true}).click();await customer.getByText('Your professional sent a quote').waitFor({state:'hidden'});check('Customer cancels accepted unpaid request');
 await visit(anonymous,bookingPath);assert.equal(new URL(anonymous.url()).pathname,'/signin');check('Anonymous cannot access private booking');assert.equal(report.errors.length,0,'No browser execution errors');
}catch(error){report.failure=String(error.message).replace(/token=[a-f0-9]+/g,'token=[redacted]');console.error(report.failure);if(lastPage)await lastPage.screenshot({path:directory+'/failure.png',fullPage:true,timeout:30000}).catch(()=>{});process.exitCode=1}
finally{await browser.close();await fs.writeFile(directory+'/report.json',JSON.stringify(report,null,2),{mode:0o600})}
