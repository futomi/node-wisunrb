/* ------------------------------------------------------------------
* node-wisunrb - wisunrb-elparser-0288.js
*
* Copyright (c) 2023, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';

class WisunrbElparser0288 {
    /* ------------------------------------------------------------------
    * Cotructor
    *
    * [Arguments]
    * - None
    * ---------------------------------------------------------------- */
    constructor() {

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

    // EPC 0xD3: Coefficient (係数)
    _parse_D3(buf) {
        if (buf.length !== 4) {
            return null;
        }

        const val = buf.readUInt32BE(0);
        return { coefficient: val };
    }

    // EPC 0xD7: Number of effective digits for cumulative amounts of electric energy (積算電力量有効桁数)
    _parse_D7(buf) {
        if (buf.length !== 1) {
            return null;
        }

        const val = buf[0];
        return { numberOfEffectiveDigitsCumulativeElectricEnergy: val };
    }

    // EPC 0xE0: Measured cumulative amount of electric energy (normal direction) (積算電力量計測値 (正方向計測値))
    _parse_E0(buf) {
        if (buf.length !== 4) {
            return null;
        }

        const val = buf.readUInt32BE(0);
        return { normalDirectionCumulativeElectricEnergy: val }; // Unit: kWh
    }

    // EPC 0xE1: Unit for cumulative amounts of electric energy (normal and reverse directions) (積算電力量単位 (正方向、逆方向計測値))
    _parse_E1(buf) {
        if (buf.length !== 1) {
            return null;
        }

        const code = buf[0];
        let val = 1;
        if (code === 0x00) {
            val = 1;
        } else if (code === 0x01) {
            val = 0.1;
        } else if (code === 0x02) {
            val = 0.01;
        } else if (code === 0x03) {
            val = 0.001;
        } else if (code === 0x04) {
            val = 0.0001;
        } else if (code === 0x0A) {
            val = 10;
        } else if (code === 0x0B) {
            val = 100;
        } else if (code === 0x0C) {
            val = 1000;
        } else if (code === 0x0D) {
            val = 10000;
        } else {
            return null;
        }

        return { unitForCumulativeElectricEnergy: val }; // Unit: kWh
    }

    // EPC 0xE2: Historical data of measured cumulative amounts of electric energy 1 (normal direction) (積算電力量計測値履歴1 (正方向計測値))
    _parse_E2(buf) {
        if (buf.length !== 194) {
            return null;
        }

        const day = buf.readUInt16BE(0);
        const energy_list = [];
        for (let i = 2; i < 194; i += 4) {
            const energy = buf.readUInt32BE(i);
            energy_list.push(energy);
        }
        return {
            normalDirectionCumulativeElectricEnergyLog1: {
                day: day,
                electricEnergy: energy_list
            }
        };
    }

    // EPC 0xE3: Measured cumulative amount of electric energy (reverse direction) (積算電力量計測値 (逆方向計測値))
    _parse_E3(buf) {
        if (buf.length !== 4) {
            return null;
        }

        const val = buf.readUInt32BE(0);
        return { reverseDirectionCumulativeElectricEnergy: val };
    }

    // EPC 0xE4: Historical data of measured cumulative amounts of electric energy 1 (reverse direction) (積算電力量計測値履歴1 (逆方向計測値))
    _parse_E4(buf) {
        if (buf.length !== 194) {
            return null;
        }

        const day = buf.readUInt16BE(0);
        const energy_list = [];
        for (let i = 2; i < 194; i += 4) {
            const energy = buf.readUInt32BE(i);
            energy_list.push(energy);
        }
        return {
            reverseDirectionCumulativeElectricEnergyLog1: {
                day: day,
                electricEnergy: energy_list
            }
        };
    }

    // EPC 0xE5: Day for which the historical data of measured cumulative amounts of electric energy is to be retrieved 1 (積算履歴収集日1)
    _parse_E5(buf) {
        if (buf.length !== 1) {
            return null;
        }

        const val = buf[0];
        return { dayForTheHistoricalDataOfCumulativeElectricEnergy1: val };
    }

    // EPC 0xE7: Measured instantaneous electric power (瞬時電力計測値)
    _parse_E7(buf) {
        if (buf.length !== 4) {
            return null;
        }

        const val = buf.readInt32BE(0);
        return { instantaneousElectricPower: val }; // Unit: W
    }

    // EPC 0xE8: Measured instantaneous currents (瞬時電流計測値)
    _parse_E8(buf) {
        if (buf.length !== 4) {
            return null;
        }

        const rphase = buf.readInt16BE(0);
        const tphase = buf.readInt16BE(2);

        return {
            instantaneousCurrent: {
                rPhase: rphase,
                tPhase: tphase
            }
        }; // Unit: 0.1A
    }

    // EPC 0xEA: Cumulative amounts of electric energy measured at fixed time (normal direction) (定時積算電力量計測値 (正方向計測値))
    _parse_EA(buf) {
        if (buf.length !== 11) {
            return null;
        }

        const date = [
            buf.readUInt16BE(0),
            ('0' + buf.readUInt8(2)).slice(-2),
            ('0' + buf.readUInt8(3)).slice(-2)
        ].join('-');

        const time = [
            ('0' + buf.readUInt8(4)).slice(-2),
            ('0' + buf.readUInt8(5)).slice(-2),
            ('0' + buf.readUInt8(6)).slice(-2)
        ].join(':');

        const energy = buf.readUInt32BE(7);

        return {
            normalDirectionCumulativeElectricEnergyAtEvery30Min: {
                dateAndTime: `${date}T${time}`,
                electricEnergy: energy // Unit: kWh
            }
        };
    }

    // EPC 0xEB: Cumulative amounts of electric energy measured at fixed time (reverse direction) (定時積算電力量計測値 (逆方向計測値))
    _parse_EB(buf) {
        if (buf.length !== 11) {
            return null;
        }

        const date = [
            buf.readUInt16BE(0),
            ('0' + buf.readUInt8(2)).slice(-2),
            ('0' + buf.readUInt8(3)).slice(-2)
        ].join('-');

        const time = [
            ('0' + buf.readUInt8(4)).slice(-2),
            ('0' + buf.readUInt8(5)).slice(-2),
            ('0' + buf.readUInt8(6)).slice(-2)
        ].join(':');

        const energy = buf.readUInt32BE(7);

        return {
            reverseDirectionCumulativeElectricEnergyAtEvery30Min: {
                dateAndTime: `${date}T${time}`,
                electricEnergy: energy // Unit: kWh
            }
        };
    }

    // EPC 0xEC: Historical data of measured cumulative amounts of electric energy 2 (normal and reverse directions) (積算電力量計測値履歴2 (正方向、逆方向計測値))
    _parse_EC(buf) {
        if (buf.length < 7 || buf.length > 103) {
            return null;
        }

        const date = [
            buf.readUInt16BE(0),
            ('0' + buf.readUInt8(2)).slice(-2),
            ('0' + buf.readUInt8(3)).slice(-2)
        ].join('-');

        const time = [
            ('0' + buf.readUInt8(4)).slice(-2),
            ('0' + buf.readUInt8(5)).slice(-2)
        ].join(':');

        const num = buf.readUInt8(6);

        const energy_list = [];
        if (num > 0) {
            for (let i = 7; i < buf.length; i += 8) {
                energy_list.push({
                    normalDirectionElectricEnergy: buf.readUInt32BE(i),
                    reverseDirectionElectricEnergy: buf.readUInt32BE(i + 4)
                });
            }
        }

        return {
            cumulativeElectricEnergyLog2: {
                dateAndTime: `${date}T${time}`,
                numberOfCollectionSegments: num,
                electricEnergy: energy_list
            }
        };
    }

    // EPC 0xED: Day for which the historical data of measured cumulative amounts of electric energy is to be retrieved 2 (積算履歴収集日2)
    _parse_ED(buf) {
        if (buf.length !== 7) {
            return null;
        }

        const date = [
            buf.readUInt16BE(0),
            ('0' + buf.readUInt8(2)).slice(-2),
            ('0' + buf.readUInt8(3)).slice(-2)
        ].join('-');

        const time = [
            ('0' + buf.readUInt8(4)).slice(-2),
            ('0' + buf.readUInt8(5)).slice(-2)
        ].join(':');

        const num = buf.readUInt8(6);

        return {
            dayForTheHistoricalDataOfCumulativeElectricEnergy2: {
                dateAndTime: `${date}T${time}`,
                numberOfCollectionSegments: num
            }
        };
    }
}

module.exports = new WisunrbElparser0288();
