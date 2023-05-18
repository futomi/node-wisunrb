node-wisunrb
===============

node-wisunrb は Wi-SUN ECHONET Profile for Route B に対応した USB ドングルを経由して家庭用電力量スマートメーター (低圧スマート電力量メーター) にアクセスします。ECHONET Lite 規格の「低圧スマート電力量メータクラス」に規定されたすべてのプロパティをサポートします。

node-wisunrb が提供する API のパラメーター名、レスポンスのデータ構造やプロパティ名などは、一般社団法人エコーネットコンソーシアムが公開している [Machine Readable Appendix (MRA)](https://echonet.jp/spec_g/#standard-08) および [Web API ガイドライン](https://echonet.jp/web_api_guideline/) をベースにしています。

電力スマートメーターに Wi-SUN B ルートでアクセスするためには、事前に各地域の一般送配電事業会社が提供する「電力メーター情報発信サービス (Bルートサービス)」に申し込む必要があります。詳細は[各地域の一般送配電事業会社のホームページ](#リファレンス)をご覧ください。

## 動作確認済みの USB ドングル

動作が確認できている USB ドングルは以下の通りです。

- [RS-WSUHA-P (ラトックシステム株式会社)](https://www.ratocsystems.com/products/wisun/usb-wisun/rs-wsuha/)
- [RL7023 Stick-D/IPS (テセラ・テクノロジー株式会社)](https://www.tessera.co.jp/product/rfmodul/rl7023stick-d_ips.html)
- BP35C2 (ローム株式会社) (生産終了)

<small>*※ このモジュールは上記製品メーカーの公式または公認の node モジュールではなく、各社が一般公開しているドキュメントを参考に開発した非公式・非公認の node モジュールです。*</small>

## 依存関係

* [Node.js](https://nodejs.org/en/) 18 +
* [serialport](https://www.npmjs.com/package/serialport)

## インストール

```
$ cd ~
$ npm install serialport
$ npm install node-wisunrb
```

---------------------------------------
## 目次

* [クイックスタート](#クイックスタート)
    * [瞬時電力計測値を取得](#瞬時電力計測値を取得)
    * [長期間継続して計測値を取得](#長期間継続して計測値を取得)
* [`Wisunrb` オブジェクト](#wisunrb-オブジェクト)
    * [プロパティ](#プロパティ)
    * [イベント](#イベント)
        * [`serial-state` イベント](#serial-state-イベント)
        * [`serial-data` イベント](#serial-data-イベント)
        * [`echonet-data` イベント](#echonet-data-イベント)
    * [`connect()` メソッド](#connect-メソッド)
    * [`disconnect()` メソッド](#disconnect-メソッド)
    * [`destroy()` メソッド](#destroy-メソッド)
    * [`getDeviceInfo()` メソッド](#getdeviceinfo-メソッド)
    * [`getInstantaneousElectricPower()` メソッド](#getinstantaneouselectricpower-メソッド)
    * [`getInstantaneousCurrent()` メソッド](#getinstantaneouscurrent-メソッド)
    * [`getNormalDirectionCumulativeElectricEnergy()` メソッド](#getnormaldirectioncumulativeelectricenergy-メソッド)
    * [`getReverseDirectionCumulativeElectricEnergy()` メソッド](#getreversedirectioncumulativeelectricenergy-メソッド)
    * [`getNumberOfEffectiveDigitsCumulativeElectricEnergy()` メソッド](#getnumberofeffectivedigitscumulativeelectricenergy-メソッド)
    * [`getNormalDirectionCumulativeElectricEnergyLog1()` メソッド](#getnormaldirectioncumulativeelectricenergylog1-メソッド)
    * [`getReverseDirectionCumulativeElectricEnergyLog1()` メソッド](#getreversedirectioncumulativeelectricenergylog1-メソッド)
    * [`getNormalDirectionCumulativeElectricEnergyAtEvery30Min()` メソッド](#getnormaldirectioncumulativeelectricenergyatevery30min-メソッド)
    * [`getReverseDirectionCumulativeElectricEnergyAtEvery30Min()` メソッド](#getreversedirectioncumulativeelectricenergyatevery30min-メソッド)
    * [`getCumulativeElectricEnergyLog2()` メソッド](#getcumulativeelectricenergylog2-メソッド)
    * [`sendEchonetLitePacket()` メソッド](#sendechonetlitepacket-メソッド)
    * [`wait()` method](#wait-メソッド)
* [`NetInfo` オブジェクト](#netinfo-オブジェクト)
* [`EchonetPacket` オブジェクト](#echonetpacket-オブジェクト)
* [リリースノート](#リリースノート)
* [リファレンス](#リファレンス)
* [ライセンス](#ライセンス)

---------------------------------------
## クイックスタート

### 瞬時電力計測値を取得

このサンプルコードは、指定の ID とパスワードで電力スマートメーターに接続し、瞬時電力計測値を取得してから、スマートメーターとの接続を切断して終了します。

```JavaScript
// node-wisunrb をロードし、`Wisunrb` コンストラクタオブジェクトを取得
const Wisunrb = require('node-wisunrb');

// Wisunrb オブジェクトを生成
const wisunrb = new Wisunrb({
    path: 'COM6', // シリアルポートのパス
    id: '0123456789ABCDEF0123456789ABCDEF', // 電力スマートメーターの ID
    password: '0123456789AB' // 電力スマートメーターのパスワード
});

(async () => {
    // スマートメーターに接続
    await wisunrb.connect();

    // 瞬時電力計測値を取得して結果を出力
    const power = await wisunrb.getInstantaneousElectricPower();
    console.log('- 瞬時電力計測値: ' + power + ' W');

    // スマートメーターを切断
    await wisunrb.disconnect();
})();
```

上記コードは次のような結果を出力します：

```
- 瞬時電力計測値: -1126 W
```

まず、`Wisunrb` コンストラクタオブジェクト (変数 `Wisunrb`) から [`Wisunrb`](#wisunrb-オブジェクト) オブジェクト (変数 `wisunrb`) を生成します。

```javascript
const Wisunrb = require('node-wisunrb');
const wisunrb = new Wisunrb({
    path: 'COM6', // シリアルポートのパス
    id: '0123456789ABCDEF0123456789ABCDEF', // 電力スマートメーターの ID
    password: '0123456789AB' // 電力スマートメーターのパスワード
});
```

`Wisunrb` コンストラクタには、USB ドングルが挿入されているシリアルポートのパス、電力スマートメーターの ID、そしてパスワードを指定しなければいけません。シリアルポートのパスは、Raspberry Pi OS のような Linux 系 OS であれば `/dev/ttyUSB0` のような値となります。Windows であれば `COM6` といった値となります。

[`Wisunrb`](#wisunrb-オブジェクト) オブジェクト (変数 `wisunrb`) を生成したら、[`connect()`](#connect-メソッド) メソッドを使って電力スマートメーターに接続します。

```javascript
await wisunrb.connect();
```

この接続処理は、環境によっては 1 分近くかかる場合もあります。また、1 分近く待って最終的に接続が完了しない場合もあります。それは異常ではありません。しかし、接続できない状況が続くようなら、電力スマートメーターの ID とパスワードを再確認し、電力スマートメーターから物理的に近い場所で試してください。

接続が完了すると、ECHONET Lite パケットの送受信が可能になります。ここでは [`getInstantaneousElectricPower()`](#getinstantaneouselectricpower-メソッド) メソッドを使って瞬時電力計測値を取得します。

```javascript
const power = await wisunrb.getInstantaneousElectricPower();
```

電力スマートメーターから計測値を取得するのに、状況によっては 1 分近くかかる場合があります。場合によっては 1 分近く待った挙句に計測値を取得できないという結果にもなります。これは異常ではありません。その場合は、しばらく経ってから改めて試してください。計測値が取得できない状況が続くなら、電力スマートメーターから物理的に近い場所で試してください。

必要な情報が取得でき、電力スマートメーターとの接続を維持する必要が無くなれば、[`disconnect()`](#disconnect-メソッド) メソッドを使って接続を切ります。

```javascript
await wisunrb.disconnect();
```

### 長期間継続して計測値を取得

次のサンプルコードは、ECHONET Lite で定義されている「積算電力量計測値履歴2」と呼ばれる履歴情報を 30 分おきに取得して出力します。

```JavaScript
const Wisunrb = require('node-wisunrb');

const wisunrb = new Wisunrb({
    path: 'COM6', // シリアルポートのパス
    id: '0123456789ABCDEF0123456789ABCDEF', // 電力スマートメーターの ID
    password: '0123456789AB' // 電力スマートメーターのパスワード
});

(async () => {
    // スマートメーターに接続
    await wisunrb.connect();

    while (true) {
        try {
            // 積算電力量計測値履歴2を取得
            const res = await wisunrb.getCumulativeElectricEnergyLog2();
            console.log(JSON.stringify(res, null, '  '));
        } catch (error) {
            console.error(error);
        }

        // 30 分待つ
        await wisunrb.wait(1800000);
    }
})();
```

このサンプルコードでは、30 分おきに次のような結果が出力されます。

```json
{
  "dateAndTime": "2023-05-08T12:30",
  "numberOfCollectionSegments": 1,
  "electricEnergy": [
    {
      "normalDirectionElectricEnergy": 10922.2,
      "reverseDirectionElectricEnergy": 4210.7
    }
  ]
}
```

この「積算電力量計測値履歴2」とは、毎時 00 分と 30 分に計測された積算電力量を表します。[`getCumulativeElectricEnergyLog2()`](#getcumulativeelectricenergylog2-メソッド) メソッドは、引数を与えなければ、直近の 00 分または 30 分の正方向と逆方向の積算電力量を返します。

積算電力量は、名前の通り、時間の経過とともに値が積みあがっていきます。30 分後に取り出した「積算電力量計測値履歴2」の結果は、その 30 分間の電力量ではありません。30 分前の計測値に直近 30 分の電力量を加えた値になります。

ここで注意が必要なのは、継続して何度も繰り返して計測値を取得する場合、エラーになることを想定しなければいけません。本モジュールのメソッドは、失敗すると例外を投げます。しかし、計測値の取得は必ずしも取得できるとは限りません。そのため、`try/catch` 構文で例外をキャッチしてスクリプトが停止しないように配慮してください。

なお、ECHONET Lite 規格では「積算電力量計測値履歴2」は必須ではありません。つまり、電力スマートメーターによっては「積算電力量計測値履歴2」がサポートされていない可能性がありますので注意してください。もし積算電力量計測値が必要な場合は、他の積算電力量に関連するメソッドを利用してください。

---------------------------------------
## `Wisunrb` オブジェクト

node-wisunrb を使うためには、次のように、node-wisunrb モジュールをロードしなければいけません：

```JavaScript
const Wisunrb = require('node-wisunrb');
```

上記コードから `Wisunrb` コンストラクタが得られます。その後、次のように、`Wisunrb` コンストラクタから `Wisunrb` オブジェクトを生成しなければいけません：

```JavaScript
const wisunrb = new Wisunrb({
    path: 'COM6', // シリアルポートのパス
    id: '0123456789ABCDEF0123456789ABCDEF', // 電力スマートメーターの ID
    password: '0123456789AB' // 電力スマートメーターのパスワード
});
```

このコンストラクタは、次の通りのパラメータを含んだハッシュオブジェクトを引数に取ります：

プロパティ | 型     | 必須 | 説明
:----------|:-------|:-----|:------------
`path`     | String | 必須 | Wi-SUN B ルート対応 USB ドングルが挿入されたシリアルポートのパス
`id`       | String | 必須 | 電力スマートメーターの ID
`password` | String | 必須 | 電力スマートメーターのパスワード

シリアルポートのパス `path` は、Raspberry Pi OS のような Linux 系 OS であれば `/dev/ttyUSB0` のような値となります。Windows であれば `COM6` といった値となります。

### プロパティ

`Wisunrb` オブジェクトから次のプロパティにアクセスすることができます。いずれも読み取り専用です。

プロパティ  | 型     | 説明
:----------|:-------|:------------
`path`     | String | コンストラクタに指定されたシリアルポートのパス
`id`       | String | コンストラクタに指定された ID
`password` | String | コンストラクタに指定されたパスワード
`version`  | String | USB ドングルのファームウェアバージョン (例: `"1.5.2"`)
`netinfo`  | Object | 接続中のスマートメーターのネットワーク情報を表す [`NetInfo`](#netinfo-オブジェクト) オブジェクト
`state`    | String | 接続状態

`version` および `netinfo` は、スマートメーター接続が完了していなければ `null` がセットされます。

`netinfo` にはスマートメーターの MAC アドレス、IPv6 アドレス、PAN ID などの情報が格納されます。詳細は [`NetInfo`](#netinfo-オブジェクト) オブジェクトの説明をご覧ください。

`state` は次の文字列を使って接続状態を表します。

値              | 意味
:---------------|:-------------------
`connecting`    | 接続処理中の状態
`connected`     | 接続済みの状態
`disconnecting` | 切断処理中の状態
`disconnected`  | 切断済みの状態

### イベント


#### `serial-state` イベント

`serial-state` イベントは、スマートメーターとの接続状態が変化するたびに発生します。

```javascript
wisunrb.on('serial-state', (event) => {
    console.log(event);
});
```

コールバック関数には、次のようなオブジェクトが引き渡されます。

```json
{ "state": "connecting" }
```

この `state` の値は、`Wisunrb` オブジェクトの `state` プロパティの値と同じになります。

#### `serial-data` イベント

USB ドングルが挿入されたシリアルポートでメッセージの送受信が発生すると、`serial-data` イベントが発生します。
コールバック関数にはメッセージを表す `Buffer` オブジェクトが引き渡されます。

なお、このイベントは、メッセージ内に CRLF が発生するたびに発生します。ただし、`Buffer` オブジェクトには、その CRLF は含まれませんので注意してください。

```javascript
wisunrb.on('serial-data', (buf) => {
    console.log(buf.toString('utf8'));
});
```

上記コードによって次のような結果が出力されます。

```
SKVER
EVER 1.5.2
OK
SKINFO
EINFO FE80:0000:0000:0000:021D:1291:0004:FFFF 001D12910004FFFF 39 9E08 0
OK
SKSETPWD C 0123456789AB
OK
SKSETRBID 0123456789ABCDEF0123456789ABCDEF
OK
SKSCAN 2 FFFFFFFF 6 0
OK
...
```

なお、イベントデータからは、それが送信データなのか受信データなのかを明確に区別することはできません。

#### `echonet-data` イベント

USB ドングルとスマートメーターの間で ECHONET Lite パケットの送受信が発生すると、`echonet-data` イベントが発生します。

```javascript
wisunrb.on('echonet-data', (packet) => {
    console.log(JSON.stringify(packet, null, '  '));
});
```

コールバック関数には次のような ECHONET Lite パケットを表す [`EchonetPacket`](#echonetpacket-オブジェクト) オブジェクトが引き渡されます。

```json
{
  "tid": 18074,
  "seoj": "028801",
  "deoj": "05FF01",
  "esv": "72",
  "opc": 1,
  "props": [
    {
      "epc": "E7",
      "edt": "FFFFFDF4",
      "data": {
        "instantaneousElectricPower": -524
      }
    }
  ]
}
```

なお、イベントデータには、それが送信データなのか受信データなのかを区別するための情報は付加されていませんが、`seoj` の値から判定することが可能です。もし `seoj` が `05FF01` なら送信データです。そして、`seoj` が `05FF01` でなければ受信データです。受信データの場合、`seoj` は `028801` または `0EF001` になるはずです。


### `connect()` メソッド

`connect()` メソッドは、シリアルポートを経由してスマートメーターと ECHONET Lite パケットの送受信が開始できる状態にします。このメソッドは `Promise` オブジェクトを返し、`await` 構文では何も返しません。また引数はありません。

```javascript
await wisunrb.connect(); 
```

このメソッドは、シリアルポートをオープンしてからアクティブスキャンを開始します。スマートメーターを発見したら、事前に与えられた ID とパスワードを使って PANA 認証を完了します。この一連の処理が完了するまでに、状況によっては 1 分近くかかる場合があります。

### `disconnect()` メソッド

`disconnect()` メソッドはシリアルポートを閉じてスマートメーターとのコネクションを切断します。このメソッドは `Promise` オブジェクトを返し、`await` 構文では何も返しません。また、引数はありません。

```javascript
await wisunrb.disconnect();
```

このメソッドを呼び出しても、[`Wisunrb`](#wisunrb-オブジェクト) オブジェクトそのものは再利用可能で、[`connect()`](#connect-メソッド) メソッドを使って再度スマートメーターに接続することが可能です。

### <a id="Wisunrb-destroy-method">`destroy()` メソッド</a>

`destroy()` メソッドは、[`Wisunrb`](#wisunrb-オブジェクト) オブジェクトを破棄します。このメソッドは何も返しません。また引数はありません。

```javascript
wisunrb.destroy();
```

一度このメソッドを呼び出すと、該当の [`Wisunrb`](#wisunrb-オブジェクト) オブジェクトを再利用することはできません。もし再度スマートメーターに接続したいなら、新たに [`Wisunrb`](#wisunrb-オブジェクト) オブジェクトを生成してください。

### `getDeviceInfo()` メソッド

`getDeviceInfo()` メソッドは、接続したスマートメーターの各種情報を取得します。このメソッドには引数はありません。このメソッドは `Promise` オブジェクトを返し、`await` 構文では以下のプロパティを持つハッシュオブジェクトを返します。


プロパティ名 | 型  | 説明
:-----------|:----|:----------------------
`id`        | String | ECHONET LIte 識別番号 (例: `"FE000016FFFFFFFFFFFFFFFF0000000000"`)
`protocol`  | String | ECHONET Lite 規格 Version 情報 (例: `"F"`)
`manufacturer` | Object | メーカー情報
&nbsp;&nbsp;&nbsp;&nbsp;`code` | String | ECHONET Lite メーカーコード (例: `"000016"`)
&nbsp;&nbsp;&nbsp;&nbsp;`descriptions` | Object |
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`ja` | String | メーカー名 (日本語)
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`en` | String | メーカー名 (英語)
`productCode`  | String | 商品コード
`serialNumber`  | String | 製造番号 (例: `"S20G73FFFF"`)

すべての値が必ず取得できるわけではありません。取得できなかった項目には `null` がセットされます。

```javascript
const info = await wisunrb.getDeviceInfo();
console.log(JSON.stringify(info, null, '  '));
```

上記コードは次のような結果を出力します。

```json
{
  "id": "FE000016FFFFFFFFFFFFFFFF0000000000",
  "protocol": "F",
  "manufacturer": {
    "code": "000016",
    "descriptions": {
      "ja": "株式会社東芝",
      "en": "TOSHIBA CORPORATION"
    }
  },
  "productCode": null,
  "serialNumber": "S20G73FFFF"
}
```

### `getInstantaneousElectricPower()` メソッド

`getInstantaneousElectricPower()` メソッドは、瞬時電力計測値 (電力実効値の瞬時値)を取得します。このメソッドに引数はありません。このメソッドは `Promise` オブジェクトを返し、`await` 構文では瞬時電力計測値 (単位: W) を返します。もし瞬時電力計測値が未計測の状態なら、`null` を返します。

```javascript
const power = await wisunrb.getInstantaneousElectricPower();
console.log('- 瞬時電力計測値: ' + power + ' W');
```

上記コードは次のような結果を出力します。

```
- 瞬時電力計測値: -1122 W
```

もし家庭に太陽光パネルが設置されている場合、太陽光発電が家庭の消費電力を上回った売電状態であれば、このように瞬時電力計測値は負の値になります。逆に家庭の消費電力が太陽光発電がを上回った買電状態では正の値になります。このように、瞬時電力計測値は売電および買電の電力を表すため、家庭の消費電力を表すとは限りません。しかし太陽光発電などによる売電がない家庭であれば、瞬時電力計測値は常に正の値となり、事実上、家庭の消費電力を表すことになります。

### `getInstantaneousCurrent()` メソッド

`getInstantaneousCurrent()` メソッドは、R 相および T 相の瞬時電流計測値 (実効電流値の瞬時値) を取得します。このメソッドに引数はありません。このメソッドは `Promise` オブジェクトを返し、`await` 構文では次のような R 相および T 相の瞬時電流計測値 (単位: A) を含んだハッシュオブジェクトを返します。

プロパティ名 | 型  | 説明
:-----------|:----|:----------------------
`rPhase`    | Double | R 相の実効電流値の瞬時値 (単位: A)
`tPhase`    | Double | T 相の実効電流値の瞬時値 (単位: A)

なお、単相 2 線式の場合は、T 相の値に `null` がセットされます。

```javascript
const currents = await wisunrb.getInstantaneousCurrent();
console.log('- 瞬時電流計測値:');
console.log('  - R相: ' + currents.rPhase + ' A');
console.log('  - T相: ' + currents.tPhase + ' A');
```

上記コードは次のような結果を出力します。

```
- 瞬時電流計測値:
  - R相: 2 A
  - T相: 1 A
```

### `getNormalDirectionCumulativeElectricEnergy()` メソッド

`getNormalDirectionCumulativeElectricEnergy()` メソッドは、正方向の積算電力量計測値を取得します。このメソッドに引数はありません。このメソッドは `Promise` オブジェクトを返し、`await` 構文では正方向の積算電力量計測値 (単位: kWh) を返します。もし正方向の積算電力量計測値が未計測の状態なら、`null` を返します。

```javascript
const energy = await wisunrb.getNormalDirectionCumulativeElectricEnergy();
console.log('- 積算電力量計測値 (正方向計測値): ' + energy + ' kWh');
```

上記コードは次のような結果を出力します。

```
- 積算電力量計測値 (正方向計測値): 10930.4 kWh
```

積算電力量計測値は所定の桁数を超えるまで増え続けます。その上限の桁数は [`getNumberOfEffectiveDigitsCumulativeElectricEnergy()`](#getnumberofeffectivedigitscumulativeelectricenergy-メソッド) メソッドによって取得することができます。もしその桁数が 6 であれば、積算電力量計測値は 999,999 を超えると 0 に戻り増え続けます。もし積算電力量計測値の差分を求める場合は、この上限の桁数に注意してください。

### `getReverseDirectionCumulativeElectricEnergy()` メソッド

`getReverseDirectionCumulativeElectricEnergy()` メソッドは、逆方向の積算電力量計測値を取得します。このメソッドに引数はありません。このメソッドは `Promise` オブジェクトを返し、`await` 構文では逆方向の積算電力量計測値 (単位: kWh) を返します。もし逆方向の積算電力量計測値が未計測の状態なら、`null` を返します。

```javascript
const energy = await wisunrb.getReverseDirectionCumulativeElectricEnergy();
console.log('- 積算電力量計測値 (逆方向計測値): ' + energy + ' kWh');
```

上記コードは次のような結果を出力します。

```
- 積算電力量計測値 (逆方向計測値): 4230.8 kWh
```

積算電力量計測値は所定の桁数を超えるまで増え続けます。その上限の桁数は [`getNumberOfEffectiveDigitsCumulativeElectricEnergy()`](#getnumberofeffectivedigitscumulativeelectricenergy-メソッド) メソッドによって取得することができます。もしその桁数が 6 であれば、積算電力量計測値は 999,999 を超えると 0 に戻り増え続けます。もし積算電力量計測値の差分を求める場合は、この上限の桁数に注意してください。

### `getNumberOfEffectiveDigitsCumulativeElectricEnergy()` メソッド

`getNumberOfEffectiveDigitsCumulativeElectricEnergy()` メソッドは、積算電力量有効桁数を取得します。このメソッドで得られる桁数が 6 であれば、積算電力量計測値の最大値は 999,999 となり、以降は 0 にリセットされて積算されていきます。

このメソッドに引数はありません。このメソッドは `Promise` オブジェクトを返し、`await` 構文では積算電力量有効桁数を返します。

```javascript
const digits = await wisunrb.getNumberOfEffectiveDigitsCumulativeElectricEnergy();
console.log('- 積算電力量有効桁数: ' + digits + ' 桁');
```

上記コードは次のような結果を出力します。

```
- 積算電力量有効桁数: 6 桁
```

### `getNormalDirectionCumulativeElectricEnergyLog1()` メソッド

`getNormalDirectionCumulativeElectricEnergyLog1()` メソッドは、指定日の 24 時間分の正方向の定時積算電力量計測値の履歴を取得します。定時とは毎時 00 分と 30 分のことを指し、履歴データは合計で 48 個になります。

このメソッドは、次のプロパティを持ったハッシュオブジェクトを引数に取ります。

プロパティ名  | 型      | 必須 | 説明
:------------|:--------|:-----|:-----------------
`day`        | String  | 任意 | 指定日を指定します。この指定日は日付で指定するのではなく、〇日前という表現をします。指定できる値は 0 ～ 99 です。0 を指定すれば今日を表します。指定しなければ 0 が指定されたものとして処理されます。

このメソッドは `Promise` オブジェクトを返し、`await` 構文では次のプロパティを持ったハッシュオブジェクトを返します。

プロパティ名      | 型      | 説明
:----------------|:--------|:----------------------
`day`            | Integer | 引数に指定した指定日 (0 ～ 99 日前)
`electricEnergy` | Array   | 正方向の定時積算電力量計測値の配列 (単位: kWh)

正方向の定時積算電力量計測値は、指定日が古い順に並べられます。つまり、`electricEnergy` の配列の最初の値は、指定日の 00:00 時点の積算電力量、その次は 00:30 時点の積算電力量、その次は 01:00 時点の積算電力量となります。そして、配列の最後は 23:30 時点の積算電力量を表します。

引数に 0 を指定した場合、または、引数を指定しなかった場合、それは当日を表すため、未来の時間帯が存在してしまいます。その場合は、該当の時間の値は未計測とみなされ `null` がセットされます。

```javascript
const res = await wisunrb.getNormalDirectionCumulativeElectricEnergyLog1({ day: 0 });
console.log(JSON.stringify(res, null, '  '));
```

上記コードは次のような結果を出力します。

```json
{
  "day": 0,
  "electricEnergy": [
    10926.3,
    10926.5,
    10926.7,
    10926.8,
    10927,
    10927.2,
    10927.3,
    10927.5,
    10927.6,
    10927.8,
    10927.9,
    10928,
    10928.1,
    10928.2,
    10928.2,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.4,
    10928.5,
    10928.5,
    10928.5,
    10928.9,
    10929.2,
    10930.1,
    10930.6,
    10930.9,
    10931.2,
    null,
    null,
    null,
    null,
    null,
    null
  ]
}
```

この結果は 20:50 に実行したものです。そのため、配列の最後の 6 個には `null` がセットされています。つまり、21:00, 21:30, 22:00, 22:30, 23:00, 23:30 の 6 つの値が `null` になります。

積算電力量計測値は所定の桁数を超えるまで増え続けます。その上限の桁数は [`getNumberOfEffectiveDigitsCumulativeElectricEnergy()`](#getnumberofeffectivedigitscumulativeelectricenergy-メソッド) メソッドによって取得することができます。もしその桁数が 6 であれば、積算電力量計測値は 999,999 を超えると 0 に戻り増え続けます。もし積算電力量計測値の差分を求める場合は、この上限の桁数に注意してください。

### `getReverseDirectionCumulativeElectricEnergyLog1()` メソッド

`getReverseDirectionCumulativeElectricEnergyLog1()` メソッドは、指定日の 24 時間分の逆方向の定時積算電力量計測値の履歴を取得します。定時とは毎時 00 分と 30 分のことを指し、履歴データは合計で 48 個になります。

このメソッドは、次のプロパティを持ったハッシュオブジェクトを引数に取ります。

プロパティ名  | 型      | 必須 | 説明
:------------|:--------|:-----|:-----------------
`day`        | String  | 任意 | 指定日を指定します。この指定日は日付で指定するのではなく、〇日前という表現をします。指定できる値は 0 ～ 99 です。0 を指定すれば今日を表します。指定しなければ 0 が指定されたものとして処理されます。

このメソッドは `Promise` オブジェクトを返し、`await` 構文では次のプロパティを持ったハッシュオブジェクトを返します。

プロパティ名      | 型      | 説明
:----------------|:--------|:----------------------
`day`            | Integer | 引数に指定した指定日 (0 ～ 99 日前)
`electricEnergy` | Array   | 逆方向の定時積算電力量計測値の配列 (単位: kWh)

逆方向の定時積算電力量計測値は、指定日の古い順に並べられます。つまり、`electricEnergy` の配列の最初の値は、指定日の 00:00 時点の積算電力量、その次は 00:30 時点の積算電力量、その次は 01:00 時点の積算電力量となります。そして、配列の最後は 23:30 時点の積算電力量を表します。

引数に 0 を指定した場合、または、引数を指定しなかった場合、それは当日を表すため、未来の時間帯が存在してしまいます。その場合は、該当の時間の値は未計測とみなされ `null` がセットされます。

```javascript
const res = await wisunrb.getReverseDirectionCumulativeElectricEnergyLog1({ day: 0 });
console.log(JSON.stringify(res, null, '  '));
```

上記コードは次のような結果を出力します。

```json
{
  "day": 0,
  "electricEnergy": [
    4213.9,
    4213.9,
    4213.9,
    4213.9,
    4213.9,
    4213.9,
    4213.9,
    4213.9,
    4213.9,
    4213.9,
    4213.9,
    4213.9,
    4213.9,
    4214,
    4214.3,
    4214.5,
    4214.9,
    4215.6,
    4216.3,
    4217.4,
    4218.5,
    4219.8,
    4221.1,
    4222.5,
    4223.8,
    4225,
    4226.2,
    4227.3,
    4228.2,
    4229,
    4229.6,
    4230.1,
    4230.4,
    4230.7,
    4230.8,
    4230.8,
    4230.8,
    4230.8,
    4230.8,
    4230.8,
    4230.8,
    4230.8,
    4230.8,
    null,
    null,
    null,
    null,
    null
  ]
}
```

この結果は 21:10 に実行したものです。そのため、配列の最後の 5 個には `null` がセットされています。つまり、21:30, 22:00, 22:30, 23:00, 23:30 の 5 つの値が `null` になります。

積算電力量計測値は所定の桁数を超えるまで増え続けます。その上限の桁数は [`getNumberOfEffectiveDigitsCumulativeElectricEnergy()`](#getnumberofeffectivedigitscumulativeelectricenergy-メソッド) メソッドによって取得することができます。もしその桁数が 6 であれば、積算電力量計測値は 999,999 を超えると 0 に戻り増え続けます。もし積算電力量計測値の差分を求める場合は、この上限の桁数に注意してください。

### `getNormalDirectionCumulativeElectricEnergyAtEvery30Min()` メソッド

`getNormalDirectionCumulativeElectricEnergyAtEvery30Min()` メソッドは、最新の 30 分毎の計測時刻における積算電力量 (正方向計測値) を取得します。このメソッドに引数はありません。このメソッドは `Promise` オブジェクトを返します。`await` 構文では次のプロパティを持ったハッシュオブジェクトを返します。

プロパティ名      | 型      | 説明
:----------------|:--------|:----------------------
`dateAndTime`    | String  | 計測年月日 (例: `"2023-05-09T21:00:00"`)
`electricEnergy` | Array   | 正方向の定時積算電力量 (単位: kWh)

定時積算電力量が計測されていない状況の場合、`electricEnergy` には `null` がセットされます。

```javascript
const res = await wisunrb.getNormalDirectionCumulativeElectricEnergyAtEvery30Min();
console.log(JSON.stringify(res, null, '  '));
```

上記コードは次のような結果を出力します。

```json
{
  "dateAndTime": "2023-05-09T21:00:00",
  "electricEnergy": 10931.5
}
```

積算電力量計測値は所定の桁数を超えるまで増え続けます。その上限の桁数は [`getNumberOfEffectiveDigitsCumulativeElectricEnergy()`](#getnumberofeffectivedigitscumulativeelectricenergy-メソッド) メソッドによって取得することができます。もしその桁数が 6 であれば、積算電力量計測値は 999,999 を超えると 0 に戻り増え続けます。もし積算電力量計測値の差分を求める場合は、この上限の桁数に注意してください。

### `getReverseDirectionCumulativeElectricEnergyAtEvery30Min()` メソッド

`getReverseDirectionCumulativeElectricEnergyAtEvery30Min()` メソッドは、最新の 30 分毎の計測時刻における積算電力量 (逆方向計測値) を取得します。このメソッドに引数はありません。このメソッドは `Promise` オブジェクトを返します。`await` 構文では次のプロパティを持ったハッシュオブジェクトを返します。

プロパティ名      | 型      | 説明
:----------------|:--------|:----------------------
`dateAndTime`    | String  | 計測年月日 (例: `"2023-05-09T21:00:00"`)
`electricEnergy` | Array   | 逆方向の定時積算電力量 (単位: kWh)

定時積算電力量が計測されていない状況の場合、`electricEnergy` には `null` がセットされます。

```javascript
const res = await wisunrb.getNormalDirectionCumulativeElectricEnergyAtEvery30Min();
console.log(JSON.stringify(res, null, '  '));
```

上記コードは次のような結果を出力します。

```json
{
  "dateAndTime": "2023-05-09T21:00:00",
  "electricEnergy": 4230.8
}
```

積算電力量計測値は所定の桁数を超えるまで増え続けます。その上限の桁数は [`getNumberOfEffectiveDigitsCumulativeElectricEnergy()`](#getnumberofeffectivedigitscumulativeelectricenergy-メソッド) メソッドによって取得することができます。もしその桁数が 6 であれば、積算電力量計測値は 999,999 を超えると 0 に戻り増え続けます。もし積算電力量計測値の差分を求める場合は、この上限の桁数に注意してください。

### `getCumulativeElectricEnergyLog2()` メソッド

`getCumulativeElectricEnergyLog2()` メソッドは、正方向の積算電力量計測値と逆方向の積算電力量計測値を計測結果履歴の 30 分毎データとして、指定日時から過去最大 6 時間分データを取得します。

このメソッドは、次のプロパティを持ったハッシュオブジェクトを引数に取ります。

プロパティ名                  | 型      | 必須 | 説明
:----------------------------|:--------|:-----|:-----------------
`dateAndTime`                | String  | 任意 | 指定日時を `"2023-05-09T22:00"` のような形式で指定します。分は 00 または 30 のいずれかでなければいけません。指定しなければ直近の 00 分または 30 分が指定されたものとして処理されます。例えば現在時刻が 21:40 であれば、直近の履歴時刻は 21:30 になります。
`numberOfCollectionSegments` | Integer | 任意 | 取り出したい履歴の数 (収集コマ数) を指定します。指定可能な値は 1 ～ 12 の整数です。もし指定がなければ 1 が指定されたものとして処理されます。

このメソッドは `Promise` オブジェクトを返し、`await` 構文では次のプロパティを持ったハッシュオブジェクトを返します。

プロパティ名      | 型      | 説明
:----------------|:--------|:----------------------
`dateAndTime`    | String  | 引数に指定した指定日 (例: `"2023-05-09T22:00"`)
`numberOfCollectionSegments` | Integer | 引数に指定した収集コマ数 (1 ～ 12)
`electricEnergy` | Array   | 以下のプロパティを持ったハッシュオブジェクトの配列
&nbsp;&nbsp;`normalDirectionElectricEnergy`  | Double | 正方向の積算電力量計測値 (kWh)
&nbsp;&nbsp;`reverseDirectionElectricEnergy` | Double | 逆方向の積算電力量計測値 (kWh)

積算電力量計測値は新しい順に並べられますので注意してください。

```javascript
const res = await wisunrb.getCumulativeElectricEnergyLog2({
    dateAndTime: '2023-05-09T22:00',
    numberOfCollectionSegments: 6
});
console.log(JSON.stringify(res, null, '  '));
```

上記コードは次のような結果を出力します。

```json
{
  "dateAndTime": "2023-05-09T22:00",
  "numberOfCollectionSegments": 6,
  "electricEnergy": [
    {
      "normalDirectionElectricEnergy": null,
      "reverseDirectionElectricEnergy": null
    },
    {
      "normalDirectionElectricEnergy": 10931.9,
      "reverseDirectionElectricEnergy": 4230.8
    },
    {
      "normalDirectionElectricEnergy": 10931.5,
      "reverseDirectionElectricEnergy": 4230.8
    },
    {
      "normalDirectionElectricEnergy": 10931.2,
      "reverseDirectionElectricEnergy": 4230.8
    },
    {
      "normalDirectionElectricEnergy": 10930.9,
      "reverseDirectionElectricEnergy": 4230.8
    },
    {
      "normalDirectionElectricEnergy": 10930.6,
      "reverseDirectionElectricEnergy": 4230.8
    }
  ]
}
```

これは 2023-05-09 21:45 に実行した結果です。第一引数に `"2023-05-09T22:00"` を指定しているため、22:00 の履歴データは未計測となるため、それらの値は `null` がセットされます。

積算電力量計測値は所定の桁数を超えるまで増え続けます。その上限の桁数は [`getNumberOfEffectiveDigitsCumulativeElectricEnergy()`](#getnumberofeffectivedigitscumulativeelectricenergy-メソッド) メソッドによって取得することができます。もしその桁数が 6 であれば、積算電力量計測値は 999,999 を超えると 0 に戻り増え続けます。もし積算電力量計測値の差分を求める場合は、この上限の桁数に注意してください。

なお、この `getCumulativeElectricEnergyLog2()` メソッドの機能は、ECHONET Lite 仕様では必須ではありません。つまり、すべてのスマートメーターでこの機能が実装されていない可能性があります。ご利用のスマートメーターではエラーになる可能性がありますので注意してください。

### `sendEchonetLitePacket()` メソッド

`sendEchonetLitePacket()` メソッドは、ECHONET Lite のリクエストパケットを送信し、そのレスポンスを待ち受けます。前述のメソッドはすべてこのメソッドを使って処理しています。ECHONET Lite 仕様に精通している必要はありますが、前述のメソッドでは実現できない処理を自身で開発することができます。

このメソッドは次のプロパティを持ったハッシュオブジェクトを引数に取ります。基本的に [`EchonetPacket`](#echonetpacket-オブジェクト) オブジェクトと同じ構造ですが、必須ではないプロパティが存在します。

プロパティ名 | 型      | 必須  | 説明
:-----------|:--------|:-----|:-----------------
`tid`       | Integer | 任意 | Transaction ID (TID) を 0x0000 ～ 0xFFFF の範囲で指定します。指定がなければ自動で割り当てられます。
`seoj`      | String  | 任意 | 送信元 ECHONET オブジェクト (EOJ) を 16 進数表記で指定します。指定がなければ `"05FF01"` (コントローラクラス) がセットされます。
`deoj`      | String  | 任意 | 送信先 ECHONET オブジェクト (EOJ) を 16 進数表記で指定します。指定がなければ `"028801"` (低圧スマート電力量メータクラス) がセットされます。
`esv`       | String  | 任意 | ECHONET Lite サービス (ESV) を 16 進数表記で指定します。`"61"` (SetC) または `"62"` (Get) のいずれかでなければいけません。指定がなければ `"62"` (Get) がセットされます。
`props`     | Array   | 必須 | 以下のプロパティを持ったハッシュオブジェクトを格納した配列
&nbsp;&nbsp;`epc` | String | 必須 | ECHONET プロパティ (EPC) を 16 進数表記で指定します。(例: '"80"`)
&nbsp;&nbsp;`edt` | String | 任意 | ECHONET プロパティ値データ (EDT) を 16 進数表記で指定します。`esv` が `"61"` (SetC) の場合は必須です。そして、`esv` が `"62"` (Get) の場合は指定してはいけません。なお、指定する場合は、`Buffer` オブジェクトでも受け付けます。

このメソッドは `Promise` オブジェクトを返し、`await` 構文ではレスポンスとなる ECHONET Lite パケットを表す [`EchonetPacket`](#echonetpacket-オブジェクト) オブジェクトを返します。

次のサンプルコードは、`sendEchonetLitePacket()` メソッドを使って、EPC `0xE0` のデータを取得しています。つまり、積算電力量計測値 (正方向計測値) を取得しています。その次に、[`getNormalDirectionCumulativeElectricEnergy()`](#getnormaldirectioncumulativeelectricenergy-メソッド) メソッドを使って同じ積算電力量計測値 (正方向計測値) を取得しています。

```javascript
const rpacket = await wisunrb.sendEchonetLitePacket({
    props: [{epc: 'E0'}]
});
console.log(JSON.stringify(rpacket, null, '  '));

const energy = await wisunrb.getNormalDirectionCumulativeElectricEnergy();
console.log('- 積算電力量計測値 (正方向計測値): ' + energy + ' kWh');
```

まず、`sendEchonetLitePacket()` メソッドの結果は次のようになります。

```json
{
  "tid": 52928,
  "seoj": "028801",
  "deoj": "05FF01",
  "esv": "72",
  "opc": 1,
  "props": [
    {
      "epc": "E0",
      "edt": "0001AB25",
      "data": {
        "normalDirectionCumulativeElectricEnergy": 109349
      }
    }
  ]
}
```

このように、EDT を解析した結果が `data` プロパティにセットされます。ここでは `normalDirectionCumulativeElectricEnergy` が `109349` という結果になっています。

一方で [`getNormalDirectionCumulativeElectricEnergy()`](#getnormaldirectioncumulativeelectricenergy-メソッド) メソッドの結果は次のようになります。

```
- 積算電力量計測値 (正方向計測値): 10934.9 kWh
```

ここで注意するべき点は、結果の値の単位が違う点です。ECHONET Lite 仕様では、スマートメーターから得られる電力量に該当する値は係数などを掛け合わせることで kWh という単位になります。`sendEchonetLitePacket()` メソッド以外のメソッドでは期待通りに kWh で値を返しますが、`sendEchonetLitePacket()` メソッドから得られる値は ECHONET Lite パケット単体の生の値です。このように単位が異なるため注意してください。

`sendEchonetLitePacket()` メソッドを使うと、複数の EPC を同時に取得することもできます。次の例では、積瞬時電力計測値 (EPC: `0xE7`), 瞬時電流計測値 (EPC: `0xE8`) を一度に取得しています。

```javascript
const rpacket = await wisunrb.sendEchonetLitePacket({
    props: [{ epc: 'E7' }, { epc: 'E8' }]
});
console.log(JSON.stringify(rpacket, null, '  '));
```

この結果は次のようになります。

```json
{
  "tid": 25970,
  "seoj": "028801",
  "deoj": "05FF01",
  "esv": "72",
  "opc": 2,
  "props": [
    {
      "epc": "E7",
      "edt": "FFFFFA2F",
      "data": {
        "instantaneousElectricPower": -1489
      }
    },
    {
      "epc": "E8",
      "edt": "FFBAFFB0",
      "data": {
        "instantaneousCurrent": {
          "rPhase": -70,
          "tPhase": -80
        }
      }
    }
  ]
}
```

なお瞬時電流計測値 (EPC: `0xE8`) の EDT に格納されている値の単位は A ではなく 0.1 アンペアですので注意してください。EDT に格納される値の仕様は、一般社団法人エコーネットコンソーシアムが公開している ECHONET Lite 規格の「[APPENDIX ECHONET機器オブジェクト詳細規定](https://echonet.jp/spec_g/#standard-05)」をご覧ください。

### <a id="Wisunrb-wait-method">`wait()` メソッド</a>

`wait()` メソッドは指定のミリ秒間だけ待ちます。このメソッドは待ち時間を表す整数 (ミリ秒) を引数に取ります。このメソッドは `Promise` オブジェクトを返します。`await` 構文では何も返しません。

```javascript
await wisunrb.wait(1000); // 1 秒間待ちます。
```

---------------------------------------
## `NetInfo` オブジェクト

`NetInfo` オブジェクトは次のプロパティを持ちます。

プロパティ | 型     |  説明
:---------|:-------|:------------
`srcmac`  | String | USB ドングルの MAC アドレス (例: `"001D12910004FFFF"`)
`srcaddr` | String | USB ドングルの IPv6 リンクローカルアドレス (例: `"FE80:0000:0000:0000:021D:1291:0004:FFFF"`)
`dstmac`  | String | スマートメーターの MAC アドレス (例: `"C0F945004026FFFF"`)
`dstaddr` | String | スマートメーターの IPv6 リンクローカルアドレス (例: `"FE80:0000:0000:0000:C2F9:4500:4026:FFFF"`)
`channel` | String | PAN の論理チャンネル番号 (例: '"21"')
`page`    | String | PAN のチャンネルページ (例: '"01"`)
`panid`   | String | PAN ID
`pairid`  | String | ペアリング ID

```json
{
    "srcmac"  : "001D12910004FFFF",                        // USB ドングルの MAC アドレス
    "srcaddr" : "FE80:0000:0000:0000:021D:1291:0004:FFFF", // USB ドングルの IPv6 リンクローカルアドレス
    "dstmac"  : "C0F945004026FFFF",                        // スマートメーターの MAC アドレス
    "dstaddr" : "FE80:0000:0000:0000:C2F9:4500:4026:FFFF", // スマートメーターの IPv6 リンクローカルアドレス
    "channel" : "21",                                      // PAN の論理チャンネル番号
    "page"    : "01",                                      // PAN のチャンネルページ
    "panid"   : "FFFF",                                    // PAN ID
    "pairid"  : "010FFFFF"                                 // ペアリング ID
}
```

---------------------------------------
## `EchonetPacket` オブジェクト

`EchonetPacket` オブジェクトは、USB ドングルとスマートメーター間で送受信される ECHONET Lite パケットを表します。このオブジェクトは次のプロパティを持ちます。

プロパティ名 | 型      |  説明
:-----------|:--------|:-----------------
`tid`       | Integer | Transaction ID (TID)
`seoj`      | String  | 送信元 ECHONET オブジェクト (EOJ) を 16 進数表記で表したもの (例: `"05FF01"`)
`deoj`      | String  | 送信先 ECHONET オブジェクト (EOJ) を 16 進数表記で表したもの (例: `"028801"`)
`esv`       | String  | ECHONET Lite サービス (ESV) を 16 進数表記で表したもの (例: `"61"`)
`props`     | Array   | 以下のプロパティを持ったハッシュオブジェクトを格納した配列
&nbsp;&nbsp;`epc` | String | ECHONET プロパティ (EPC) を 16 進数表記で表したもの。(例: `"80"`)
&nbsp;&nbsp;`edt` | String | ECHONET プロパティ値データ (EDT) を 16 進数表記で表したもの。EDT が存在しない場合は `null` がセットされます。
&nbsp;&nbsp;`data` | Object | ECHONET プロパティ値データ (EDT) を解析した結果がハッシュオブジェクトとしてセットされます。解析に失敗した場合は `null` がセットされます。

`data` にセットされるオブジェクトの構造やプロパティ名は、エコーネットコンソーシアムが公開している [Machine Readable Appendix (MRA)](https://echonet.jp/spec_g/#standard-08) に基づいています。

```json
{
  "tid": 13915,
  "seoj": "028801",
  "deoj": "05FF01",
  "esv": "72",
  "opc": 1,
  "props": [
    {
      "epc": "8A",
      "edt": "000016",
      "data": {
        "manufacturer": {
          "code": "000016",
          "descriptions": {
            "ja": "株式会社東芝",
            "en": "TOSHIBA CORPORATION"
          }
        }
      }
    }
  ]
}
```

---------------------------------------
## リリースノート

* v0.1.0 (2023-05-xx)
  * 初回リリース

---------------------------------------
## リファレンス

* [一般社団法人エコーネットコンソーシアム](https://echonet.jp/)
    * [ECHONET Lite規格書](https://echonet.jp/spec_g/#standard-01)
    * [APPENDIX ECHONET機器オブジェクト詳細規定](https://echonet.jp/spec_g/#standard-05)
    * [Machine Readable Appendix (MRA)](https://echonet.jp/spec_g/#standard-08)
    * [Web API ガイドライン](https://echonet.jp/web_api_guideline/)
* Wi-SUN B ルート対応 USB ドングル
    * [RS-WSUHA-P (ラトックシステム株式会社)](https://www.ratocsystems.com/products/wisun/usb-wisun/rs-wsuha/)
    * [RL7023 Stick-D/IPS (テセラ・テクノロジー株式会社)](https://www.tessera.co.jp/product/rfmodul/rl7023stick-d_ips.html)
* 電力メーター情報発信サービス（Bルートサービス）申し込み案内
    * [北海道電力ネットワーク](https://www.hepco.co.jp/network/electric_life/service/electronic_meter/b_route_service_low.html)
    * [東北電力ネットワーク](https://nw.tohoku-epco.co.jp/consignment/request/other/)
    * [東京電力パワーグリッド](https://www.tepco.co.jp/pg/consignment/liberalization/smartmeter-broute.html)
    * [北陸電力送配電](https://www.rikuden.co.jp/nw_kojin/b_routeservice.html)
    * [中部電力パワーグリッド](https://powergrid.chuden.co.jp/goannai/ippan/smartmeter/use/)
    * [関西電力送配電](https://www.kansai-td.co.jp/application/smart-meter/low-pressure/index.html)
    * [中国電力ネットワーク](https://www.energia.co.jp/nw/safety/smartmeter/route-b.html)
    * [四国電力送配電](https://www.yonden.co.jp/nw/b_root/index.html)
    * [九州電力送配電](https://www.kyuden.co.jp/td_service_meter_b-root_index.html)
    * [沖縄電力](https://www.okiden.co.jp/business-support/service/smartmeter/b-route/index.html)

---------------------------------------
## ライセンス

The MIT License (MIT)

Copyright (c) 2023 Futomi Hatano

