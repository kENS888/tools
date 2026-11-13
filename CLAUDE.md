# しごと計算ラボ(shigoto-keisan.com)Claude Code 用の決まり
- この文書は、GitHub kENS888/fukugyo-hq の docs/運用ルール.md(正本。2026-11-13 に claude.ai のプロジェクト「副業」から移した)から、サイトの作業に関係する部分を写したもの(2026-11-07)。食い違ったら正本が優先
- 2026-11-13 から、しごと計算ラボの実装・記事・数字・X の下書きは Claude Code が主担当。コードは Codex に書かせ、Claude Code が指示と確認をする(Kens決定)。決まりが変わった時は、Claude Code が正本とこの文書の両方を直す
- 失敗と再発防止はこのリポジトリの LESSONS.md にも書く
- CLAUDE.md や agent-docs に上げた教訓・テストで自動検査にした教訓は、LESSONS.md 側を1行の要約にする(2026-11-12)

## 進め方
- Kens はコードを読めない。報告は日本語で、結論から、見出しと短い箇条書き。Kens がやることを最後に書く
- 作業は main 以外のブランチで行う。push すると https://<ブランチ名>.shigoto-keisan.pages.dev でプレビューできる。main への反映は Kens がプレビューを見て「OK」と言ってから(main に push すると1分ほどで公開される)
- 作業の最初に git log を見て、今の状態をつかむ
- 計算や制度の数字は、国税庁・厚労省などの一次資料で確かめ、URLと確認日を控える。作り話・誇張を書かない。「経理の専門家が確認」とは書かない
- Web 調査は、何をなぜ調べるかを示して Kens の許可を得てから(指示で許可されている時は不要)
- サイトに変更を反映したら、正本(fukugyo-hq の docs/運用ルール.md)に書く文を報告に入れ、Kens の OK の後に Claude Code が正本に直接書く(書く直前に読み直す。commit・push)(2026-11-13)
- Claude Code・Codex に頼む指示には、品質が足りる中で使用量の少ないモデルと思考量を必ず書く。Codexで画像を作る時は gpt-6-luna・思考量 low(2026-11-02、2回目の指摘)
- Codex に頼む指示には「CLAUDE.md は変えない」を書き、Codex の作業のあとは `git status --short` で CLAUDE.md が変わっていないか見る(2026-11-10、Codex が2回書き足した)
- Git Bash で `MSYS_NO_PATHCONV=1` を付けた時は、node に渡すパスを必ず `C:/Users/...` の形で書く。`/c/Users/...` は C:cUsers... という別の場所になる(2026-11-10、2回)
- main に反映する前に、プレビューのURLで `node tests/agent-files-check.mjs <URL>` を走らせる(ツール以外の変更でも同じ)。新しい種類のファイルを足したら、このテストの「公開する/公開しない」の規則にも足す。内部資料(直下の *.md・agent-docs/)・「.」で始まる名前・tests/ はサイトで配信しない(/.well-known/ は通す)(2026-11-12、内部資料が公開されていたため)

## 作業別の資料
該当する作業の時だけ読む。該当しない資料は読まなくてよい

| 作業 | 読むファイル |
|---|---|
| 画面(入力欄・ボタン・色・並び)を変える時・画面の状態を Kens に報告する時 | agent-docs/design.md と agent-docs/past-findings.md |
| main に反映する前 | agent-docs/user-audit.md |
| AdSense の申請・再申請の前 | agent-docs/adsense-check.md |
| 新しいツールを作る時・AI検索向けの文を変える時 | agent-docs/new-tool.md |
| 記事の下書き(note・はてな)・外部サービスのIDを変える時・Cloudflare のダッシュボードを開く時 | agent-docs/past-findings.md |
