# 地図・自治体データの出典

取得日：2026年10月15日。配信時は下記のスナップショットを同梱しており、外部サービスへの問い合わせはありません。

## 役所の登録地点

- 提供：code4fukui / localgovjp
- https://github.com/code4fukui/localgovjp
- 取得ファイル：https://raw.githubusercontent.com/code4fukui/localgovjp/master/localgovjp.json
- ライセンス：CC0 https://creativecommons.org/publicdomain/zero/1.0/
- 加工：市・町・村で終わるレコードのみ抽出。政令市の行政区・東京都特別区を除外。出題に必要な名称・読み・都道府県・地方公共団体コード・緯度経度を収録。
- 取得日時は各役所の所在地の更新日を意味しません。庁舎移転・分庁舎などにより現在の本庁舎の位置と異なる場合があります。クイズは登録地点を基準とします。すべての所在地を現行の公式情報と照合したデータではありません。

## 日本地図

- 原典：国土地理院「地球地図日本」
- https://www.gsi.go.jp/kankyochiri/gm_jpn.html
- 利用規約：https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html
- TopoJSON変換：dataofjapan / land
- https://github.com/dataofjapan/land
- 取得ファイル：https://raw.githubusercontent.com/dataofjapan/land/master/japan.topojson
- 加工：表示用に投影・着色。都道府県単位の地図ですが、出題・採点は市町村役場の点の位置に基づきます。市町村界・道路・住所・地名の表示はありません。海岸線は簡略化されています。

## ライブラリ

- D3 7.9.0 — ISC / Mike Bostock（D3-LICENSE.txt）
- topojson-client 3.1.0 — ISC / Mike Bostock（TOPOJSON-LICENSE.txt）
- 上記2ライブラリは同じワークスペースの世界地図クイズに同梱された配布物を再利用。
