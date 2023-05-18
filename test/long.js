'use strict';
const mWisunrb = require('../lib/wisunrb.js');
const wisunrb = new mWisunrb({
    path: '/dev/ttyUSB0',
    //path: 'COM6', // RATOC
    //path: 'COM7', // TESSERA
    //path: 'COM8', // ROHM BP35C2
    id: '000000990215000000000000010FE557',
    password: '8BG4FXS9G9XV'
});

(async () => {
    wisunrb.on('serial-state', (event) => {
        const now = getDateTime();
        console.log('-----------------------------------------------------');
        console.log(getDateTime());
        console.log(' [serial-state] ');
        console.log(event);
        console.log(wisunrb.state);
        console.log('-----------------------------------------------------');
    });

    wisunrb.on('serial-data', (buf) => {
        console.log(buf.toString('utf8'));
    });

    wisunrb.on('echonet-data', (packet) => {
        console.log('-----------------------------------------------------');
        console.log(getDateTime());
        console.log('[echonet-data]');
        console.log(JSON.stringify(packet, null, '  '));
        console.log('-----------------------------------------------------');
    });


    while (true) {
        try {
            await wisunrb.connect();
            break;
        } catch (error) {
            console.error(error);
            await wisunrb.wait(1000);
        }
    }


    while (true) {
        if (wisunrb.state === 'disconnected') {
            break;
        }

        try {
            const power = await wisunrb.getInstantaneousElectricPower();
            console.log('-----------------------------------------------------');
            console.log(getDateTime());
            console.log('- 瞬時電力計測値: ' + power + ' W');
            console.log('-----------------------------------------------------');
        } catch (error) {
            console.error(error);
        }

        try {
            const currents = await wisunrb.getInstantaneousCurrent();
            console.log('-----------------------------------------------------');
            console.log(getDateTime());
            console.log('- 瞬時電流計測値:');
            console.log('  - R相: ' + currents.rPhase + ' A');
            console.log('  - T相: ' + currents.tPhase + ' A');
            console.log('-----------------------------------------------------');
        } catch (error) {
            console.error(error);
        }

        await wisunrb.wait(30000);
    }

    function getDateTime() {
        const dt = new Date();
        const date = [
            dt.getFullYear(),
            ('0' + (dt.getMonth() + 1)).slice(-2),
            ('0' + dt.getDate()).slice(-2)
        ].join('-');
        const time = [
            ('0' + dt.getHours()).slice(-2),
            ('0' + dt.getMinutes()).slice(-2),
            ('0' + dt.getSeconds()).slice(-2)
        ].join(':');
        return `${date}T${time}`;
    }

})();
