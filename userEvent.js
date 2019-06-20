"use strict";

const moment = require('moment');
moment.locale('uk');

module.exports = class userEvent {
    constructor(obj = {}) {
        this.id   = obj.id || 0;
        this.name = obj.name || '';
        this.date = obj.date || 0;
        this.upd  = obj.upd || moment().unix();
        this.total = 0;
        this.entered = 0;
    }

    getDate() {
        const m = moment(this.date * 1000);
        return m.format('dd DD MMM HH:mm');
    }

    calc(db, callback) {
        var _this = this;
        db.get("SELECT COUNT(*) tot, SUM((CASE dt_enter WHEN 0 THEN 0 ELSE 1 END)) ent FROM Places WHERE ev = ?", [this.id], (err, row) => {
            if(row) {
                this.total = row.tot;
                this.entered = row.ent;
            }
            callback(_this.json());
        });
    }

    json() {
        return {
            i:this.id,
            n:this.name,
            d:this.getDate(),
            t:this.total,
            e:this.entered
        };
    }

    title() {
        return this.name + ' ' + this.getDate();
    }

    update(service, db) {
        return 0;
    }
};
