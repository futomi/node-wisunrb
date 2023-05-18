/* ------------------------------------------------------------------
* node-wisunrb - wisunrb-elparser.js
*
* Copyright (c) 2023, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';

class WisunrbElparser {
    /* ------------------------------------------------------------------
    * Cotructor
    *
    * [Arguments]
    * - None
    * ---------------------------------------------------------------- */
    constructor() {
        this._parser = {
            // 0x0EF0: Node Profile
            '0EF0': require('./wisunrb-elparser-0EF0.js'),

            // Super class
            'super': require('./wisunrb-elparser-super.js'),

            // 0x0288: Low-voltage smart electric energy meter class
            '0288': require('./wisunrb-elparser-0288.js')
        };
    }

    /* ------------------------------------------------------------------
    * parse(eoj, epc, edt)
    * - Parse an EDT
    * 
    * [Arguments]
    * - eoj | String | Required | EOJ
    *       |        |          | The value must be "0288" or "0EF0".
    *       |        |          | Instance number is acceptable. That is, "028801" is valid.
    * - epc | String | Required | EPC
    *       |        |          | The value must be given in hexadecimal. (e.g., "80")
    * - edt | String | Required | EDT
    *       |        |          | The value must be given in hexadecimal. (e.g., "30")
    *  
    * [Returen value]
    * - An object representing the given EDT.
    * - If failed to parse the EDT, this method will return `null`;
    * ---------------------------------------------------------------- */
    parse(eoj, epc, edt) {
        if (!eoj || !/^[0-9a-fA-F]{4,}$/.test(eoj)) {
            return null;
        }
        eoj = eoj.substring(0, 4).toUpperCase();
        if (!this._parser[eoj]) {
            return null;
        }

        if (!epc || !/^[0-9a-fA-F]{2}$/.test(epc)) {
            return null;
        }
        epc = epc.toUpperCase();

        if (!edt || !/^[0-9a-fA-F]{2,}$/.test(edt) || edt.length % 2 !== 0) {
            return null;
        }
        edt = edt.toUpperCase();

        let data = this._parser[eoj].parse(epc, edt);
        if (!data && eoj !== '0EF0') {
            data = this._parser.super.parse(epc, edt);
        }
        return data;
    }

}

module.exports = new WisunrbElparser();
