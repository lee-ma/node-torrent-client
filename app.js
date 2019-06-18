'use strict';
const fs = require('fs');
const bencode = require('bencode');
const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;

const tracker = require('./tracker');

const torrent = bencode.decode(fs.readFileSync('puppy.torrent'));
const url = urlParse(torrent.announce.toString('utf8'));
const socket = dgram.createSocket('udp4');

const socketMsg = Buffer.from('test message', 'utf8');

tracker.getPeers(torrent, peers => {
  console.log('list of peers: ', peers);
});
