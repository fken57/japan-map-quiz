# 地図・自治体データの出典

取得日：2026年10月15日。配信時は下記のスナップショットを同梱しており、外部サービスへの問い合わせはありません。

## 市町村名・読みがな

- 提供：code4fukui / localgovjp
- https://github.com/code4fukui/localgovjp
- 取得ファイル：https://raw.githubusercontent.com/code4fukui/localgovjp/master/localgovjp.json
- ライセンス：CC0 https://creativecommons.org/publicdomain/zero/1.0/
- 加工：市・町・村で終わるレコードのみ抽出。政令市の行政区・東京都特別区を除外。出題に必要な名称・読み・都道府県・地方公共団体コード・緯度経度を収録。
- 緯度経度は従来版のデータ項目として保持しますが、現行版の選択・採点には使用しません。

## 選択用の市町村境界

- 原典：国土交通省 国土数値情報「行政区域データ」2025年版
- https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2025.html
- ライセンス：CC BY 4.0 https://creativecommons.org/licenses/by/4.0/
- TopoJSONへの加工：一般社団法人共同通信社 / japan-choropleth
- https://github.com/kyodo-official/japan-choropleth
- 取得ファイル：https://raw.githubusercontent.com/kyodo-official/japan-choropleth/main/data/topojson/municipalities.topojson
- 再加工：東京都特別区・所属未定地を選択対象から除外。政令指定都市の行政区を市単位に統合。収録1,718市町村のコードと対応付け、D3の描画用にリングの向きを調整。mapshaper 0.7.86で頂点を30%に簡略化（keep-shapes）、量子化100000。小島や細い境界の一部は省略されます。表示・採点は収録された境界を基準とします。
- 配信ファイル：municipality-boundaries.json
- 再生成：上記ファイルを `qa/municipalities-2025-source.json` に取得後、`node build-map.cjs`、`npx --yes mapshaper@0.7.86 qa/merged-boundaries.json -simplify 30% keep-shapes -o force format=topojson quantization=100000 assets/municipality-boundaries.json`。mapshaperはデータ作成時のみ使い、配信時の依存ではありません。

## 背景の日本地図

- 原典：国土地理院「地球地図日本」
- https://www.gsi.go.jp/kankyochiri/gm_jpn.html
- 利用規約：https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html
- TopoJSON変換：dataofjapan / land
- https://github.com/dataofjapan/land
- 取得ファイル：https://raw.githubusercontent.com/dataofjapan/land/master/japan.topojson
- 加工：表示用に投影・着色。選択対象外の地域も分かるよう、市町村境界の下に背景として表示。選択・採点には使いません。海岸線は簡略化されています。

## ライブラリ

- D3 7.9.0 — ISC / Mike Bostock（D3-LICENSE.txt）
- topojson-client 3.1.0 — ISC / Mike Bostock（TOPOJSON-LICENSE.txt）
- 上記2ライブラリは同じワークスペースの世界地図クイズに同梱された配布物を再利用。
