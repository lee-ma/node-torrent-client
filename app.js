'use strict';
const fs = require('fs');
const bencode = require('bencode');
const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;

const tracker = require('./src/tracker');
const download = require('./src/download');
const torrentParser = require('./src/torrent-parser');

const torrent = torrentParser.open(process.argv[2]);

download(torrent);