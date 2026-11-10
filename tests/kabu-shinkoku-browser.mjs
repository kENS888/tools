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
try{
 browser=await pw.chromium.launch();
 await mkdir(resolve(root,'output/playwright'),{recursive:true});
 for(const viewport of [{width:1366,height:768},{width:390,height:844}])for(const colorScheme of ['light','dark']){
  const ctx=await browser.newContext({viewport,colorScheme,isMobile:viewport.width===390,hasTouch:viewport.width===390});await ctx.route(u=>!u.href.startsWith(base),r=>r.abort());
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const response=await page.goto(base+'/kabu-shinkoku/');await page.evaluate(()=>document.fonts.ready);
  ok(response.status()===200,'専用ローカルサーバー');
  const toggle=k=>page.locator('[data-income='+k+']'),extra=k=>page.locator('[data-extra='+k+']');
  async function layout(){
   const r=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,small:[...document.querySelectorAll('#ks-tool button,#ks-refs a')].filter(e=>{const r=e.getBoundingClientRect();return r.height>0&&r.height<(e.dataset.income?55.5:43.5)}).map(e=>e.textContent)}));
   ok(r.overflow<=1,'横はみ出しなし');ok(!r.small.length,'ボタンの大きさ '+r.small.join(','));
  }
  async function initial(){
   ok(await page.locator('#ks-question').innerText()==='給料のほかに、お金が入ってくるものは?','チェック画面');
   ok(await page.locator('#ks-progress').isHidden(),'初期は残り問数なし');ok(await page.locator('#ks-next-button').isDisabled(),'未選択は次へ無効');
   ok(await page.locator('[data-income]').count()===5,'5つの収入');await layout();
  }
  async function start(mask){for(let i=0;i<5;i++)if(mask&(1<<i))await toggle(C.incomes[i][0]).click();await page.locator('#ks-next-button').click()}
  async function answers(path){for(let n=1;n<path.length;n++){
   const prefix=path.slice(0,n),node=C.question(prefix);
   ok(await page.locator('#ks-question').innerText()===node.question,'選んだ収入の質問だけ');
   ok(await page.locator('#ks-progress').innerText()==='あと'+C.remaining(prefix)+'問','最長の残り問数');
   if(node.summary){ok(await page.locator('#ks-question').evaluate(e=>e.previousElementSibling.classList.contains('ks-summary')),'回答要約は質問の上');ok(await page.locator('.ks-summary').innerText()===node.summary,'合計する黒字だけを要約')}
   if(node.hint)ok(await page.locator('#ks-card .ks-hint').innerText()===node.hint,'補足');
   await layout();await page.locator('.ks-answer').nth(path[n]).click();
   ok(await page.locator('#ks-card h2').evaluate(e=>e===document.activeElement),'見出しへフォーカス');
  }}
  async function result(path,e={}){
   const r=C.resolve(path,e);ok(await page.locator('#ks-answer').innerText()===(r.title||C.labels[r.kind]),'結果');ok(await page.locator('#ks-reason').innerText()===r.reason,'理由');
   ok(await page.locator('#ks-progress').isHidden(),'結果は残りなし');
   const style=await page.locator('#ks-answer').evaluate(e=>{const s=getComputedStyle(e);return {size:parseFloat(s.fontSize),weight:Number(s.fontWeight)}});ok(style.size>=28&&style.size<=32&&style.weight>=700,'大きな答え');
   const want=colorScheme==='dark'?'rgb(48, 39, 15)':'rgb(254, 243, 199)';let bg='';for(let i=0;i<20;i++){bg=await page.locator('#ks-result').evaluate(e=>getComputedStyle(e).backgroundColor);if(bg===want)break;await page.waitForTimeout(100)}ok(bg===want,'答えの面・ダーク');
   ok(await page.locator('#ks-restart').evaluate(e=>e.previousElementSibling.id==='ks-result'),'答えの下のやり直す');
   ok((await page.locator('#ks-notes').innerText()).includes('住民税')===r.notes.some(n=>n.includes('住民税')),'住民税条件');
   ok(await page.locator('#ks-next a[href="/furusato/"]').count()===(r.oneStop?1:0),'ワンストップと内部リンク');
   if(r.oneStop)ok((await page.locator('#ks-next').innerText()).includes('寄附も申告書に書いてください'),'寄附を再記載');
   ok((await page.locator('#ks-refs').innerText()).includes('確認日 2026-11-10'),'確認日');await layout();
  }
  await initial();await toggle('crypto').click();ok(await toggle('crypto').getAttribute('aria-pressed')==='true','トグル選択');ok(await toggle('crypto').evaluate(e=>getComputedStyle(e,'::after').content.includes('✓')),'チェック印');
  await toggle('crypto').click();ok(await page.locator('#ks-next-button').isDisabled(),'選択解除で次へ無効');
  await page.getByRole('button',{name:'どれもない(給料だけ)',exact:true}).click();await result([0]);
  await extra('planned').click();await result([0],{planned:true});await page.locator('#ks-restart').click();
  const cases=[[4,3],[4,1],[5,1,1,1,2,1],[8,1],[3,1,0,0,1],[31,0,0,1,2,1,0]];
  for(const path of cases){
   await initial();await start(path[0]);
   // 最初の問からチェック画面へ戻っても、チェックが残る。
   await page.locator('#ks-back').click();for(let i=0;i<5;i++)ok(await toggle(C.incomes[i][0]).getAttribute('aria-pressed')===String(!!(path[0]&(1<<i))),'戻るで選択保持');
   await page.locator('#ks-next-button').click();await answers(path);await result(path);
   await extra('highSalary').click();await result(path,{highSalary:true});await extra('highSalary').click();
   await extra('planned').click();await result(path,{planned:true});await extra('planned').click();
   await extra('carried').click();await result(path,{carried:true});await extra('carried').click();
   await extra('dividend').click();
   if(C.resolve(path).kind!=='need'&&!C.context(path).stockLoss){
    ok(await page.locator('#ks-question').innerText()==='年収はだいたい1,120万円以下?','配当の既存質問');
    await page.locator('#ks-back').click();ok(await extra('dividend').getAttribute('aria-pressed')==='false','配当質問から戻る');
    await extra('dividend').click();await page.locator('.ks-answer').nth(0).click();await result(path,{dividend:true,dividendLow:true});
   }else await result(path,{dividend:true});
   await page.locator('#ks-restart').click();
  }
  // キーボードだけで暗号資産の選択・解除・選択、次へ、損、やり直し。
  await page.locator('#ks-question').focus();for(let i=0;i<3;i++)await page.keyboard.press('Tab');
  ok(await toggle('crypto').evaluate(e=>e===document.activeElement),'Tabで暗号資産');await page.keyboard.press('Space');await page.keyboard.press('Enter');ok(await toggle('crypto').getAttribute('aria-pressed')==='false','キーボードで解除');await page.keyboard.press('Space');
  for(let i=0;i<3;i++)await page.keyboard.press('Tab');ok(await page.locator('#ks-next-button').evaluate(e=>e===document.activeElement),'Tabで次へ');await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Space');await result([4,1]);
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');await initial();
  await page.screenshot({path:resolve(root,'output/playwright/kabu-'+viewport.width+'-'+colorScheme+'-check.png')});
  await start(5);await answers([5,1,1,1,2,1]);await page.screenshot({path:resolve(root,'output/playwright/kabu-'+viewport.width+'-'+colorScheme+'-result.png')});
  await page.evaluate(()=>{for(const d of document.querySelectorAll('details'))d.open=true});await layout();
  ok(await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].every(a=>!!document.getElementById(a.hash.slice(1)))),'ページ内リンク');ok(errors.length===0,'実行エラーなし '+errors.join(','));await ctx.close();
 }
 ok((await fetch(base+'/no-such-kabu-page/')).status===404,'404');console.log('ブラウザ点検 '+checks+'件成功。画像 output/playwright/');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
