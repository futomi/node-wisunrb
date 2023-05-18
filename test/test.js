'use strict';
const mWisunrb = require('../lib/wisunrb.js');
const wisunrb = new mWisunrb({
    path: 'COM6',
    //path: 'COM7',
    id: '000000990215000000000000010FE557',
    password: '8BG4FXS9G9XV'
});

(async () => {
    wisunrb.on('serial-state', (state) => {
        console.log('The serial port state was changed:');
        console.log(state);
    });

    wisunrb.on('serial-data', (buf) => {
        console.log(buf.toString('utf8'));
    });

    wisunrb.on('echonet-data', (packet) => {
        console.log(JSON.stringify(packet, null, '  '));
    });

    await wisunrb.connect();

    console.log(wisunrb.version);
    console.log(wisunrb.netinfo);


    const res = await wisunrb.sendEchonetLitePacket({
        deoj: '0EF001',
        props: [{ epc: "83" }]
    });
    console.log(JSON.stringify(res, null, '  '));

    /*
    const res = await wisunrb.sendEchonetLitePacket({
        //deoj: '0EF001',
        //props: [{ epc: '80' }, { epc: '82' }, { epc: '83' }]
        //props: [{ epc: '88' }, { epc: '89' }]
        //props: [{ epc: '8A' }, { epc: '8B' }, { epc: '8C' }, { epc: '8D' }, { epc: '8E' }]
        //props: [{ epc: '9D' }, { epc: '9E' }, { epc: '9F' }]
        //props: [{ epc: 'D3' }, { epc: 'D4' }, { epc: 'D6' }, { epc: 'D7' }]

        //deoj: '028801',
        //props: [{ epc: '80' }, { epc: '81' }, { epc: '82' }, { epc: '83' }]
        //props: [{ epc: '84' }, { epc: '85' }, { epc: '86' }]
        //props: [{ epc: '87' }, { epc: '88' }, { epc: '89' }]
        //props: [{ epc: '8A' }, { epc: '8B' }, { epc: '8C' }, { epc: '8D' }, { epc: '8E' }]
        //props: [{ epc: '8F' }, { epc: '93' }]
        //props: [{ epc: '97' }, { epc: '98' }, { epc: '99' }, { epc: '9A' }]
        //props: [{ epc: '9D' }, { epc: '9E' }, { epc: '9F' }]
        //props: [{ epc: 'D3' }, { epc: 'D7' }, { epc: 'E0' }, { epc: 'E1' }]
        //props: [{ epc: 'E2' }]
        //props: [{ epc: 'E3' }, { epc: 'E4' }, { epc: 'E5' }]
        //props: [{ epc: 'E7' }, { epc: 'E8' }]
        //props: [{ epc: 'EA' }, { epc: 'EB' }]
        //props: [{ epc: 'EC' }, { epc: 'ED' }]



        props: [{ epc: "81" }]
        //props: [{ epc: "80" }, { epc: "E0" }, { epc: "81" }, { epc: "E1" }, { epc: "82" }]
        //props: [{ epc: "E5" }, { epc: "E2" }]
        //props: [{ epc: "D3" },{ epc: "E3" },{ epc: "E4" },{ epc: "97" },{ epc: "D7" }]
        //props: [{ epc: "E7" },{ epc: "88" },{ epc: "98" },{ epc: "E8" },{ epc: "8A" },{ epc: "EA" }]
        //props: [{ epc: "EB" },{ epc: "EC" },{ epc: "8D" },{ epc: "9D" },{ epc: "ED" },{ epc: "9E" },{ epc: "9F" }]
    });
    */


    // ----------------------------------------------------------
    // 積算電力量計測値(正方向計測値) (0xE0)、積算電力量計測値 (逆方向計測値) (0xE3) は、
    // 係数 (0xD3) と積算電力量単位（正方向、逆方向計測値）(0xE1) の値を掛け合わせることで kWh を表す。
    // もし係数 (0xD3) がサポートされていない場合は、係数を 1 とする。
    // ----------------------------------------------------------
    /*
    const res = await wisunrb.sendEchonetLitePacket({
        props: [{ epc: "E0" }, { epc: "D3" }, { epc: "E1" }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res, null, '  '));
    console.log('------------------------------------------------');
    */

    /*
    const res = await wisunrb.sendEchonetLitePacket({
        props: [{ epc: "E3" }, { epc: "D3" }, { epc: "E1" }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res, null, '  '));
    console.log('------------------------------------------------');
    */



    // ----------------------------------------------------------
    // 積算電力量計測値履歴１(正方向計測値) (0xE2)、積算電力量計測値履歴1 (逆方向計測値)(0xE4)
    // を取得するには、事前に積算履歴収集日１ (0xE5) で何日前の履歴が欲しいかをセットする必要がある。
    // また履歴のそれぞれの値は、係数 (0xD3) と積算電力量単位（正方向、逆方向計測値）(0xE1)
    // の値を掛け合わせることで kWh を表す。
    // もし係数 (0xD3) がサポートされていない場合は、係数を 1 とする。
    // 0xE2, 0xE4 は、他の EPC を同時に Get しようとするとエラーになるので、単独で取得すること。
    // ----------------------------------------------------------
    /*
    const res1 = await wisunrb.sendEchonetLitePacket({
        esv: "61",
        props: [{ epc: "E5", edt: "01" }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res1, null, '  '));
    console.log('------------------------------------------------');

    const res2 = await wisunrb.sendEchonetLitePacket({
        props: [{ epc: "D3" }, { epc: "E1" }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res2, null, '  '));
    console.log('------------------------------------------------');

    const res3 = await wisunrb.sendEchonetLitePacket({
        //props: [{ epc: "E2" }]
        props: [{ epc: "E4" }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res3, null, '  '));
    console.log('------------------------------------------------');
    */


    // ----------------------------------------------------------
    // 積瞬時電力計測値 (0xE7), 瞬時電流計測値 (0xE8) は係数などはなく単独で取得すれば良い
    // 単位は W。
    // ----------------------------------------------------------
    /*
    const res1 = await wisunrb.sendEchonetLitePacket({
        props: [{ epc: "E7" }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res1, null, '  '));
    console.log('------------------------------------------------');

    const res2 = await wisunrb.sendEchonetLitePacket({
        props: [{ epc: "E8" }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res2, null, '  '));
    console.log('------------------------------------------------');
    */



    // ----------------------------------------------------------
    // 定時積算電力量計測値 (正方向計測値) (0xEA), 定時積算電力量計測値 (逆方向計測値) (0xEB) の値は、
    // 係数 (0xD3) と積算電力量単位（正方向、逆方向計測値）(0xE1) の値を掛け合わせることで kWh を表す。
    // もし係数 (0xD3) がサポートされていない場合は、係数を 1 とする。
    // 0xEA, 0xEB, 0xEC は、他の EPC を同時に Get しようとするとタイムアウトしてしまうので、単独で取得すること。
    // ----------------------------------------------------------
    /*
    const res1 = await wisunrb.sendEchonetLitePacket({
        props: [{ epc: "D3" }, { epc: "E1" }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res1, null, '  '));
    console.log('------------------------------------------------');

    const res2 = await wisunrb.sendEchonetLitePacket({
        props: [{ epc: "EA" }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res2, null, '  '));
    console.log('------------------------------------------------');

    const res3 = await wisunrb.sendEchonetLitePacket({
        props: [{ epc: "EB" }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res3, null, '  '));
    console.log('------------------------------------------------');
    */



    // ----------------------------------------------------------
    // 積算電力量計測値履歴2 (正方向、逆方向計測値) (0xEC)
    // を取得するには、事前に積算履歴収集日2 (0xED) で、取得したい履歴の日付とコマ数 (1-12) をセットする必要がある。
    // また履歴のそれぞれの値は、係数 (0xD3) と積算電力量単位（正方向、逆方向計測値）(0xE1)
    // の値を掛け合わせることで kWh を表す。
    // もし係数 (0xD3) がサポートされていない場合は、係数を 1 とする。
    // 0xEC は、他の EPC を同時に Get しようとするとエラーになるので、単独で取得すること。
    // ----------------------------------------------------------
    /*
    const buf = Buffer.from([7, 231, 5, 1, 0, 0, 12]); // 2023-05-01T00:00 12 コマ

    const res1 = await wisunrb.sendEchonetLitePacket({
        esv: "61",
        props: [{ epc: "ED", edt: buf }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res1, null, '  '));
    console.log('------------------------------------------------');

    const res2 = await wisunrb.sendEchonetLitePacket({
        props: [{ epc: "D3" }, { epc: "E1" }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res2, null, '  '));
    console.log('------------------------------------------------');

    const res3 = await wisunrb.sendEchonetLitePacket({
        props: [{ epc: "EC" }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res3, null, '  '));
    console.log('------------------------------------------------');
    */


    // ----------------------------------------------------------
    // 積算電力量有効桁数 (0xD7)
    // ----------------------------------------------------------
    /*
    const res = await wisunrb.sendEchonetLitePacket({
        props: [{ epc: "D7" }]
    });

    console.log('------------------------------------------------');
    console.log(JSON.stringify(res, null, '  '));
    console.log('------------------------------------------------');
    */


    await wisunrb.disconnect();
    wisunrb.destroy();

})();