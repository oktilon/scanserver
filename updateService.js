"use strict";

const sprintf = require('sprintf');
const md5 = require('md5');
const http = require('http');
const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const moment = require('moment');
const userEvent = require('./userEvent.js');
moment.locale('uk');

module.exports = class updateService {
    constructor(db) {
        this.url = global.gConfig.ticket_server;
        this.db = db;
        this.now = moment().unix();
        this.eid = 0;
    }

    evalHash(page) {
        const m = moment();
        return md5(sprintf(global.gConfig.ticket_fmt, page, m.format(global.gConfig.ticket_str)));
    }

    updateEvents() {
        var data = '';
        var url = this.url + 'get_list/' + this.evalHash('list');
        const options = new URL(url);
        const db = this.db;

        process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

        const service = global.gConfig.service == 'https' ? https : http;
        const _this = this;

        const req = service.request(options, (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                var ans = JSON.parse(data);
                _this.now = moment().unix();
                if(ans && ans.status == 'ok' && ans.data && ans.data.length) {
                    db.serialize(() => {
                        var stmt = db.prepare("REPLACE INTO Events (id, name, date, upd) VALUES (?,?,?,?)");
                        ans.data.forEach((event) => {
                            stmt.run(event.i, event.n, event.d, _this.now);
                        });
                        stmt.finalize();
                    });

                    var events = [];
                    db.each("SELECT * FROM Events", (err, row) => {
                        if(err) console.error("update query error: " + err.message);
                        else if(row) events.push(new userEvent(row));
                        return true;
                    }, (err, cnt) => {
                        var maxCnt = cnt;
                        if(cnt) {
                            _this.updatePlaces(events);
                        }
                    });
                }
            });
        });

        req.on('error', (e) => {
            console.error(`update error: ${e.message}`);
            global.update.status = 'error: ' + e.message;
        });

        console.log('run update');

        // write data to request body
        //req.write(postData);
        req.end();
    }

    updatePlaces(events) {
        console.log("read places. events left = " + events.length);
        var ev = events.shift();
        this.eid = ev.id;
        var url = this.url + 'get_places/' + ev.id + '/' + this.evalHash('places-' + ev.id);
        const options = new URL(url);
        const db = this.db;
        console.log(url);

        var data = '';
        var counter = 0;
        process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

        const service = global.gConfig.service == 'https' ? https : http;
        const _this = this;

        const req = service.request(options, (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                var ans = JSON.parse(data),
                    max = ans && ans.data && ans.data.length ? ans.data.length : 0;
                    _this.now = moment().unix();
                console.log(ev.id + "=" + max);
                if(ans && ans.status == 'ok' && max) {
                    var places = ans.data;
                    _this.writePlaces(places, () => {
                        if(events.length == 0) {
                            global.update.status = 'ok';
                            console.log("update end writed", events);
                        } else {
                            _this.updatePlaces(events);
                        }
                    });
                } else {
                    if(events.length == 0) {
                        global.update.status = 'ok';
                        console.log("update end empty");
                    } else {
                        _this.updatePlaces(events);
                    }
                }
            });
        });

        req.on('error', (e) => {
            console.error(`update error: ${e.message}`);
            global.update.status = 'error: ' + e.message;
        });

        req.end();
    }

    writePlaces(places, callback) {
        var p = places.shift();
        var _this = this;
        _this.db.run("REPLACE INTO Places (ev, code, price, name, note, upd) VALUES (?,?,?,?,?,?)", [_this.eid, p.c, p.p, p.n, p.x, _this.now], (err) => {
            if(!err) global.update.count += this.changes;
            if(places.length == 0) {
                callback();
            } else {
                _this.writePlaces(places, callback);
            }
        });
    }
}