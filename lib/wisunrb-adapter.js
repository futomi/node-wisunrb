/* ------------------------------------------------------------------
* node-wisunrb - wisunrb-adapter.js
*
* Copyright (c) 2023, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';
const fs = require('node:fs');
const { SerialPort } = require('serialport');
const { DelimiterParser } = require('@serialport/parser-delimiter')

class WisunrbAdapter {
    /* ------------------------------------------------------------------
    * Cotructor
    *
    * [Arguments]
    * - params     | Object  | Required | 
    *   - path     | String  | Required | Path of the serial port which the Wi-SUN USB dongle is inserted.
    *              |         |          | If you use Windows OS, it should be like "COM3".
    *              |         |          | If you use Linux, it should be like /dev/tty-usbserial1.
    *   - id       | String  | Required | ID
    *   - password | String  | Required | Password
    * ---------------------------------------------------------------- */
    constructor(params = {}) {
        // Check the `path`
        const path = params.path;
        if (!path) {
            throw new Error('The `path` is required.');
        }
        if (typeof (path) !== 'string') {
            throw new Error('The `path` must be a string.');
        }
        if (path.startsWith('/')) {
            if (/[^a-zA-Z0-9\/\.\-\_]/.test(path)) {
                throw new Error('The `path` is invalid: ' + path);
            }
            if (/\.\./.test(path)) {
                throw new Error('The `path` is invalid: ' + path);
            }
            if (!fs.existsSync(path)) {
                throw new Error('The `path` is not found: ' + path);
            }
        } else if (path.startsWith('COM')) {
            if (!/^COM\d+$/.test(path)) {
                throw new Error('The `path` is invalid: ' + path);
            }
        } else {
            throw new Error('The `path` is invalid: ' + path);
        }

        // Check the `id`
        let id = params.id;
        if (!id) {
            throw new Error('The `id` is required.');
        } else if (typeof (id) !== 'string') {
            throw new Error('The `id` must be a string: ' + id);
        }
        id = id.replace(/\s/g, '').toUpperCase();
        if (!/^[0-9A-F]{32}$/.test(id)) {
            throw new Error('The `id` is invaid: ' + id);
        }

        // Check the `password`
        const password = params.password;
        if (!password) {
            throw new Error('The `password` is required.');
        } else if (typeof (password) !== 'string') {
            throw new Error('The `password` must be a string: ' + password);
        } else if (/[^0-9a-zA-Z]/.test(password)) {
            throw new Error('The `password` is invaid: ' + password);
        }

        this._port = new SerialPort({
            path: path,
            baudRate: 115200,
            autoOpen: false
        });

        this._parser = this._port.pipe(new DelimiterParser({ delimiter: '\r\n' }));

        this._dataCallBack = () => { };

        this._path = path;         // Path of the serial port
        this._id = id;             // ID
        this._password = password; // Password

        this._version = '';
        this._netinfo = null;
        this._state = 'disconnected';

        this._ondata = () => { };
        this._onstate = () => { };

        this._initialized = false;
        this._UDP_SEND_TIMEOUT = 5000;
    }

    get path() {
        return this._path;
    }

    get id() {
        return this._id;
    }

    get password() {
        return this._password;
    }

    get version() {
        /* --------------------------------------------------------------
        * Firmware version of the adapter (e.g., "1.5.2")
        * ------------------------------------------------------------ */
        return this._version;
    }

    get netinfo() {
        /* --------------------------------------------------------------
        * Network information
        * {
        *     srcmac: '001D12910004FFFF',                         // MAC address of the adapter
        *     srcaddr: 'FE80:0000:0000:0000:021D:1291:0004:FFFF', // IPv6 link local address of the adapter
        *     dstmac: 'C0F945004026FFFF',                         // MAC address of the low-voltage smart electric energy meter
        *     dstaddr: 'FE80:0000:0000:0000:C2F9:4500:4026:FFFF', // IPv6 link local address of the low-voltage smart electric energy meter
        *     channel: '21',     // Logical channel number of the PAN
        *     page: '01',        // Channel page of the PAN
        *     panid: 'FFFF',     // PAN ID
        *     pairid: '010FFFFF' // Pairing ID
        * }
        * ------------------------------------------------------------ */
        if (this._netinfo) {
            return JSON.parse(JSON.stringify(this._netinfo));
        } else {
            return null;
        }
    }

    get state() {
        return this._state;
    }

    set ondata(fn) {
        if (typeof (fn) === 'function') {
            this._ondata = fn;
        } else {
            throw new Error('The `ondata` must be a function.');
        }
    }

    set onstate(fn) {
        if (typeof (fn) === 'function') {
            this._onstate = fn;
        } else {
            throw new Error('The `onopen` must be a function.');
        }
    }

    _wait(msec) {
        return new Promise((resolve) => {
            setTimeout(resolve, msec);
        });
    }

    /* ------------------------------------------------------------------
    * init()
    * - Initialize this object.
    * 
    * [Arguments]
    * - None
    *  
    * [Returen value]
    * - None
    * ---------------------------------------------------------------- */
    init() {
        this._port.on('close', () => {
            this._state = 'disconnected';
            this._onstate({ state: 'disconnected' });
        });

        this._parser.on('data', (buf) => {
            const message = buf.toString('utf8');

            if (message.startsWith('EVENT 26')) {
                // PANA session termination requested
                this.disconnect();
            } else if (message.startsWith('EVENT 29')) {
                // PANA session expired
                this.disconnect();
            }
            this._ondata(buf);
            this._dataCallBack(buf);
        });

        this._initialized = true;
    }

    /* ------------------------------------------------------------------
    * connect()
    * - Open the serial port, scan the low-voltage smart electric energy meter,
    *   then complete the PANA authentication.
    * 
    * [Arguments]
    * - None
    *  
    * [Returen value]
    * - Promise object
    *   Nothing will be passed to the `resolve()`.
    * ---------------------------------------------------------------- */
    async connect() {
        this._state = 'connecting';
        this._onstate({ state: this._state });

        // Initialize this object if not initialized
        if (this._initialized === false) {
            this.init();
        }

        try {
            await this._connect();
            this._state = 'connected';
            this._onstate({ state: this._state });
        } catch (error) {
            await this.disconnect();
            throw error;
        }
    }

    async _connect() {
        // Open the serial port
        await this._openSerialPort();

        // Get the firmware version of the adapter
        this._version = await this._getVersion();

        const netinfo = {
            srcmac: '',  // MAC address of the adapter
            srcaddr: '', // IPv6 link local address of the adapter
            dstmac: '',  // MAC address of the low-voltage smart electric energy meter
            dstaddr: '', // IPv6 link local address of the low-voltage smart electric energy meter
            channel: '', // Logical channel number of the PAN
            page: '',    // Channel page of the PAN
            panid: '',   // PAN ID
            pairid: ''   // Pairing ID
        };

        // Get the network configurations of the adapter
        const netconf = await this._getNetconf();
        netinfo.srcmac = netconf.mac;
        netinfo.srcaddr = netconf.addr;

        // Create PSK from the password and register it
        await this._sendCommand('SKSETPWD C ' + this._password);

        // Create Route-B ID from the ID and register it
        await this._sendCommand('SKSETRBID ' + this._id);

        // Execute active scan and get information of the PAN
        let pan = null;
        for (let i = 0; i < 3; i++) {
            pan = await this._scanSmartMeter();
            if (pan) {
                break;
            }
        }
        if (!pan) {
            throw new Error('No low-voltage smart electric energy meter was found.');
        }

        netinfo.dstmac = pan.mac;
        netinfo.channel = pan.channel;
        netinfo.page = pan.page;
        netinfo.panid = pan.panid;
        netinfo.pairid = pan.pairid;

        // Generate link local address from MAC address
        netinfo.dstaddr = await this._getLinkLocalAddress(netinfo.dstmac);

        // Write the logical channel number of the PAN to the virtual register (Register No: S02)
        await this._sendCommand('SKSREG S2 ' + netinfo.channel);

        // Write the PAN ID to the virtual register (Register No: S03)
        await this._sendCommand('SKSREG S3 ' + netinfo.panid);

        // Write the ERXUDP format type to the virtual register (Register No: SA2)
        await this._sendCommand('SKSREG SA2 0');
        await this._wait(200);

        // Try the PANA authentication
        await this.joinPan(netinfo.dstaddr);

        this._netinfo = netinfo;
    }

    _openSerialPort() {
        return new Promise((resolve, reject) => {
            if (this._port.isOpen === true) {
                resolve();
                return;
            }

            this._port.open((error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    _sendCommand(cmd) {
        return new Promise((resolve, reject) => {
            this._dataCallBack = (buf) => {
                const res = buf.toString('utf8');
                if (res.startsWith('OK')) {
                    this._dataCallBack = () => { };
                    resolve();
                }
            };

            this._port.write(cmd + "\r\n", (error) => {
                if (error) {
                    this._dataCallBack = () => { };
                    reject(error);
                }
            });
        });
    }

    _scanSmartMeter() {
        return new Promise((resolve, reject) => {
            let found = false;
            let info = null;
            let timer = null;
            const TIMEOUT_MSEC = 18200;

            this._dataCallBack = (buf) => {
                const res = buf.toString('utf8');

                if (res.startsWith('EPANDESC')) {
                    found = true;
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;
                    }
                    info = {};
                } else if (found && res.startsWith('  ')) {
                    const m = res.match(/\s+([^\:]+)\:(.+)/);
                    if (m) {
                        info[m[1]] = m[2];
                    }
                } else if (res.startsWith('EVENT 22')) {
                    this._dataCallBack = () => { };
                    let pan = null;
                    if (info) {
                        pan = {
                            mac: info['Addr'],
                            channel: info['Channel'],
                            page: info['Channel Page'],
                            panid: info['Pan ID'],
                            pairid: info['PairID']
                        };
                    }
                    resolve(pan);
                }
            };

            const cmd = 'SKSCAN 2 FFFFFFFF 6 0';

            this._port.write(`${cmd}\r\n`, (error) => {
                if (error) {
                    this._dataCallBack = () => { };
                    reject(error);
                } else {
                    timer = setTimeout(() => {
                        this._dataCallBack = () => { };
                        resolve(null);
                    }, TIMEOUT_MSEC);
                }
            });
        });
    }

    _getVersion() {
        return new Promise((resolve, reject) => {
            this._dataCallBack = (buf) => {
                const res = buf.toString('utf8');
                if (res.startsWith('EVER')) {
                    this._dataCallBack = () => { };
                    const version = res.replace(/^EVER\s*/, '');
                    resolve(version);
                }
            };

            const cmd = 'SKVER';

            this._port.write(cmd + "\r\n", (error) => {
                if (error) {
                    this._dataCallBack = () => { };
                    reject(error);
                }
            });
        });
    }

    _getNetconf() {
        return new Promise((resolve, reject) => {
            this._dataCallBack = (buf) => {
                const res = buf.toString('utf8');
                if (res.startsWith('EINFO')) {
                    this._dataCallBack = () => { };
                    const cols = res.split(' ');
                    const netconf = {
                        addr: cols[1],
                        mac: cols[2]
                    };
                    resolve(netconf);
                }
            };

            const cmd = 'SKINFO';

            this._port.write(cmd + "\r\n", (error) => {
                if (error) {
                    this._dataCallBack = () => { };
                    reject(error);
                }
            });
        });
    }

    _getLinkLocalAddress(addr) {
        return new Promise((resolve, reject) => {
            this._dataCallBack = (buf) => {
                const res = buf.toString('utf8');
                if (res.startsWith('FE80')) {
                    this._dataCallBack = () => { };
                    resolve(res);
                }
            };

            const cmd = `SKLL64 ${addr}`;

            this._port.write(cmd + "\r\n", (error) => {
                if (error) {
                    this._dataCallBack = () => { };
                    reject(error);
                }
            });
        });
    }

    /* ------------------------------------------------------------------
    * joinPan(addr)
    * - Try the PANA authentication
    * 
    * [Arguments]
    * - addr | String | OPtional | IPv6 link local address of the low-voltage smart electric energy meter
    * 
    * If the `addr` was not specified, `this._netinfo.dstaddr` is applied.
    *  
    * [Returen value]
    * - Promise object
    *   Nothing will be passed to the `resolve()`.
    * ---------------------------------------------------------------- */
    async joinPan(addr) {
        if (!addr) {
            addr = this._netinfo.dstaddr;
        }
        if (!addr) {
            throw new Error('The IPv6 address of the smart meter is required.');
        }

        let authenticated = false;

        for (let i = 0; i < 3; i++) {
            const result = await this._joinPan(addr);
            if (result === 'SUCCESS') {
                authenticated = true;
                break;
            }
            await this._wait(1000);
        }

        if (!authenticated) {
            throw new Error('Failed the PANA authentication. Check the ID or the password.');
        }
    }

    _joinPan(addr) {
        return new Promise((resolve, reject) => {
            this._dataCallBack = (buf) => {
                const res = buf.toString('utf8');
                if (res.startsWith('EVENT 25')) {
                    this._dataCallBack = () => { };
                    resolve('SUCCESS');
                } else if (res.startsWith('EVENT 24')) {
                    resolve('FAIL')
                }
            };

            const cmd = `SKJOIN ${addr}`;

            this._port.write(cmd + "\r\n", (error) => {
                if (error) {
                    this._dataCallBack = () => { };
                    reject(error);
                }
            });
        });
    }

    /* ------------------------------------------------------------------
    * sendUdpData(buf)
    * - Send an UDP packet to the specified address (low-voltage smart electric energy meter)
    * 
    * [Arguments]
    * - buf | Buffer | Required | `Buffer` object representing an UDP packet (ECHONET Lite packet)
    *  
    * [Returen value]
    * - Promise object
    *   Nothing will be passed to the `resolve()`.
    * ---------------------------------------------------------------- */
    sendUdpData(buf) {
        return new Promise((resolve, reject) => {
            const size_buf = Buffer.alloc(2);
            size_buf.writeUInt16BE(buf.length, 0);
            const size_hex = size_buf.toString('hex').toUpperCase();

            let cmd = 'SKSENDTO 1 ' + this._netinfo.dstaddr + ' 0E1A 1 0 ' + size_hex + ' ';
            const cmd_buf = Buffer.concat([
                Buffer.from(cmd, 'utf8'),
                buf,
                Buffer.from('\r\n', 'utf8')
            ]);

            let timer = setTimeout(() => {
                this._dataCallBack = () => { };
                timer = null;
                reject(new Error('UDP_SEND_TIMEOUT'));
            }, this._UDP_SEND_TIMEOUT);

            this._dataCallBack = async (buf) => {
                const res = buf.toString('utf8');
                if (res.startsWith('EVENT 21')) {
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;
                    }
                    this._dataCallBack = () => { };
                    const cols = res.split(' ');
                    if (cols[4] === '00') {
                        resolve();
                    } else {
                        reject(new Error('UDP_SEND_FAILURE: ' + res));
                    }
                }
            };

            this._port.write(cmd_buf, (error) => {
                if (error) {
                    this._dataCallBack = () => { };
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;
                    }
                    reject(error);
                }
            });
        });
    }

    /* ------------------------------------------------------------------
    * disconnect()
    * - Close the serial port
    * 
    * [Arguments]
    * - None
    *  
    * [Returen value]
    * - Promise object
    *   Nothing will be passed to the `resolve()`.
    * ---------------------------------------------------------------- */
    async disconnect() {
        this._state = 'disconnecting';
        this._onstate({ state: this._state });

        this._dataCallBack = () => { };
        this._netinfo = null;
        if (this._port.isOpen === true) {
            await this._closeSerialPort();
        }
    }

    _closeSerialPort() {
        return new Promise((resolve, reject) => {
            this._port.close((error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    /* ------------------------------------------------------------------
    * destroy()
    * - Destroy this object
    * 
    * [Arguments]
    * - None
    *  
    * [Returen value]
    * - None
    * ---------------------------------------------------------------- */
    destroy() {
        if (this._port.isOpen === true) {
            throw new Error('Call the `disconnect()` method before calling the `destroy()` method.');
        }
        this._port = null;
        this._parser = null;
        this._dataCallBack = () => { };
        this._path = '';
        this._id = '';
        this._password = '';
        this._version = '';
        this._netinfo = null;
        this._state = 'disconnected';
        this._ondata = () => { };
        this._onstate = () => { };
        this._initialized = false;
    }

}

module.exports = WisunrbAdapter;
