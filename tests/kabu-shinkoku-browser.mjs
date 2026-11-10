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
try{
  browser=await pw.chromium.launch();
  await mkdir(resolve(root,'output/playwright'),{recursive:true});
  const png=await readFile(resolve(root,'assets/og/kabu-shinkoku.png'));
  ok(png.readUInt32BE(16)===1200&&png.readUInt32BE(20)===630,'OGP寸法');
  const links=new Set();
  for(const viewport of [{width:1366,height:768},{width:390,height:844}])for(const colorScheme of ['light','dark']){
    const ctx=await browser.newContext({viewport,colorScheme});await ctx.route(u=>!u.href.startsWith(base),r=>r.abort());
    const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    const response=await page.goto(base+'/kabu-shinkoku/');await page.evaluate(()=>document.fonts.ready);
    ok(response.status()===200,'ローカル専用サーバーから配信');
    ok(await page.locator('#ks-answer').innerText()==='口座を選ぶと、ここに判定が出ます','空入力で判定しない');
    await page.screenshot({path:resolve(root,`output/playwright/kabu-${viewport.width}-${colorScheme}-empty.png`)});
    await page.locator('[data-account=plain]').click();
    ok((await page.locator('#ks-answer').innerText()).includes('入力を直すと判定が出ます'),'利益空欄で0とみなさない');
    ok(await page.locator('#profit-error').isVisible(),'利益の空欄エラーは欄の下');
    ok(await page.locator('#ks-answer').evaluate(e=>getComputedStyle(e).fontSize)==='16px','未判定は小さい文字');
    if(viewport.width===390){
      await page.locator('#profit').fill('150000');await page.locator('#other').fill('30000');
      await page.locator('#ks-options-hint').waitFor({state:'visible'});
      await page.locator('#mini').waitFor({state:'visible'});
      ok(await page.locator('#mini').isVisible(),'390×844・源泉なし・利益150000・ほかの所得30000で帯が出る');
      ok(await page.locator('.ks-chips .ks-chip').evaluateAll(es=>es.every(e=>getComputedStyle(e).whiteSpace==='nowrap'&&e.getBoundingClientRect().height>=44)),'スマホの口座チップは折り返さず高さ44px以上');
      await page.locator('#other').fill('');
    }
    await page.locator('#profit').fill('２００，０００');
    ok(await page.locator('#profit').inputValue()==='200,000','入力中に全角から半角・カンマ');
    ok(await page.locator('#ks-options-hint').isVisible(),'閉じた初期設定への案内');
    await page.locator('#ks-options-hint a').click();
    ok(await page.locator('#ks-options').evaluate(e=>e.open),'案内から条件を開く');
    await page.locator('#ks-options-hint').waitFor({state:'hidden',timeout:2000});ok(await page.locator('#ks-options-hint').isHidden(),'開いた条件の案内は消す');
    for(const id of ['salary','loss','dividend']){await page.locator('#'+id).fill('１２３４５６');ok(await page.locator('#'+id).inputValue()==='123,456',id+'入力中の整形');await page.locator('#'+id).fill('')}
    await page.locator('#ks-options summary').click();
    ok(await page.locator('#ks-answer').innerText()==='申告は不要の見込み','全角20万円');
    ok((await page.locator('#ks-notes').innerText()).includes('ただし住民税の申告は必要'),'住民税注意');
    await page.locator('#profit').fill('200001');
    ok(await page.locator('#ks-answer').innerText()==='申告が必要の見込み','20万1円');
    await page.locator('#profit').fill('-1');ok(await page.locator('#profit').getAttribute('aria-invalid')==='true','負数のエラー');
    ok(await page.locator('#ks-answer').innerText()==='入力を直すと判定が出ます','結果にエラー詳細を重複表示しない');
    await page.locator('#profit').fill('10000000001');ok(await page.locator('#profit-error').innerText()==='0以上100億円以下の整数を入力してください。','100億円超の欄のエラー');
    await page.locator('#profit').fill('180000');await page.locator('#other').fill('30000');
    ok(await page.locator('#ks-breakdown').innerText()==='源泉なし・一般の利益 180,000円＋ほかの所得 30,000円＝210,000円','20万円判定の内訳');
    await page.locator('#profit').fill('150000');await page.locator('#other').fill('50000');
    await page.locator('#ks-options summary').click();await page.locator('#salary').fill('4500000');
    await page.locator('#dividend').fill('100000');ok(await page.locator('#ks-answer').innerText()==='申告した方が得かもしれません','配当の目安');
    await page.locator('#ks-options summary').click();ok((await page.locator('#ks-summary').innerText()).includes('配当'),'閉じた設定に要約');
    await page.locator('#ks-options summary').click();await page.locator('#planned').check();
    ok(await page.locator('#ks-answer').innerText()==='申告が必要の見込み','申告予定の優先順位');
    await page.locator('#planned').uncheck();await page.locator('#dividend').fill('');await page.locator('#salary').fill('');
    await page.locator('[data-account=withheld]').click();await page.locator('#loss').fill('100000');await page.locator('#cross').check();
    ok(await page.locator('#ks-answer').innerText()==='申告した方が得かもしれません','損益通算');
    await page.locator('[data-account=withheld]').click();ok(await page.locator('#ks-loss-wrap').isVisible(),'源泉なしでも損失欄を使える');
    ok(await page.locator('#ks-answer').innerText()==='申告した方が得かもしれません','源泉なしの通算');
    await page.locator('#cross').uncheck();
    ok(await page.locator('#ks-answer').innerText()==='申告は不要の見込み','チェックなしで判定を変えない');
    ok((await page.locator('#ks-notes').innerText()).includes('申告しなければ、その損失は使えなくなります'),'チェックなしでも損失の注記');
    await page.locator('#forward').check();ok(await page.locator('#ks-answer').innerText()==='申告した方が得かもしれません','繰越チェック');
    await page.locator('#forward').uncheck();
    await page.locator('[data-sc=small]').click();await page.waitForFunction(()=>!!document.querySelector('.tbub .tb1'));
    await page.keyboard.press('Escape');ok(await page.locator('#other').inputValue()==='50,000','案内Escで元の入力に戻る');
    await page.locator('[data-sc=small]').click();await page.waitForFunction(()=>!!document.querySelector('.tbub .tb1'));
    for(let i=0;i<2;i++){await page.locator('.tbub .tb1').click();await page.waitForTimeout(120)}
    await page.locator('.tbub [data-r]').click();ok(await page.locator('#other').inputValue()==='50,000','案内最後でも元に戻る');
    await page.locator('#ks-options').evaluate(e=>e.open=true);await page.locator('[data-account=withheld]').click();
    // 年末調整と同じ結果帯の表示条件を、実際の交差状態と照合。
    await page.setViewportSize({width:viewport.width,height:320});
    await page.locator('#ks-options').evaluate(e=>{e.open=true;e.scrollIntoView({block:'start'})});
    await page.waitForFunction(()=>{const m=document.getElementById('mini');return m.textContent&& !m.classList.contains('off')});
    ok(await page.locator('#mini').isVisible(),'条件が見え結果が見えない間に帯が出る');
    const bar=await page.locator('#mini').boundingBox();ok(bar.height<55,'結果帯は1行');
    await page.locator('#ks-result').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.getElementById('mini').classList.contains('off'));
    ok(await page.locator('#mini').isHidden(),'本来の結果で帯を隠す');
    await page.locator('footer').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.getElementById('mini').classList.contains('off'));ok(await page.locator('#mini').isHidden(),'フッターで帯を隠す');
    await page.setViewportSize(viewport);
    const focusIds=['profit','other','salary','loss','cross','forward','carried','dividend','planned'];
    for(const id of focusIds){await page.locator('#'+id).focus();await page.keyboard.press('Tab');const hidden=await page.evaluate(()=>{const e=document.activeElement,r=e.getBoundingClientRect();return r.width===0||r.height===0});ok(!hidden,'Tabで非表示要素に移らない')}
    await page.evaluate(()=>{for(const d of document.querySelectorAll('details'))d.open=true});
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,small:[...document.querySelectorAll('.ks-chip,.tbub button,.sb,.src li>a,input.num')].filter(e=>e.getBoundingClientRect().height>0&&e.getBoundingClientRect().height<43.5).map(e=>e.textContent)}));
    ok(layout.overflow<=1,'横はみ出しなし');ok(layout.small.length===0,'押せる高さ44px以上: '+layout.small.join(','));
    for(const href of await page.locator('a[href^="/"]').evaluateAll(as=>as.map(a=>a.getAttribute('href').split('#')[0])))links.add(href);
    ok(await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].every(a=>!!document.getElementById(a.hash.slice(1)))),'ページ内リンク');
    if(viewport.width===390){const rows=await page.locator('.ks-chips .ks-chip').evaluateAll(es=>new Set(es.map(e=>Math.round(e.getBoundingClientRect().top))).size);ok(rows<=2,'スマホの口座は2行以内')}
    await page.locator('#ks-result').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(root,`output/playwright/kabu-${viewport.width}-${colorScheme}-result.png`)});
    ok(errors.length===0,'実行エラーなし: '+errors.join(','));
    await ctx.close();
  }
  for(const href of links){const r=await fetch(base+href);ok(r.status===200,'内部リンク '+href)}
  ok((await fetch(base+'/no-such-kabu-page/')).status===404,'存在しないURLは404');
  console.log(`ブラウザ点検 ${checks}件成功。画像を output/playwright/ に保存。`);
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
