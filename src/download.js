'use strict';

const net = require('net');
const Buffer = require('buffer').Buffer;
const tracker = require('./tracker');

function download(peer) {
  const socket = net.Socket();
  socket.on('error', console.log);
  socket.connect(peer.port, peer.ip, () => {

  });
  socket.on('data', data => {

  });
}

module.exports = torrent => {
  tracker.getPeers(torrent, peers => {
    peers.forEach(download);
  })
}