'use strict';

const _ = require('lodash');
const express = require('express');
const sprintf = require('sprintf');
const md5 = require('md5');
const moment = require('moment');
const sqlite3 = require('sqlite3').verbose();
const config = require('./config.json');
const defaultConfig = config.development;
const environment = process.env.NODE_ENV || 'development';
const environmentConfig = config[environment];
const finalConfig = _.merge(defaultConfig, environmentConfig);
const userEvent = require('./userEvent.js');
const updateService = require('./updateService.js');

global.gConfig = finalConfig;
global.update = {
    count  : 0,
    status : 'not started'
};
global.event = new userEvent();

moment.locale('uk');

// Constants
const PORT = global.gConfig.node_port;
const HOST = '0.0.0.0';

const db = new sqlite3.Database(global.gConfig.database);
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='Events';", (err, q)=>{
    if(q&&q.length) {
        //
    } else {
        db.exec('CREATE TABLE IF NOT EXISTS Events (id integer, name text, date integer, upd integer, primary key(id))');
        db.exec('CREATE TABLE IF NOT EXISTS Places (ev integer, code text, price real, name text, note text, dt_enter integer, upd integer, primary key(ev, code))');
        db.exec('CREATE TABLE IF NOT EXISTS Log (ev integer, dt_enter integer, dt_scan integer, code text, name text, result integer)');
    }
});

const upd = new updateService(db);
//upd.updateEvents();

const tmBeg = moment().startOf('day').unix();
const tmEnd = moment().endOf('day').unix();
db.all(`SELECT * FROM Events WHERE date BETWEEN ? AND ?`, [tmBeg, tmEnd] , (err, rows) => {
    if(rows && rows.length == 1) {
        global.event = new userEvent(rows[0]);
        console.log(sprintf("Scan #%d %s", global.event.id, global.event.title()));
    }
});

// App
const app = express();
app.get('/', (req, res) => {
    var events = [];
    const tmBeg = moment().startOf('day').unix();
    const tmEnd = moment().endOf('day').unix();
    const add = global.event.id ? `AND id = ${global.event.id}` : '';
    db.each(`SELECT * FROM Events WHERE date BETWEEN ? AND ? ${add}`, [tmBeg, tmEnd] , (err, row) => {
        if(row) {
            const e = new userEvent(row);
            events.push(e.json());
        }
        return true;
    }, (err, cnt) => {
        if(cnt == 0) {
            db.each(`SELECT * FROM Events WHERE date > ? ${add}`, [tmBeg] , (err, row) => {
                if(err) {
                    res.json({error:err.message});
                    return false;
                }
                if(row) {
                    const e = new userEvent(row);
                    events.push(e.json());
                }
                return true;
            }, (err, cnt) => {
                console.log('listed ' + cnt + ' events');
                res.json(events);
            });
        } else {
            console.log('listed ' + cnt + ' events');
            res.json(events);
        }
    });
});

app.get('/scan/:eid(\\d+)', (req, res) => {
    const eid = parseInt(req.params.eid);
    var ans = { status: 'Wrong params' };
    db.get("SELECT * FROM Events WHERE id = ?", [eid], (err, row) => {
        if(err) {
            ans.status = err.message;
        } else {
            global.event = new userEvent(row);
            ans.status = global.event.id ? 'ok' : 'Wrong id';
            if(global.event.id) {
                console.log(sprintf("Scan #%d %s", global.event.id, global.event.title()));
            }
        }
        res.json(ans);
    });
});

app.get('/event', (req, res) => {
    res.send(''+global.event.id);
});

app.get('/update', (req, res) => {
    upd.updateEvents();
    global.update.count = 0;
    global.update.status = 'started';
    res.json(global.update);
});

app.get('/update/status', (req, res) => {
    res.json(global.update);
});

app.get('/check/:code', (req, res) => {
    const code = req.params.code;
    if(!global.event.id) {
        res.send('no');
    } else {
        var ans = 'bad';
        db.get("SELECT * FROM Places WHERE ev = ? AND code = ?", [global.event.id, code], (err, row) => {
            if(err) {
                ans = err.message;
            } else {
                if(row) {
                    var log = new userLog(row);
                    ans.status = global.event.id ? 'ok' : 'Wrong id';
                }
            }
            res.send(ans);
        });
    }
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);