"use strict";

const moment = require('moment');
moment.locale('uk');

module.exports = class scanLog {
    constructor(obj = {}) {
        this.ev   = obj.ev || 0;
        this.code = obj.code || '';
        this.name = obj.name || '';
        this.note = obj.note || '';
        this.dt_enter = obj.dt_enter || 0;
        this.dt_scan = obj.dt_scan || 0;
        this.result  = obj.result || moment().unix();
        this.price = obj.price || 0;
    }

    getTime() {
        const m = moment(this.date * 1000);
        return m.format('HH:mm:ss');
    }

    json() {
        return {
            c:this.code,
            n:this.name,
            x:this.note,
            p:this.note,
            d:this.getDate()
        };
    }

    title() {
        return this.name + ' ' + this.getDate();
    }

    update(service, db) {
        return 0;
    }
};
