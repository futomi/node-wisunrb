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
    const power = await wisunrb.getInstantaneousElectricPower();
    console.log('- 瞬時電力計測値: ' + power + ' W');

    await wisunrb.wait(5000);

    const currents = await wisunrb.getInstantaneousCurrent();
    console.log('- 瞬時電流計測値:');
    console.log('  - R相: ' + currents.rPhase + ' A');
    console.log('  - T相: ' + currents.tPhase + ' A');

    await wisunrb.disconnect();
})();