/* ------------------------------------------------------------------
* node-wisunrb - wisunrb-elpacket.js
*
* Copyright (c) 2023, Futomi Hatano, All rights reserved.
* Released under the MIT license
* ---------------------------------------------------------------- */
'use strict';

class WisunrbElpacket {
    /* ------------------------------------------------------------------
    * Cotructor
    *
    * [Arguments]
    * - None
    * ---------------------------------------------------------------- */
    constructor() {
        this._elparser = require('./wisunrb-elparser.js');
        this._tid = Math.floor(Math.random() * 0xffff);
    }

    /* ------------------------------------------------------------------
    * assignTid()
    * - Assign a new TID for an ECHONET Lite packet
    * 
    * [Arguments]
    * - None
    *  
    * [Returen value]
    * - a new TID
    * ---------------------------------------------------------------- */
    assignTid() {
        this._tid = (this._tid + 1) % 0xffff;
        return this._tid;
    }

    /* ------------------------------------------------------------------
    * parse(pbuf)
    * - Parse a `Bufer` object representing an ECHONET Lite packet
    * - SetGet (ESV: 0x6E) and SetGet_Res (ESV: 0x7E) packets are not supported.
    * 
    * [Arguments]
    * - pbuf     | Buffer  | Required | `Bufer` object representing an ECHONET Lite packet
    *  
    * [Returen value]
    * - An object representing an EHCONET Lite packet
    * - If failed to parse the `Buffer` object, this method will return `null`;
    * ---------------------------------------------------------------- */
    parse(pbuf) {
        if (!pbuf || !Buffer.isBuffer(pbuf) || pbuf.length < 14) {
            return null;
        }

        // EHD (ECHONET Lite Header)
        if (pbuf.subarray(0, 2).readUInt16BE(0) !== 0x1081) {
            return null;
        }

        // TID (Transaction ID)
        const tid = pbuf.readUInt16BE(2);

        // SEOJ (Source ECHONET Object)
        const seoj = pbuf.subarray(4, 7).toString('hex').toUpperCase();

        // DEOJ (Destination ECHONET Object)
        const deoj = pbuf.subarray(7, 10).toString('hex').toUpperCase();

        // ESV (ECHONET Lite Service)
        //const esv = pbuf.readUInt8(10);
        const esv = pbuf.subarray(10, 11).toString('hex').toUpperCase();
        if (esv === '6E' || esv === '7E') {
            return;
        }

        // OPC (Processing Target Property Counters)
        const opc = pbuf.readUInt8(11);

        // EPCs
        const props = [];
        let offset = 12;

        for (let i = 0; i < opc; i++) {
            // EPC (ECHONET Property)
            const epc = pbuf.subarray(offset, offset + 1).toString('hex').toUpperCase();
            offset++;

            // PDC (Property Data Counter)
            const pdc = pbuf.readUInt8(offset);
            offset++;

            // EDT (ECHONET Property Value Data)
            const edt = pbuf.subarray(offset, offset + pdc).toString('hex').toUpperCase();
            props.push({
                epc: epc,
                edt: edt,
                data: this._elparser.parse(seoj, epc, edt)
            });
            offset += pdc;
        }

        const packet = {
            tid: tid,
            seoj: seoj,
            deoj: deoj,
            esv: esv,
            opc: opc,
            props: props
        };
        return packet;
    }

    /* ------------------------------------------------------------------
    * compose(packet)
    * - Compose a `Bufer` object representing an ECHONET Lite packet
    * 
    * [Arguments]
    * - packet     | Object  | Required    | 
    *   - tid      | Integer | Required    | TID (Transaction ID)
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
    * - `Bufer` object representing an ECHONET Lite packet
    * ---------------------------------------------------------------- */
    compose(packet = {}) {
        const buf_list = [];

        // EHD
        buf_list.push(Buffer.from('1081', 'hex'));

        // TID
        const tid = packet.tid;
        if (typeof (tid) !== 'number' || tid % 1 !== 0 || tid < 0 || tid > 0xffff) {
            throw new Error('The `tid` must be an integer between 0 and 0xffff.');
        }
        const tid_buf = Buffer.alloc(2);
        tid_buf.writeUInt16BE(tid);
        buf_list.push(tid_buf);

        // SEOJ
        const seoj = packet.seoj || '05FF01';
        if (typeof (seoj) !== 'string' || !/^[0-9a-fA-F]{6}$/.test(seoj)) {
            throw new Error('The `seoj` is invaid.');
        }
        buf_list.push(Buffer.from(seoj, 'hex'));

        // DEOJ
        const deoj = packet.deoj || '028801';
        if (typeof (deoj) !== 'string' || !/^[0-9a-fA-F]{6}$/.test(deoj)) {
            throw new Error('The `deoj` is invaid.');
        }
        buf_list.push(Buffer.from(deoj, 'hex'));

        // ESV
        const esv = packet.esv || '62';
        if (typeof (esv) !== 'string' || !/^(61|62)$/.test(esv)) {
            throw new Error('The `esv` is invalid.');
        }
        buf_list.push(Buffer.from(esv, 'hex'));

        // Properties
        const props = packet.props;
        if (!props || !Array.isArray(props) || props.length === 0) {
            throw new Error('The `props` must be a non-empty `Array` object.')
        }

        // OPC
        buf_list.push(Buffer.from([props.length]));

        for (const prop of props) {
            if (typeof (prop) !== 'object') {
                throw new Error('The `props` is invalid.');
            }

            // EPC
            const epc = prop.epc;
            if (!epc || !/^[0-9a-fA-F]{2}$/.test(epc)) {
                throw new Error('The `epc` is invalid.');
            }
            buf_list.push(Buffer.from(epc, 'hex'));

            if (esv === '62') { // Get
                buf_list.push(Buffer.from([0]));

            } else if (esv === '61') { // SetC
                const edt = prop.edt;

                if (!edt) {
                    throw new Error('The `edt` is required when the `esv` is "61" (SetC).');
                }

                if (typeof (edt) === 'string') {
                    if (edt.length === 0) {
                        throw new Error('The `edt` must be a non-empty `Buffer` object.');
                    } else if (/[^0-9a-fA-F]/.test(edt) || edt.length % 2 !== 0) {
                        throw new Error('The `edt` must be given in hexadecimal.')
                    }
                    const edt_buf = Buffer.from(edt, 'hex');
                    buf_list.push(Buffer.from([edt_buf.length]));
                    buf_list.push(edt_buf);

                } else if (Buffer.isBuffer(edt)) {
                    if (edt.length === 0) {
                        throw new Error('The `edt` must be a non-empty `Buffer` object.');
                    }
                    buf_list.push(Buffer.from([edt.length]));
                    buf_list.push(edt);

                } else {
                    throw new Error('The `edt` must be a string or a `Buffer` object.');
                }
            }
        }

        // Compose a packet as a `Buffer` object
        const buf = Buffer.concat(buf_list);
        return buf;
    }
}

module.exports = WisunrbElpacket;
