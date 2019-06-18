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

function requestPiece(socket, requested, queue) {
  if(requested[queue[0]]) {
    queue.shift();
  } else {
    socket.write(message.buildRequest(pieceIndex));
  }
}

function chokeHandler() {

}

function unchokeHandler() {

}

function haveHandler(payload, socket, requested, jobQueue) {
  const pieceIndex = payload.readUInt32BE(0);
  jobQueue.push(pieceIndex);

  if(jobQueue.length === 1) {
    requestPiece(socket, requested, jobQueue);
  }
}

function bitfieldHandler(payload) {

}

function pieceHandler(payload, socket, requested, jobQueue) {
  jobQueue.shift();
  requestPiece(socket, requested, jobQueue);
}

function msgHandler(msg, socket, requested, jobQueue) {
  if(isHandShake(msg)) {
    socket.write(message.buildInterested());
  } else {
    const m = message.parse(msg);

    switch(m.id) {
      case 0:
        chokeHandler();
        break;
      case 1:
        unchokeHandler();
        break;
      case 4:
        haveHandler(m.payload, socket, requested, jobQueue);
        break;
      case 5:
        bitfieldHandler(m.payload);
        break;
      case 7:
        pieceHandler(m.payload, socket, requested, jobQueue);
        break;
      default:
        return;
    }
  }
}

function isHandShake(msg) {
  return msg.length === msg.readUInt8(0) + 49 && msg.toString('utf8', 1) === 'BitTorrent protocol';
}

function download(peer, torrent, requested) {
  const socket = net.Socket();
  socket.on('error', console.log);
  socket.connect(peer.port, peer.ip, () => {
    socket.write(message.buildHandshake(torrent));
  });
  const jobQueue = [];
  onWholeMsgReceived(socket, msg => msgHandler(msg, socket, requested, jobQueue));
}

module.exports = torrent => {
  tracker.getPeers(torrent, peers => {
    peers.forEach(download(peer, torrent, requested));
  })
}