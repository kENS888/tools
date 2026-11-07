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
