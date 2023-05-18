/* ------------------------------------------------------------------
* node-wisunrb - wisunrb-elparser-0EF0.js
*
* Copyright (c) 2023, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';

class WisunrbElparser0EF0 {
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
        try {
            const edt_buf = Buffer.from(edt, 'hex');
            return this['_parse_' + epc](edt_buf);
        } catch (e) {
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

    // EPC 0x82: Version information (Version情報)
    _parse_82(buf) {
        if (buf.length !== 4) {
            return null;
        }

        const val = buf[0] + '.' + buf[1];
        return { version: val };
    }

    // EPC 0x83: Identification number (識別番号)
    _parse_83(buf) {
        if (buf.length !== 17) {
            return null;
        }

        const val = buf.toString('hex').toUpperCase();
        return { id: val };
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

    // EPC 0xBF: Unique identifier data (個体識別情報)
    _parse_BF(buf) {
        if (buf.length !== 2) {
            return null;
        }

        const val = buf.toString('hex').toUpperCase();
        return { uid: val };
    }

    // EPC 0xD3: Number of self-node instances (自ノードインスタンス数)
    _parse_D3(buf) {
        if (buf.length !== 3) {
            return null;
        }

        const buf2 = Buffer.from([0, buf[0], buf[1], buf[2]]);
        const val = buf2.readUInt32BE(0);
        return { selfNodeInstances: val };
    }

    // EPC 0xD4: Number of self-node classes (自ノードクラス数)
    _parse_D4(buf) {
        if (buf.length !== 2) {
            return null;
        }

        const val = buf.readUInt16BE(0);
        return { selfNodeClasses: val };
    }

    // EPC 0xD5: Instance list notification (インスタンスリスト通知)
    _parse_D5(buf) {
        const val = this._parseInstanceList(buf);
        if (val) {
            return { instanceListNotification: val };
        } else {
            return null;
        }
    }

    _parseInstanceList(buf) {
        if (buf.length < 1 || buf.length > 253) {
            return null;
        }

        const num = buf.readUInt8(0);
        if ((buf.length - 1) % 3 !== 0) {
            return null;
        }

        const eoj_list = [];
        for (let i = 1; i < buf.length; i += 3) {
            const eoj = buf.subarray(i, i + 3).toString('hex').toUpperCase();
            eoj_list.push(eoj);
        }

        return {
            numberOfinstances: num,
            instanceList: eoj_list
        };
    }

    // EPC 0xD6: Self-node instance list S (自ノードインスタンスリストS)
    _parse_D6(buf) {
        const val = this._parseInstanceList(buf);
        if (val) {
            return { selfNodeInstanceListS: val };
        } else {
            return null;
        }
    }

    // EPC 0xD7: Self-node class list S (自ノードクラスリストS)
    _parse_D7(buf) {
        if (buf.length < 1 || buf.length > 17) {
            return null;
        }

        const num = buf.readUInt8(0);
        if ((buf.length - 1) % 2 !== 0) {
            return null;
        }

        const class_list = [];
        for (let i = 1; i < buf.length; i += 2) {
            const ccode = buf.subarray(i, i + 2).toString('hex').toUpperCase();
            class_list.push(ccode);
        }

        return {
            selfNodeClassListS: {
                numberOfClasses: num,
                classList: class_list
            }
        };
    }


}

module.exports = new WisunrbElparser0EF0();
