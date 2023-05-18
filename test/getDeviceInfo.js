'use strict';
const mWisunrb = require('../lib/wisunrb.js');
const wisunrb = new mWisunrb({
    path: 'COM6',
    //path: 'COM7',
    id: '000000990215000000000000010FE557',
    password: '8BG4FXS9G9XV'
});

(async () => {
    wisunrb.on('serial-state', (event) => {
        console.log(event);
        console.log(wisunrb.state);
    });

    wisunrb.on('serial-data', (buf) => {
        console.log(buf.toString('utf8'));
    });

    await wisunrb.connect();
    const info = await wisunrb.getDeviceInfo();
    console.log(JSON.stringify(info, null, '  '));

    await wisunrb.disconnect();
})();