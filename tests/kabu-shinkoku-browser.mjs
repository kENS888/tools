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
  const ctx=await browser.newContext({viewport,colorScheme});await ctx.route(u=>!u.href.startsWith(base),r=>r.abort());
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const response=await page.goto(base+'/kabu-shinkoku/');await page.evaluate(()=>document.fonts.ready);
  ok(response.status()===200,'専用ローカルサーバー');
  ok(await page.locator('#ks-question').innerText()===C.flow.Q1.question,'最初の質問');
  ok(await page.locator('input,#mini,script[src*="tour.js"],.tbub').count()===0,'金額欄・帯・ツアーなし');
  await page.screenshot({path:resolve(root,'output/playwright/kabu-'+viewport.width+'-'+colorScheme+'-question.png')});
  async function layout(){
   const r=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,small:[...document.querySelectorAll('#ks-tool button,#ks-refs a')].filter(e=>{const r=e.getBoundingClientRect();return r.height>0&&r.height<43.5}).map(e=>e.textContent),answers:[...document.querySelectorAll('.ks-answer')].every(e=>e.getBoundingClientRect().height>=56),points:document.querySelectorAll('.ks-progress li').length}));
   ok(r.overflow<=1,'横はみ出しなし');ok(!r.small.length,'44px以上 '+r.small.join(','));ok(r.answers,'回答56px以上');ok(r.points<=5,'点は最大5つ');
  }
  async function clickPath(path){for(const i of path){await page.locator('.ks-answer').nth(i).click();ok(await page.locator('#ks-card h2').evaluate(e=>e===document.activeElement),'次の見出しにフォーカス');await layout();ok(await page.locator('#ks-card h2').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}),'質問・結果見出しが画面内')}}
  for(const {id,path} of paths){
   await clickPath(path);ok(await page.locator('#ks-answer').innerText()===C.labels[C.results[id].kind],'ボタンだけで結果 '+id);
   ok(await page.locator('#ks-reason').innerText()===C.results[id].reason,'理由 '+id);
   ok(await page.locator('#ks-refs a').count()>=1&&await page.locator('#ks-refs a').count()<=2,'出典1〜2個');
   await page.locator('#ks-back').click();ok(await page.locator('#ks-question').innerText()===C.flow[C.destination(path.slice(0,-1))].question,'もどる');
   await page.locator('.ks-answer').nth(path.at(-1)).click();await page.locator('#ks-restart').click();
   ok(await page.locator('#ks-question').innerText()===C.flow.Q1.question,'やり直す');ok(await page.locator('#ks-back').isHidden(),'最初はもどる非表示');
  }
  for(const id of ['A','B','C','D','E']){
   await clickPath(paths.find(p=>p.id===id).path);
   const extra=key=>page.locator('[data-extra='+key+']');
   await extra('highSalary').click();ok(await page.locator('#ks-answer').innerText()===C.labels.need,'年収条件で必要');
   await extra('carried').click();ok(await page.locator('#ks-answer').innerText()===C.labels.need,'繰越でも必要を維持');
   await extra('dividend').click();ok(await page.locator('#ks-question').count()===0,'必要で配当年収を聞かない');
   await extra('dividend').click();await extra('carried').click();await extra('highSalary').click();
   ok(await page.locator('#ks-answer').innerText()===C.labels[C.results[id].kind],'追加条件オフで元へ');
   await extra('planned').click();ok(await page.locator('#ks-answer').innerText()===C.labels[id==='C'?'need':C.results[id].kind],'医療費条件');
   if(['A','B'].includes(id))ok((await page.locator('#ks-notes').innerText()).includes('申告に含めなくてよい'),'申告不要制度を維持');
   await extra('planned').click();
   await extra('dividend').click();
   if(['A','B','C'].includes(id)){
    ok(await page.locator('#ks-question').innerText()==='年収はだいたい 1120万円以下?','配当の追加1問');
    await page.locator('#ks-back').click();ok(await extra('dividend').getAttribute('aria-pressed')==='false','配当質問から戻る');
    await extra('dividend').click();await page.locator('.ks-answer').nth(1).click();ok(await page.locator('#ks-answer').innerText()===C.labels.none,'年収いいえ');
    await extra('dividend').click();await extra('dividend').click();await page.locator('.ks-answer').nth(0).click();
    ok(await page.locator('#ks-answer').innerText()===C.labels.better,'年収はい');ok((await page.locator('#ks-notes').innerText()).includes('独身・社会保険料15%'),'目安の条件');
   }else ok(await page.locator('#ks-question').count()===0,'D/Eでは配当質問なし');
   await layout();await extra('dividend').click();ok(await page.locator('#ks-answer').innerText()===C.labels[C.results[id].kind],'配当解除');
   await page.locator('#ks-restart').click();
  }
  // Q1→H1→Q2→H2→Q3b→Q4→Q5→C を Tab/Enter/Space だけで操作。
  const keyboardPath=[2,1,3,1,0,1,0];
  for(let n=0;n<keyboardPath.length;n++){
   for(let i=0;i<=keyboardPath[n];i++)await page.keyboard.press('Tab');
   ok(await page.locator('.ks-answer').nth(keyboardPath[n]).evaluate(e=>e===document.activeElement),'Tabで選択肢へ');
   await page.keyboard.press(n%2?'Space':'Enter');ok(await page.locator('#ks-card h2').evaluate(e=>e===document.activeElement),'キーボードで次の見出しへ');
  }
  ok(await page.locator('#ks-answer').innerText()===C.labels.none,'キーボードだけで結果');
  await page.screenshot({path:resolve(root,'output/playwright/kabu-'+viewport.width+'-'+colorScheme+'-result.png')});
  await page.evaluate(()=>{for(const d of document.querySelectorAll('details'))d.open=true});await layout();
  ok(await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].every(a=>!!document.getElementById(a.hash.slice(1)))),'ページ内リンク');
  ok(errors.length===0,'実行エラーなし '+errors.join(','));await ctx.close();
 }
 ok((await fetch(base+'/no-such-kabu-page/')).status===404,'404');
 console.log('ブラウザ点検 '+checks+'件成功。画像 output/playwright/');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
