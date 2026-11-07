# LESSONS(失敗の記録と再発防止)

## 2026-11-07 / commit / 手元の作業ファイルを commit に入れかけた
- 失敗:`npx wrangler pages dev` で手元確認をしたあと `git add -A` をしたため、`.wrangler/`(Miniflare の状態・バンドル・接続地域などが入る cf.json)が commit に入った。push の途中で気づいて止め、リモートには届いていない
- 原因:リポジトリに `.gitignore` がなく、`git add -A` で何が入るかを commit 前に見ていなかった
- 防ぎ方:
  - `.gitignore` に `.wrangler/` と `node_modules/` を入れた(自動で防ぐ)
  - commit の前に `git status --short` を見て、作ったつもりのないファイルがあれば止める
  - `git add -A` ではなく、変えたファイルを名前で指定して add する
- ルール化したか:した(.gitignore を追加。この LESSONS.md に手順を記録)

## 2026-11-07 / テスト / Git Bash がパスを書き換えた
- 失敗:`node tests/site-check.mjs http://localhost:8788 /nenmatsu/` の `/nenmatsu/` が、Git Bash で `C:/Program Files/Git/nenmatsu/` に書き換えられた
- 原因:Git Bash(MSYS)は `/` で始まる引数を Windows のパスに変換する
- 防ぎ方:実行するときは `MSYS_NO_PATHCONV=1 node tests/site-check.mjs ...` とする(PowerShell なら不要)
- ルール化したか:した(この記録と、site-check.mjs の使い方)

## 2026-11-07 / 画面 / デザインの約束(角は四角・影なし)に反する部品を作った
- 失敗:/nenmatsu/ に足した「画面下の小さな結果表示」を、角丸(border-radius)・影(box-shadow)つきで作った。CLAUDE.md を読み直した時に気づいて直した。v2.css にある別の `.mini` と名前もぶつかっていた
- 原因:新しい部品を足す前に、デザインの約束と v2.css の既存のクラス名を確かめなかった
- 防ぎ方:
  - 部品を足す前に CLAUDE.md の「デザインの約束」と `grep -o '\.<クラス名>' assets/v2.css` で名前のぶつかりを確かめる
  - テスト(tests/nenmatsu-pages.test.mjs)で、ページ独自の <style> に角丸・影を書いていないかを自動で確かめる
- ルール化したか:した(テストを追加)

## 2026-11-07 / 共通CSS / 押せる大きさを直す時に、ほかのツールの配置を崩しかけた
- 失敗:v2.css でチェックボックスのラベルに `align-items:center` を足したら、源泉ツールでチェックボックスが1行目の横から2行目の位置にずれた。出典リンクを `inline-flex` にしたら、文の中の「、」だけが1行に分かれた。公開版との比較スクリーンショットで気づき、push 前に直した
- 原因:共通の部品の見た目を変えるのに、変える前の画面と並べて比べていなかった
- 防ぎ方:
  - 共通CSSを変えたら、公開版と同じ場所のスクリーンショットを撮って並べて比べる(源泉・ふるさと納税・請求書・解説記事)
  - 押せる大きさは tests/tap-size.mjs で全ページ自動点検、崩れは tests/site-check.mjs とスクリーンショットで確認
- ルール化したか:した(tap-size.mjs を追加、この手順を記録)
