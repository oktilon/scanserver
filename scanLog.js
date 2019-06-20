"use strict";

const moment = require('moment');
moment.locale('uk');

module.exports = class scanLog {
    constructor(arg, ev, req) {
        if(typeof arg == 'object') {
            this.ev   = arg.ev || 0;
            this.dt_scan = arg.dt_scan || 0;
            this.dt_enter = arg.dt_enter || 0;
            this.code = arg.code || '';
            this.name = arg.name || '';
            this.note = arg.note || '';
            this.price = arg.price || 0;
            this.result = arg.result || 0;
            this.scan = arg.scan || '';
        } else {
            this.ev   = ev.id || 0;
            this.dt_scan = moment().unix();
            this.dt_enter = 0;
            this.code = arg || '';
            this.name = 'Wrong code';
            this.note = '';
            this.price = 0;
            this.result = 0;
            this.scan = this.readScan(req);
        }
    }

    readScan(req) {
        var scan = req.get('Scanner');
        if(scan != void(0)) return scan;
        return req.ip;
    }

    err(txt) {
        this.name = 'Error';
        this.note = txt;
    }

    row(obj) {
        if(obj) {
            this.name = obj.name || '';
            this.note = obj.note || '';
            this.dt_enter = obj.dt_enter || 0;
            this.price = obj.price || 0;
            if(this.dt_enter == 0) {
                this.dt_enter = this.dt_scan;
                this.result = 1;
            } else {
                this.result = 2;
            }
        } else {
            this.result = 3;
        }
    }

    save(db) {
        db.exec('INSERT INTO Log (ev, dt_enter, dt_scan, code, name, note, price, result, scan)' +
                ' VALUES (?,?,?,?,?,?,?,?,?)',             this.ev,
            this.dt_enter,
            this.dt_scan,
            this.code,
            this.name,
            this.note,
            this.price,
            this.result,
            this.scan
);
        if(this.result == 1) {
            db.exec('UPDATE INTO Places SET dt_enter = ? WHERE ev = ? AND code = ?', this.dt_enter, this.ev, this.code);
        }
    }

    json() {
        return {
            e:this.ev,
            d:this.dt_enter,
            sc:this.dt_scan,
            r:this.result,
            c:this.code,
            n:this.name,
            x:this.note,
            p:this.price,
            s:this.scan
        };
    }
};
