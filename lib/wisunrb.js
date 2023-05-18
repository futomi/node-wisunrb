/* ------------------------------------------------------------------
* node-wisunrb - wisunrb.js
*
* Copyright (c) 2023, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';
const EventEmitter = require('node:events');
const WisunrbAdapter = require('./wisunrb-adapter.js');
const WisunrbElpacket = require('./wisunrb-elpacket.js');

class Wisunrb extends EventEmitter {
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
        super();

        this._adapter = new WisunrbAdapter({
            path: params.path,
            id: params.id,
            password: params.password
        });
        this._elpacket = new WisunrbElpacket();

        this._EL_REQ_TIMEOUT = 10000; // ECHONET Lite request timeout (msec)
        this._EL_REQ_TRY_LIMIT = 3;

        // Coefficient/係数 (EPC: 0xD3)
        this._coefficient = null;

        // Number of effective digits for cumulative amounts of electric energy/積算電力量有効桁数 (EPC: 0xD7)
        this._effective_digits = null;

        // Unit for cumulative amounts of electric energy (normal and reverse directions)/積算電力量単位 (正方向、逆方向計測値) (EPC: 0xE1)
        this._energy_unit = null;

        this._onechonet = () => { };
        this._initialized = false;
        this._get_property_map = null;
    }

    get path() {
        return this._adapter.path;
    }

    get id() {
        return this._adapter.id;
    }

    get password() {
        return this._adapter.password;
    }

    get version() {
        // --------------------------------------------------------------
        // Firmware version of the adapter (e.g., "1.5.2")
        // --------------------------------------------------------------
        return this._adapter.version;
    }

    get netinfo() {
        // --------------------------------------------------------------
        // {
        //     srcmac: '001D12910004FFFF',                         // MAC address of the adapter
        //     srcaddr: 'FE80:0000:0000:0000:021D:1291:0004:FFFF', // IPv6 link local address of the adapter
        //     dstmac: 'C0F945004026FFFF',                         // MAC address of the low-voltage smart electric energy meter
        //     dstaddr: 'FE80:0000:0000:0000:C2F9:4500:4026:FFFF', // IPv6 link local address of the low-voltage smart electric energy meter
        //     channel: '21',     // Logical channel number of the PAN
        //     page: '01',        // Channel page of the PAN
        //     panid: 'FFFF',     // PAN ID
        //     pairid: '010FFFFF' // Pairing ID
        // }
        // --------------------------------------------------------------
        return this._adapter.netinfo;
    }

    get state() {
        // --------------------------------------------------------------
        // Connection state:
        // - "connecting"
        // - "connected"
        // - "disconnecting"
        // - "disconnected"
        // --------------------------------------------------------------
        return this._adapter.state;
    }

    /* ------------------------------------------------------------------
    * wait(msec) {
    * - Wait for the specified time (msec)
    *
    * [Arguments]
    * - msec | Integer | Required | Msec.
    *
    * [Returen value]
    * - Promise object
    *   Nothing will be passed to the `resolve()`.
    * ---------------------------------------------------------------- */
    wait(msec) {
        return new Promise((resolve, reject) => {
            if (typeof (msec) === 'number' && msec > 0 && msec % 1 === 0) {
                setTimeout(resolve, msec);
            } else {
                reject(new Error('The `msec` must be an integer grater than 0.'));
            }
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
        this._adapter.init();

        this._adapter.onstate = (event) => {
            this.emit('serial-state', event);
        };

        this._adapter.ondata = (buf) => {
            this._receivedSerialData(buf);
        };

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
        // Initialize this object if not initialized
        if (this._initialized === false) {
            this.init();
        }

        await this._adapter.connect();
    }

    _receivedSerialData(buf) {
        // Check if the data is a UDP packet
        if (buf.subarray(0, 6).toString('utf8') === 'ERXUDP') {
            let pbuf = buf.subarray(123);
            let data = null;
            if (/^[0-9a-fA-F]+$/.test(pbuf.subarray(0, 4).toString('utf8'))) {
                // TESSERA TECHNOLOGY "RL7023"
                data = buf.toString('utf8');
                pbuf = Buffer.from(pbuf.toString('utf8'), 'hex');
            } else {
                // ROHM "BP35C2", RATOC Systems "RS-WSUHA"
                data = buf.subarray(0, 123).toString('utf8') + pbuf.toString('hex').toUpperCase();
            }
            this.emit('serial-data', data);

            // Check if the data is an ECHONET Lite packet
            if (pbuf.length >= 14 && pbuf.subarray(0, 2).readUInt16BE(0) === 0x1081) {
                const packet = this._elpacket.parse(pbuf);
                this.emit('echonet-data', packet);
                this._onechonet(packet);
            }

        } else {
            this.emit('serial-data', buf.toString('utf8'));
        }
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
        await this._adapter.disconnect();
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
        this.removeAllListeners();
        this._adapter.destroy();
        this._adapter = null;
        this._elpacket = null;
        this._coefficient = null;
        this._effective_digits = null;
        this._energy_unit = null;
        this._onechonet = () => { };
        this._initialized = false;
        this._get_property_map = null;
    }

    /* ------------------------------------------------------------------
    * sendEchonetLitePacket(packet)
    * - Send an ECHONET Lite request packet to the low-voltage smart electric energy meter,
    *   receive the response packet.
    * 
    * [Arguments]
    * - packet     | Object  | Required    | 
    *   - tid      | Integer | Optional    | TID (Transaction ID)
    *   - seoj     | String  | Optional    | SEOJ
    *              |         |             | The default value is "05FF01"
    *              |         |             | (Controller class)
    *   - deoj     | String  | Optional    | DEOJ
    *              |         |             | The default value is "028801"
    *              |         |             | (Low-voltage smart electric energy meter class)
    *   - esv      | String  | Optional    | ESV
    *              |         |             | The value must be given in hexadecimal.
    *              |         |             | For now, it must be "61" (SetC) or "62" (Get).
    *              |         |             | The default value is "62" (Get).
    *   - props    | Array   | Required    | List of pairs of EPC and EDT
    *     - epc    | String  | Required    | EPC (e.g., "80")
    *     - edt    | Buffer  | Conditional | EDT (If the `esv` is "SetC", the `edt` is required.)
    *              | String  |             | If the `edt` is a string, it must be given in hexadecimal.
    *  
    * [Returen value]
    * - Promise object
    *   The response packet will be passed to the `resolve()`.
    * ---------------------------------------------------------------- */
    async sendEchonetLitePacket(packet = {}) {
        if (this.state !== 'connected') {
            throw new Error('No smart energy meter is not connected.');
        }

        const pkt = { ...packet }; // shallow copy
        if ('tid' in pkt === false) {
            pkt.tid = this._elpacket.assignTid();
        }

        let res = null;
        let error = null;

        for (let i = 0; i < 3; i++) {
            try {
                res = await this._sendEchonetLitePacket(pkt);
                error = null;
                await this.wait(1000);
                break;
            } catch (e) {
                error = e;
            }

            if (error.message === 'EL_REQ_TIMEOUT') {
                try {
                    await this._adapter.joinPan();
                } catch (e) {
                    error = e;
                }
            }

            await this.wait(1000);
        }

        if (error && error.message.startsWith('UDP_SEND_FAILURE')) {
            try {
                await this._adapter.joinPan();
                await this.wait(1000);
                res = await this._sendEchonetLitePacket(pkt);
                error = null;
            } catch (e) {
                error = e;
            }
            await this.wait(1000);
        }

        if (res) {
            return res;
        } else {
            throw error;
        }
    }

    _sendEchonetLitePacket(packet) {
        return new Promise(async (resolve, reject) => {
            let timer = setTimeout(() => {
                timer = null;
                reject(new Error('EL_REQ_TIMEOUT'));
            }, this._EL_REQ_TIMEOUT);

            this._onechonet = (res) => {
                if (res.tid === packet.tid && /^(71|72|50|51|52)$/.test(res.esv)) {
                    this._onechonet = () => { };
                    if (timer) {
                        clearTimeout(timer);
                        timer = null;
                    }
                    resolve(res);
                }
            };

            try {
                const buf = this._elpacket.compose(packet);
                await this._adapter.sendUdpData(buf);

                const pkt = this._elpacket.parse(buf);
                this.emit('echonet-data', pkt);

            } catch (e) {
                this._onechonet = () => { };
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                reject(e);
            }
        });
    }

    /* ------------------------------------------------------------------
    * getDeviceInfo()
    * - Get information of the low-voltage smart electric energy meter
    * 
    * [Arguments]
    * - None
    *  
    * [Returen value]
    * {
    *   "id": "FE000016C0F945004023FFFF0000000000",
    *   "protocol": "F",
    *   "manufacturer": {
    *     "code": "000016",
    *     "descriptions": {
    *       "ja": "株式会社東芝",
    *       "en": "TOSHIBA CORPORATION"
    *     }
    *   }
    *   "productCode": null,
    *   "serialNumber": "S20G730000"
    * }
    * 
    * - If failed to get the value, an exception will be thrown.
    * ---------------------------------------------------------------- */
    async getDeviceInfo() {
        let info = {
            id: null,           // EOJ 0x0EF001, EPC 0x83: Identification number (識別番号)
            protocol: null,     // EOJ 0x028801, EPC 0x82: Standard version information (規格Version情報)
            manufacturer: null, // EOJ 0x028801, EPC 0x8A: Manufacturer code (メーカコード) 
            productCode: null,  // EOJ 0x028801, EPC 0x8C: Product code (商品コード)
            serialNumber: null  // EOJ 0x028801, EPC 0x8D: Production number (製造番号)
        };

        const data = await this._getEpcData('83', '0EF001');
        info = Object.assign(info, data);

        const epc_list = ['82', '83', '8A', '8C', '8D'];
        const get_property_map = await this._getGetPropertyMap();

        for (const epc of epc_list) {
            if (get_property_map.includes(epc)) {
                const data = await this._getEpcData(epc);
                if (data) {
                    info = Object.assign(info, data);
                }
            }
        }

        return info;
    }

    /* ------------------------------------------------------------------
    * getInstantaneousElectricPower()
    * - Get the measured instantaneous electric power (瞬時電力計測値)
    * 
    * [Arguments]
    * - None
    *  
    * [Returen value]
    * - The measured instantaneous electric power (Unit: W).
    * - If no data, `null` will be returned.
    * - If failed to get the value, an exception will be thrown.
    * ---------------------------------------------------------------- */
    async getInstantaneousElectricPower() {
        const data = await this._getEpcData('E7');
        let power = data.instantaneousElectricPower;
        if (power === 0x7FFFFFFE) {
            power = null;
        }
        return power;
    }

    /* ------------------------------------------------------------------
    * getInstantaneousCurrent()
    * - Get the measured instantaneous currents (瞬時電流計測値)
    * 
    * [Arguments]
    * - None
    *  
    * [Returen value]
    * - Currents (A)
    * {
    *    "rPhase": -20,
    *    "tPhase": -30
    * }
    * - If no data, each value will be `null`.
    * - If failed to get the values, an exception will be thrown.
    * ---------------------------------------------------------------- */
    async getInstantaneousCurrent() {
        const data = await this._getEpcData('E8');
        const currents = data.instantaneousCurrent;

        return {
            rPhase: (currents.rPhase === 0x7FFE) ? null : (currents.rPhase / 10),
            tPhase: (currents.tPhase === 0x7FFE) ? null : (currents.tPhase / 10)
        };
    }

    /* ------------------------------------------------------------------
    * getNormalDirectionCumulativeElectricEnergy()
    * - Get the measured cumulative amount of electric energy (normal direction) (積算電力量計測値 (正方向計測値))
    * 
    * [Arguments]
    * - None
    *  
    * [Returen value]
    * - Measured cumulative amount of electric energy (normal direction) (Unit: kWh)
    * - If no data, the value will be `null`.
    * - If failed to get the values, an exception will be thrown.
    * ---------------------------------------------------------------- */
    async getNormalDirectionCumulativeElectricEnergy() {
        const data = await this._getEpcData('E0');
        let energy = data.normalDirectionCumulativeElectricEnergy;
        if (energy === 0xFFFFFFFE) {
            energy = null;
        } else {
            const coefficient = await this._getCoefficient();
            const unit = await this._getEnergyUnit();
            energy = this._multiplyCoefficientAndUnit(energy, coefficient, unit);
        }
        return energy;
    }

    /* ------------------------------------------------------------------
    * getReverseDirectionCumulativeElectricEnergy()
    * - Get the measured cumulative amount of electric energy (reverse direction) (積算電力量計測値 (逆方向計測値))
    * 
    * [Arguments]
    * - None
    *  
    * [Returen value]
    * - Measured cumulative amount of electric energy (reverse direction) (Unit: kWh)
    * - If no data, the value will be `null`.
    * - If failed to get the values, an exception will be thrown.
    * ---------------------------------------------------------------- */
    async getReverseDirectionCumulativeElectricEnergy() {
        const data = await this._getEpcData('E3');
        let energy = data.reverseDirectionCumulativeElectricEnergy;
        if (energy === 0xFFFFFFFE) {
            energy = null;
        } else {
            const coefficient = await this._getCoefficient();
            const unit = await this._getEnergyUnit();
            energy = this._multiplyCoefficientAndUnit(energy, coefficient, unit);
        }
        return energy;
    }

    /* ------------------------------------------------------------------
    * getNumberOfEffectiveDigitsCumulativeElectricEnergy()
    * - Get the number of effective digits for cumulative amounts of electric energy (積算電力量有効桁数)
    * 
    * [Arguments]
    * - None
    *  
    * [Returen value]
    * - Number of effective digits for cumulative amounts of electric energy
    * - If failed to get the values, an exception will be thrown.
    * ---------------------------------------------------------------- */
    async getNumberOfEffectiveDigitsCumulativeElectricEnergy() {
        const digits = await this._getEffectiveDigits();
        return digits;
    }

    /* ------------------------------------------------------------------
    * getNormalDirectionCumulativeElectricEnergyLog1(params)
    * - Get the historical data of measured cumulative amounts of electric energy 1 (normal direction) (積算電力量計測値履歴1 (正方向計測値))
    * 
    * [Arguments]
    * - params | Object  | Optional | 
    *   - day  | Integer | Optional | Day for which the historical data of 
    *          |         |          | measured cumulative amounts of electric energy
    *          |         |          | is to be retrieved 1 (EPC: 0xE5).
    *          |         |          | The value must be in the range of 0 to 99.
    *          |         |          | The default value is 0 which means today.
    *  
    * [Returen value]
    * - Historical data of measured cumulative amounts of electric energy 1 (normal direction) (Unit: kWh)
    * - If no data, each value will be `null`.
    * - If failed to get the values, an exception will be thrown.
    * ---------------------------------------------------------------- */
    async getNormalDirectionCumulativeElectricEnergyLog1(params = {}) {
        let day = 0;
        if ('day' in params) {
            day = params.day;
            if (typeof (day) !== 'number' || day % 1 !== 0 || day < 0 || day > 99) {
                throw new Error('The `day` must be an integer in the range of 0 to 99.');
            }
        }

        const res = await this.sendEchonetLitePacket({
            esv: "61",
            props: [{ epc: "E5", edt: Buffer.from([day]) }]
        });
        if (res.esv !== '71') {
            throw new Error('Faild to set EPC 0xE5: ESV=' + res.esv);
        }

        const data = await this._getEpcData('E2');
        const energy_list = data.normalDirectionCumulativeElectricEnergyLog1.electricEnergy;

        const coefficient = await this._getCoefficient();
        const unit = await this._getEnergyUnit();

        for (let i = 0; i < energy_list.length; i++) {
            const val = energy_list[i];
            if (val === 0xFFFFFFFE) {
                energy_list[i] = null;
            } else {
                energy_list[i] = this._multiplyCoefficientAndUnit(val, coefficient, unit);
            }
        }

        return {
            day: data.normalDirectionCumulativeElectricEnergyLog1.day,
            electricEnergy: energy_list
        };
    }

    /* ------------------------------------------------------------------
    * getReverseDirectionCumulativeElectricEnergyLog1(params)
    * - Get the historical data of measured cumulative amounts of electric energy 1 (reverse direction) (積算電力量計測値履歴1 (逆方向計測値))
    * 
    * [Arguments]
    * [Arguments]
    * - params | Object  | Optional | 
    *   - day  | Integer | Optional | Day for which the historical data of 
    *          |         |          | measured cumulative amounts of electric energy
    *          |         |          | is to be retrieved 1 (EPC: 0xE5).
    *          |         |          | The value must be in the range of 0 to 99.
    *          |         |          | The default value is 0 which means today.
    *  
    * [Returen value]
    * - Historical data of measured cumulative amounts of electric energy 1 (reverse direction) (Unit: kWh)
    * - If no data, each value will be `null`.
    * - If failed to get the values, an exception will be thrown.
    * ---------------------------------------------------------------- */
    async getReverseDirectionCumulativeElectricEnergyLog1(params = {}) {
        let day = 0;
        if ('day' in params) {
            day = params.day;
            if (typeof (day) !== 'number' || day % 1 !== 0 || day < 0 || day > 99) {
                throw new Error('The `day` must be an integer in the range of 0 to 99.');
            }
        }

        const res = await this.sendEchonetLitePacket({
            esv: "61",
            props: [{ epc: "E5", edt: Buffer.from([day]) }]
        });
        if (res.esv !== '71') {
            throw new Error('Faild to set EPC 0xE5: ESV=' + res.esv);
        }

        const data = await this._getEpcData('E4');
        const energy_list = data.reverseDirectionCumulativeElectricEnergyLog1.electricEnergy;

        const coefficient = await this._getCoefficient();
        const unit = await this._getEnergyUnit();

        for (let i = 0; i < energy_list.length; i++) {
            const val = energy_list[i];
            if (val === 0xFFFFFFFE) {
                energy_list[i] = null;
            } else {
                energy_list[i] = this._multiplyCoefficientAndUnit(val, coefficient, unit);
            }
        }

        return {
            day: data.reverseDirectionCumulativeElectricEnergyLog1.day,
            electricEnergy: energy_list
        };
    }

    /* ------------------------------------------------------------------
    * getNormalDirectionCumulativeElectricEnergyAtEvery30Min()
    * - Get the cumulative amounts of electric energy measured at fixed time (normal direction) (定時積算電力量計測値 (正方向計測値))
    * 
    * [Arguments]
    * - None
    *  
    * [Returen value]
    * - Cumulative amounts of electric energy measured at fixed time (normal direction) (Unit: kWh)
    * - If no data, the value will be `null`.
    * - If failed to get the values, an exception will be thrown.
    * ---------------------------------------------------------------- */
    async getNormalDirectionCumulativeElectricEnergyAtEvery30Min() {
        const data = await this._getEpcData('EA');
        let energy = data.normalDirectionCumulativeElectricEnergyAtEvery30Min.electricEnergy;
        if (energy === 0xFFFFFFFE) {
            energy = null;
        } else {
            const coefficient = await this._getCoefficient();
            const unit = await this._getEnergyUnit();
            energy = this._multiplyCoefficientAndUnit(energy, coefficient, unit);
        }
        return {
            dateAndTime: data.normalDirectionCumulativeElectricEnergyAtEvery30Min.dateAndTime,
            electricEnergy: energy
        };
    }

    /* ------------------------------------------------------------------
    * getReverseDirectionCumulativeElectricEnergyAtEvery30Min()
    * - Get the cumulative amounts of electric energy measured at fixed time (reverse direction) (定時積算電力量計測値 (逆方向計測値))
    * 
    * [Arguments]
    * - None
    *  
    * [Returen value]
    * - Cumulative amounts of electric energy measured at fixed time (reverse direction) (Unit: kWh)
    * - If no data, the value will be `null`.
    * - If failed to get the values, an exception will be thrown.
    * ---------------------------------------------------------------- */
    async getReverseDirectionCumulativeElectricEnergyAtEvery30Min() {
        const data = await this._getEpcData('EB');
        let energy = data.reverseDirectionCumulativeElectricEnergyAtEvery30Min.electricEnergy;
        if (energy === 0xFFFFFFFE) {
            energy = null;
        } else {
            const coefficient = await this._getCoefficient();
            const unit = await this._getEnergyUnit();
            energy = this._multiplyCoefficientAndUnit(energy, coefficient, unit);
        }
        return {
            dateAndTime: data.reverseDirectionCumulativeElectricEnergyAtEvery30Min.dateAndTime,
            electricEnergy: energy
        };
    }

    /* ------------------------------------------------------------------
    * getCumulativeElectricEnergyLog2(params)
    * - Get the historical data of measured cumulative amounts of electric energy 2 (normal and reverse directions) (積算電力量計測値履歴2 (正方向、逆方向計測値))
    * 
    * [Arguments]
    * - params                       | Object  | Optional | 
    *   - dateAndTime                | String  | Optional | Date and time for which the historical data is to be retrieved
    *                                |         |          | e.g., "2023-05-06T12:00"
    *                                |         |          | The minute must be 00 or 30.
    *                                |         |          | The default value is the recent history date and time.
    *                                |         |          | For example, if the current time is 09:40, the value will be 09:30 of today.
    *   - numberOfCollectionSegments | Integer | Optional | Number of collection segments in the range of 1 to 12.
    *                                |         |          | The default value is 1.
    *  
    * [Returen value]
    * - Historical data of measured cumulative amounts of electric energy 2 (normal and reverse directions) (Unit: kWh)
    * - If no data, each value will be `null`.
    * - If failed to get the values, an exception will be thrown.
    * ---------------------------------------------------------------- */
    async getCumulativeElectricEnergyLog2(params = {}) {
        let dt_parts = {};
        if ('dateAndTime' in params) {
            const datetime = params.dateAndTime;
            if (typeof (datetime) !== 'string') {
                throw new Error('The `datetime` is invalid.');
            }
            const m = datetime.match(/^(\d{4})\-(\d{2})\-(\d{2})T(\d{2})\:(00|30)$/);
            if (!m) {
                throw new Error('The `datetime` is invalid.');
            }

            dt_parts = {
                Y: parseInt(m[1], 10),
                M: parseInt(m[2], 10),
                D: parseInt(m[3], 10),
                h: parseInt(m[4], 10),
                m: parseInt(m[5], 10)
            };

            if (dt_parts.M < 1 || dt_parts.M > 12 || dt_parts.D < 1 || dt_parts.D > 31 || dt_parts.h > 23) {
                throw new Error('The `datetime` is invalid.');
            }

        } else {
            const dt = new Date();
            dt_parts = {
                Y: dt.getFullYear(),
                M: dt.getMonth() + 1,
                D: dt.getDate(),
                h: dt.getHours(),
                m: (dt.getMinutes() < 30) ? 0 : 30
            };
        }

        let segments = 1;
        if ('numberOfCollectionSegments' in params) {
            segments = params.numberOfCollectionSegments;
            if (typeof (segments) !== 'number' || segments % 1 !== 0 || segments < 1 || segments > 12) {
                throw new Error('The `segments` must be an integer in the range of 1 to 12.');
            }
        }

        const edt = Buffer.alloc(7);
        edt.writeUInt16BE(dt_parts.Y, 0);
        edt[2] = dt_parts.M;
        edt[3] = dt_parts.D;
        edt[4] = dt_parts.h;
        edt[5] = dt_parts.m;
        edt[6] = segments;

        const res = await this.sendEchonetLitePacket({
            esv: "61",
            props: [{ epc: "ED", edt: edt }]
        });
        if (res.esv !== '71') {
            throw new Error('Faild to set EPC 0xED: ESV=' + res.esv);
        }

        const data = await this._getEpcData('EC');

        const energy_list = data.cumulativeElectricEnergyLog2.electricEnergy;

        const coefficient = await this._getCoefficient();
        const unit = await this._getEnergyUnit();

        for (let i = 0; i < energy_list.length; i++) {
            const el = energy_list[i];
            for (const [key, val] of Object.entries(el)) {
                if (val === 0xFFFFFFFE) {
                    el[key] = null;
                } else {
                    el[key] = this._multiplyCoefficientAndUnit(val, coefficient, unit);
                }
            }
        }

        return {
            dateAndTime: data.cumulativeElectricEnergyLog2.dateAndTime,
            numberOfCollectionSegments: data.cumulativeElectricEnergyLog2.numberOfCollectionSegments,
            electricEnergy: energy_list
        };
    }

    _multiplyCoefficientAndUnit(val, coefficient, unit) {
        val = val * coefficient;
        if (unit === 0.1) {
            val = val / 10;
        } else if (unit === 0.01) {
            val = val / 100;
        } else if (unit === 0.001) {
            val = val / 1000;
        } else if (unit === 0.0001) {
            val = val / 10000;
        } else {
            val = val * unit;
        }
        return val;
    }

    async _getEpcData(epc, eoj) {
        if (!eoj) {
            eoj = '028801';
        }

        const res = await this.sendEchonetLitePacket({
            deoj: eoj,
            props: [{ epc: epc }]
        });

        if (res.esv !== '72') {
            throw new Error('The smart meter returned an error: ESV=0x' + res.esv);
        }

        if (res.props[0].epc !== epc && !res.props[0].data) {
            throw new Error('Failed to parse the ECHONET Lite response data.');
        }

        return res.props[0].data;
    }

    async _getGetPropertyMap() {
        if (!this._get_property_map) {
            const res_9F = await this._getEpcData('9F');
            this._get_property_map = res_9F.getPropertyMap;
        }
        return JSON.parse(JSON.stringify(this._get_property_map));
    }

    async _getCoefficient() {
        if (this._coefficient === null) {
            const get_property_map = await this._getGetPropertyMap();
            if (get_property_map.includes('D3')) {
                const res_D3 = await this._getEpcData('D3');
                this._coefficient = res_D3.coefficient;
            } else {
                this._coefficient = 1;
            }
        }
        return this._coefficient;
    }

    async _getEffectiveDigits() {
        if (this._effective_digits === null) {
            const res = await this._getEpcData('D7');
            this._effective_digits = res.numberOfEffectiveDigitsCumulativeElectricEnergy;
        }
        return this._effective_digits;
    }

    async _getEnergyUnit() {
        if (this._energy_unit === null) {
            const res = await this._getEpcData('E1');
            this._energy_unit = res.unitForCumulativeElectricEnergy;
        }
        return this._energy_unit;
    }

}

module.exports = Wisunrb;
