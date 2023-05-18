'use strict';

// node-wisunrb をロードし、`Wisunrb` コンストラクタオブジェクトを取得
const Wisunrb = require('../lib/wisunrb.js');

// Wisunrb オブジェクトを生成
const wisunrb = new Wisunrb({
    path: 'COM6', // シリアルポートのパス
    id: '000000990215000000000000010FE557', // 電力スマートメーターの ID
    password: '8BG4FXS9G9XV' // 電力スマートメーターのパスワード
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