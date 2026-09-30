const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:1080,height:1200},deviceScaleFactor:2});
await p.goto('file://'+process.cwd()+'/notice.html');await p.waitForLoadState('networkidle');await p.evaluate(()=>document.fonts.ready);
await p.screenshot({path:'notice.png',fullPage:true});await b.close()})();
