# 競馬データ統一Parser Webアプリ v2

## GitHub Pagesへのアップデート方法
1. ZIPを展開
2. GitHubのリポジトリを開く
3. 以下のファイルをアップロードして上書き
   - index.html
   - parser.js
   - app.js
   - manifest.json
   - service-worker.js
   - icon.svg
4. Commit changes
5. 数十秒〜数分後にGitHub Pagesへ反映

## 主な機能
- テキスト貼り付けParser
- 曖昧入力対応
- 出走馬テーブル出力
- 過去走テーブル出力
- JSON出力
- localStorage保存
- 表示カラム切替
- Parserルール/辞書/Schema分離

## 注意
- 完全AIではなくJSルールベースParserです。
- 取れない項目は空欄にします。
- サイトコピー形式が変わった場合は parser.js のルールを追加して精度を上げます。
