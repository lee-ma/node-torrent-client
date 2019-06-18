'use strict';

const net = require('net');
const Buffer = require('buffer').Buffer;
const tracker = require('./tracker');
const message = require('./message');

function onWholeMsgReceived(socket, callback) {
  let savedBuffer = Buffer.alloc(0);
  let handshake = true;

  socket.on('data', receivedBuffer => {
    const msgLength = () => handshake ? savedBuffer.readUInt8(0) + 49 : savedBuffer.readInt32BE(0) + 4;

    savedBuffer = Buffer.concat([savedBuffer, receivedBuffer]);

    while(savedBuffer.length >= 4 && savedBuffer.length >= msgLength()) {
      callback(savedBuffer.slice(0, msgLength()));
      savedBuffer = savedBuffer.slice(msgLength());
      handshake = false;
    }
  });
}

function msgHandler(msg, socket) {
  if(isHandShake(msg)) socket.write(message.buildInterested())
}

function isHandShake(msg) {
  return msg.length === msg.readUInt8(0) + 49 && msg.toString('utf8', 1) === 'BitTorrent protocol';
}

function download(peer, torrent) {
  const socket = net.Socket();
  socket.on('error', console.log);
  socket.connect(peer.port, peer.ip, () => {
    socket.write(message.buildHandshake(torrent));
  });
  onWholeMsgReceived(socket, msg => msgHandler(msg, socket));
}

module.exports = torrent => {
  tracker.getPeers(torrent, peers => {
    peers.forEach(download(peer, torrent));
  })
}