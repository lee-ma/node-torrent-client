'use strict';
const fs = require('fs');
const bencode = require('bencode');
const dgram = require('dgram');
const Buffer = require('buffer').Buffer;
const urlParse = require('url').parse;

const torrent = bencode.decode(fs.readFileSync('puppy.torrent'));
const url = urlParse(torrent.announce.toString('utf8'));
const socket = dgram.createSocket('udp4');

const socketMsg = Buffer.from('test message', 'utf8');

socket.send(socketMsg, 0, socketMsg.length, url.port, url.host, () => {});
socket.on('message', msg => {
  console.log(msg);
});