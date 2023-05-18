/* ------------------------------------------------------------------
* node-wisunrb - wisunrb-elparser-super.js
*
* Copyright (c) 2023, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';

class WisunrbElparserSuper {
    /* ------------------------------------------------------------------
    * Cotructor
    *
    * [Arguments]
    * - None
    * ---------------------------------------------------------------- */
    constructor() {
        this.manufacturers = require('./manufacturers.json');
    }

    /* ------------------------------------------------------------------
    * parse(epc, edt)
    * - Parse an EDT
    * 
    * [Arguments]
    * - epc | String | Required | EPC
    *       |        |          | The value must be given in hexadecimal. (e.g., "80")
    * - edt | String | Required | EDT
    *       |        |          | The value must be given in hexadecimal. (e.g., "30")
    *  
    * [Returen value]
    * - An object representing the given EDT.
    * - If failed to parse the EDT, this method will return `null`;
    * ---------------------------------------------------------------- */
    parse(epc, edt) {
        /*
        try {
            const edt_buf = Buffer.from(edt, 'hex');
            return this['_parse_' + epc](edt_buf);
        } catch (e) {
            return null;
        }
        */

        if (this['_parse_' + epc]) {
            const edt_buf = Buffer.from(edt, 'hex');
            return this['_parse_' + epc](edt_buf);
        } else {
            return null;
        }
    }

    // EPC 0x80: Operating status (動作状態)
    _parse_80(buf) {
        if (buf.length !== 1) {
            return null;
        }

        let val = null;
        if (buf[0] === 0x30) {
            val = true;
        } else if (buf[0] === 0x31) {
            val = false;
        } else {
            return null;
        }

        return { operatingStatus: val };
    }

    // EPC 0x81: Installation location (設置場所)
    _parse_81(buf) {
        if (!(buf.length === 1 || buf.length === 17)) {
            return null;
        }

        const val = buf.toString('hex').toUpperCase();
        return { installationLocation: val };
    }

    // EPC 0x82: Standard version information (規格Version情報)
    _parse_82(buf) {
        if (buf.length !== 4) {
            return null;
        }

        const val = buf.subarray(2, 3).toString('utf8').toUpperCase();
        return { protocol: val };
    }

    // EPC 0x83: Identification number (識別番号)
    _parse_83(buf) {
        if (!(buf.length === 9 || buf.length === 17)) {
            return null;
        }

        const val = buf.toString('hex').toUpperCase();
        return { id: val };
    }

    // EPC 0x84: Measured instantaneous power consumption (瞬時消費電力計測値)
    _parse_84(buf) {
        if (buf.length !== 2) {
            return null;
        }

        const val = buf.readUInt16BE(0);
        return { instantaneousElectricPowerConsumption: val }; // Unit: W
    }

    // EPC 0x85: Measured cumulative power consumption (積算消費電力計測値)
    _parse_85(buf) {
        if (buf.length !== 4) {
            return null;
        }

        const val = buf.readUInt32BE(0) / 1000;
        return { consumedCumulativeElectricEnergy: val }; // Unit: kWh
    }

    // EPC 0x86: Manufacturer's fault code (メーカ異常コード)
    _parse_86(buf) {
        if (buf.length < 5 || buf.length > 255) {
            return null;
        }

        const val = buf.toString('hex').toUpperCase();
        return { manufacturerFaultCode: val };
    }

    // EPC 0x87: Current limit setting (電流制限設定)
    _parse_87(buf) {
        if (buf.length !== 1) {
            return null;
        }

        const val = buf[0];
        return { manufacturerFaultCode: val };
    }

    // EPC 0x88: Fault status (異常発生状態)
    _parse_88(buf) {
        if (buf.length !== 1) {
            return null;
        }

        let val = null;
        if (buf[0] === 0x41) {
            val = true;
        } else if (buf[0] === 0x42) {
            val = false;
        } else {
            return null;
        }

        return { faultStatus: val };
    }

    // EPC 0x89: Fault content (異常内容)
    _parse_89(buf) {
        if (buf.length !== 2) {
            return null;
        }

        const val = buf.readUInt16BE(0);
        return { faultDescription: val };
    }

    // EPC 0x8A: Manufacturer code (メーカコード)
    _parse_8A(buf) {
        if (buf.length !== 3) {
            return null;
        }

        const code = buf.toString('hex').toUpperCase();
        const desc = this.manufacturers[code] || { ja: '', en: '' }
        return {
            manufacturer: {
                code: code,
                descriptions: desc
            }
        };
    }

    // EPC 0x8B: Business facility code (事業場コード)
    _parse_8B(buf) {
        if (buf.length !== 3) {
            return null;
        }

        const val = buf.toString('hex');
        return { businessFacilityCode: val };
    }

    // EPC 0x8C: Product code (商品コード)
    _parse_8C(buf) {
        if (buf.length !== 12) {
            return null;
        }

        let limit = 12;
        for (let i = 0; i < 12; i++) {
            if (buf[i] === 0x00) {
                limit = i;
                break;
            }
        }

        const val = buf.subarray(0, limit).toString('utf8');
        return { productCode: val };
    }

    // EPC 0x8D: Production number (製造番号)
    _parse_8D(buf) {
        if (buf.length !== 12) {
            return null;
        }

        let limit = 12;
        for (let i = 0; i < 12; i++) {
            if (buf[i] === 0x00) {
                limit = i;
                break;
            }
        }

        const val = buf.subarray(0, limit).toString('utf8');
        return { serialNumber: val };
    }

    // EPC 0x8E: Production date (製造年月日)
    _parse_8E(buf) {
        if (buf.length !== 4) {
            return null;
        }

        const date = [
            buf.readUInt16BE(0),
            ('0' + buf.readUInt8(2)).slice(-2),
            ('0' + buf.readUInt8(3)).slice(-2)
        ].join('-')

        return { productionDate: date };
    }

    // EPC 0x8F: Power-saving operation setting (節電動作設定)
    _parse_8F(buf) {
        if (buf.length !== 1) {
            return null;
        }

        let val = null;
        if (buf[0] === 0x41) {
            val = true;
        } else if (buf[0] === 0x42) {
            val = false;
        } else {
            return null;
        }

        return { powerSaving: val };
    }

    // EPC 0x93: Remote controll setting (遠隔操作設定)
    _parse_93(buf) {
        if (buf.length !== 1) {
            return null;
        }

        let val = null;
        if (buf[0] === 0x41 || buf[0] === 0x61) {
            val = true;
        } else if (buf[0] === 0x42 || buf[0] === 0x62) {
            val = false;
        } else {
            return null;
        }

        return { remoteControl: val };
    }

    // EPC 0x97: Current time setting (現在時刻設定)
    _parse_97(buf) {
        if (buf.length !== 2) {
            return null;
        }

        const val = ('0' + buf[0]).slice(-2) + ':' + ('0' + buf[1]).slice(-2);
        return { currentTime: val };
    }

    // EPC 0x98: Current date setting (現在年月日設定)
    _parse_98(buf) {
        if (buf.length !== 4) {
            return null;
        }

        const val = [
            buf.readUInt16BE(0),
            ('0' + buf[2]).slice(-2),
            ('0' + buf[3]).slice(-2)
        ].join('-')

        return { currentDate: val };
    }

    // EPC 0x99: Power limit setting (電力制限設定)
    _parse_99(buf) {
        if (buf.length !== 2) {
            return null;
        }

        const val = buf.readUInt16BE(0);
        return { powerLimit: val }; // Unit: W
    }

    // EPC 0x9A: Cumulative operating time (積算運転時間)
    _parse_9A(buf) {
        if (buf.length !== 5) {
            return null;
        }

        const unit = '';
        if (buf[0] === 0x41) {
            unit = 'second';
        } else if (buf[0] === 0x42) {
            unit = 'minute';
        } else if (buf[0] === 0x43) {
            unit = 'hour';
        } else if (buf[0] === 0x44) {
            unit = 'day';
        } else {
            return null;
        }

        const time = buf.readUInt32BE(1);

        return {
            hourMeter: {
                unit: unit,
                time: time
            }
        };
    }

    // EPC 0x9D: Status change announcement property map (状変アナウンスプロパティマップ)
    _parse_9D(buf) {
        const epc_list = this._parsePropertyMap(buf);
        if (epc_list) {
            return { anoPropertyMap: epc_list };
        } else {
            return null;
        }
    }

    _parsePropertyMap(buf) {
        if (buf.length < 1 || buf.length > 17) {
            return null;
        }

        const num = buf.readUInt8(0);
        const epc_list = [];

        if (num > 0 && num < 16) {
            if (buf.length !== num + 1) {
                return null;
            }
            for (let i = 1; i <= num; i++) {
                epc_list.push(buf.subarray(i, i + 1).toString('hex').toUpperCase());
            }
        } else {
            if (buf.length !== 17) {
                return null;
            }
            for (let i = 0; i < 16; i++) {
                const byte = buf[i + 1];
                let mask = 0b00000001;
                for (let s = 0; s < 8; s++) {
                    if (byte & (mask << s)) {
                        const epc = ((8 + s) << 4) + i;
                        const epc_hex = Buffer.from([epc]).toString('hex').toUpperCase();
                        epc_list.push(epc_hex);
                    }
                }
            }
        }

        epc_list.sort();
        return epc_list;
    }

    // EPC 0x9E: Set property map (Set プロパティマップ)
    _parse_9E(buf) {
        const epc_list = this._parsePropertyMap(buf);
        if (epc_list) {
            return { setPropertyMap: epc_list };
        } else {
            return null;
        }
    }

    // EPC 0x9F: Get property map (Get プロパティマップ)
    _parse_9F(buf) {
        const epc_list = this._parsePropertyMap(buf);
        if (epc_list) {
            return { getPropertyMap: epc_list };
        } else {
            return null;
        }
    }

}

module.exports = new WisunrbElparserSuper();
