// 実行: node tests/kabu-shinkoku-browser.mjs
// インストール済みPlaywrightを使い、PC/スマホ・ライト/ダークの操作確認。
// 作業フォルダ専用のサーバーを空きポートに起動。外部通信は遮断する。
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let pw;try{pw=require('playwright')}catch{pw=require(process.env.APPDATA+'/npm/node_modules/playwright')}
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.xml':'application/xml'};
const server=createServer(async(req,res)=>{
  try{
    let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(p.endsWith('/'))p+='index.html';
    const file=resolve(root,'.'+p);
    if(!file.startsWith(root+sep)&&!file.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403);res.end();return}
    const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(data);
  }catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(resolve(root,'404.html')))}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
let browser;
let checks=0;
const ok=(condition,message)=>{assert.ok(condition,message);checks++};
const {loadCore}=await import('./load-core.mjs');
const C=loadCore(resolve(root,'kabu-shinkoku/index.html'));
const paths=[];
function walk(id='Q1',path=[]){if(C.results[id]){paths.push({id,path});return}C.flow[id].options.forEach((o,i)=>walk(o[1],[...path,i]))}walk();
try{
 browser=await pw.chromium.launch();
 await mkdir(resolve(root,'output/playwright'),{recursive:true});
 for(const viewport of [{width:1366,height:768},{width:390,height:844}])for(const colorScheme of ['light','dark']){
  const ctx=await browser.newContext({viewport,colorScheme,isMobile:viewport.width===390,hasTouch:viewport.width===390});await ctx.route(u=>!u.href.startsWith(base),r=>r.abort());
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const response=await page.goto(base+'/kabu-shinkoku/');await page.evaluate(()=>document.fonts.ready);
  ok(response.status()===200,'専用ローカルサーバー');
  ok(await page.locator('#ks-question').innerText()===C.flow.Q1.question,'最初の質問');
  ok(await page.locator('input,#mini,script[src*="tour.js"],.tbub,.ks-progress li').count()===0,'旧フォーム・帯・点なし');
  async function layout(){
   const r=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,small:[...document.querySelectorAll('#ks-tool button,#ks-refs a')].filter(e=>{const r=e.getBoundingClientRect();return r.height>0&&r.height<43.5}).map(e=>e.textContent)}));
   ok(r.overflow<=1,'横はみ出しなし');ok(!r.small.length,'44px以上 '+r.small.join(','));
  }
  async function result(path,e={}){
   const r=C.resolve(path,e);
   ok(await page.locator('#ks-answer').innerText()===(r.title||C.labels[r.kind]),'最終回答');
   ok(await page.locator('#ks-reason').innerText()===r.reason,'理由');
   ok(await page.locator('#ks-progress').isHidden(),'結果では残り問数なし');
   const style=await page.locator('#ks-answer').evaluate(e=>{const s=getComputedStyle(e);return {size:parseFloat(s.fontSize),weight:Number(s.fontWeight),outline:s.outlineStyle}});
   ok(style.size>=28&&style.size<=32&&style.weight>=700,'答え28〜32px太字');ok(style.outline==='none','見出しフォーカス枠なし');
   {const want=colorScheme==='dark'?'rgb(48, 39, 15)':'rgb(254, 243, 199)';let bg='';for(let i=0;i<20;i++){bg=await page.locator('#ks-result').evaluate(e=>getComputedStyle(e).backgroundColor);if(bg===want)break;await page.waitForTimeout(100)}ok(bg===want,'テーマ色の薄い面・ダーク対応')}
   ok(await page.locator('#ks-restart').evaluate(e=>e.previousElementSibling.id==='ks-result'),'答えのすぐ下にやり直す');
   ok((await page.locator('#ks-next').count()>0)===(r.kind!=='none'||r.resident),'次の行動の有無');
   if(r.kind!=='none'){ok((await page.locator('#ks-next').innerText()).includes('2027年2月16日〜3月15日'),'申告期間');ok(await page.locator('#ks-next a').getAttribute('href')==='https://www.keisan.nta.go.jp/','作成コーナー')}
   if(r.resident)ok((await page.locator('#ks-next').innerText()).includes('お住まいの市区町村の窓口へ'),'住民税の窓口');
   ok((await page.locator('#ks-notes').innerText()).includes('住民税')===r.resident,'住民税注記');
   ok((await page.locator('#ks-refs').innerText()).includes('確認日 2026-11-10'),'確認日');
   ok(await page.locator('#ks-refs a').count()>=1&&await page.locator('#ks-refs a').count()<=2,'根拠リンク');await layout();
  }
  async function clickPath(path){for(let n=0;n<path.length;n++){
   const node=C.flow[C.destination(path.slice(0,n))];
   ok(await page.locator('#ks-progress').innerText()==='あと'+C.remaining(C.destination(path.slice(0,n)))+'問','最長経路の残り問数');
   if(n){ok(await page.locator('#ks-back').evaluate(e=>e.parentElement.id==='ks-card'&&e===e.parentElement.firstElementChild),'戻るはカード左上');await page.locator('#ks-back').click();await page.locator('.ks-answer').nth(path[n-1]).click()}
   if(node.hint)ok((await page.locator('#ks-card').innerText()).includes(node.hint),'質問下の補足・回答要約');
   if(C.destination(path.slice(0,n))==='Q5')ok(await page.locator('#ks-question').evaluate(e=>e.previousElementSibling.classList.contains('ks-summary')),'回答要約は合計の質問より上');
   await page.locator('.ks-answer').nth(path[n]).click();ok(await page.locator('#ks-card h2').evaluate(e=>e===document.activeElement),'次の見出しにフォーカス');await layout();
  }}
  await page.screenshot({path:resolve(root,'output/playwright/kabu-'+viewport.width+'-'+colorScheme+'-question.png')});
  for(const {path} of paths){await clickPath(path);await result(path);await page.locator('#ks-restart').click();ok(await page.locator('#ks-question').innerText()===C.flow.Q1.question,'やり直す');ok(await page.locator('#ks-back').isHidden(),'初回は戻るなし')}
  for(const id of ['A','B','C','D','E']){
   const path=paths.find(p=>p.id===id).path;await clickPath(path);
   const extra=key=>page.locator('[data-extra='+key+']');
   await extra('planned').click();await result(path,{planned:true});await extra('planned').click();
   await extra('highSalary').click();await extra('carried').click();await extra('dividend').click();
   await result(path,{highSalary:true,carried:true,dividend:true});
   ok((await page.locator('#ks-notes').innerText()).includes('総合課税にすると税金が減る場合'),'必要でも配当説明');
   ok(await extra('dividend').getAttribute('aria-pressed')==='true','押した状態');
   ok(await extra('dividend').evaluate(e=>getComputedStyle(e,'::before').content.includes('✓')),'チェック印');
   await extra('dividend').click();await extra('carried').click();await extra('highSalary').click();await extra('dividend').click();
   if(id==='E'){await result(path,{dividend:true});ok((await page.locator('#ks-notes').innerText()).includes('別の口座の配当があれば'),'損失の配当説明')}
   else if(id==='D')await result(path,{dividend:true});
   else{
    ok(await page.locator('#ks-question').innerText()==='年収はだいたい1,120万円以下?','配当の追加質問');
    ok((await page.locator('#ks-card').innerText()).includes('独身・社会保険料15%の目安'),'質問時に目安を表示');
    ok(await page.locator('#ks-progress').innerText()==='あと1問','配当残り1問');
    await page.locator('#ks-back').click();ok(await extra('dividend').getAttribute('aria-pressed')==='false','配当から戻る');
    await extra('dividend').click();await page.locator('.ks-answer').nth(1).click();await result(path,{dividend:true,dividendLow:false});
    await extra('dividend').click();await extra('dividend').click();await page.locator('.ks-answer').nth(0).click();await result(path,{dividend:true,dividendLow:true});
   }
   await page.emulateMedia({reducedMotion:'reduce'});await extra('dividend').click();
   ok(await page.locator('#ks-result').evaluate(e=>getComputedStyle(e).animationName==='none'),'動きを減らす設定で点滅なし');
   await page.emulateMedia({reducedMotion:'no-preference'});await extra('carried').click();
   ok(await page.locator('#ks-result').evaluate(e=>getComputedStyle(e).animationName==='ks-flash'),'更新を色で示す');
   await page.locator('#ks-restart').click();
  }
  // 見出しへフォーカスした後、TabとEnter/Spaceで最長経路を操作。
  const keyboardPath=[2,1,3,1,1,1,0];
  for(let n=0;n<keyboardPath.length;n++){
   for(let i=0;i<=keyboardPath[n];i++)await page.keyboard.press('Tab');
   ok(await page.locator('.ks-answer').nth(keyboardPath[n]).evaluate(e=>e===document.activeElement),'Tabで選択肢へ');
   await page.keyboard.press(n%2?'Space':'Enter');
  }
  await result(keyboardPath);
  await page.screenshot({path:resolve(root,'output/playwright/kabu-'+viewport.width+'-'+colorScheme+'-result.png')});
  await page.evaluate(()=>{for(const d of document.querySelectorAll('details'))d.open=true});await layout();
  ok(await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].every(a=>!!document.getElementById(a.hash.slice(1)))),'ページ内リンク');
  ok(errors.length===0,'実行エラーなし '+errors.join(','));await ctx.close();
 }
 ok((await fetch(base+'/no-such-kabu-page/')).status===404,'404');
 console.log('ブラウザ点検 '+checks+'件成功。画像 output/playwright/');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
