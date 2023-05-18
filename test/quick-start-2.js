'use strict';

const mWisunrb = require('../lib/wisunrb.js');

const wisunrb = new mWisunrb({
    //path: '/dev/ttyUSB0',
    path: 'COM6', // RATOC
    //path: 'COM7', // TESSERA
    //path: 'COM8', // ROHM BP35C2
    id: '000000990215000000000000010FE557',
    password: '8BG4FXS9G9XV'
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