'use strict';

const fs = require('fs');
const net = require('net');
const Buffer = require('buffer').Buffer;
const tracker = require('./tracker');
const message = require('./message');

const Pieces = require('./Pieces');
const Queue = require('./Queue');

function isJobQueueEmpty(queue) {
  return queue.length === 0;
}

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

function requestPiece(socket, pieces, jobQueue) {
  if(jobQueue.choked) return null;

  while(jobQueue.length()) {
    const pieceBlock = jobQueue.deque();

    if(pieces.needed(pieceBlock)) {
      socket.write(message.buildRequest(pieceBlock));
      pieces.addRequested(pieceBlock);
      break;
    }
  }
}

function chokeHandler() {
  socket.end();
}

function unchokeHandler(socket, pieces, jobQueue) {
  jobQueue.choked = false;

  requestPiece(socket, pieces, jobQueue);
}

function haveHandler(socket, pieces, jobQueue, payload) {
  const pieceIndex = payload.readUInt32BE(0);
  const jobQueueEmpty = isJobQueueEmpty(jobQueue)
  jobQueue.queue(pieceIndex);

  if(jobQueueEmpty) requestPiece(socket, pieces, jobQueue);
}

function bitfieldHandler(socket, pieces, jobQueue, payload) {
  const jobQueueEmpty = isJobQueueEmpty(jobQueue);
  payload.forEach((byte, i) => {
    for(let j = 0; j < 8; j++) {
      if(byte % 2) jobQueue.queue(i * 8 + 7 - j);
      byte = Math.floor(byte/2);
    }
  });
  if(jobQueueEmpty) requestPiece(socket, pieces, jobQueue);
}

function pieceHandler(socket, pieces, jobQueue, torrent, file, pieceResponse) {
  pieces.printPercentDone();

  pieces.addReceived(pieceResponse);

  const offset = pieceResponse.index * torrent.info['piece length'] + pieceResponse.begin;
  fs.write(file, pieceResponse.block, 0, pieceResponse.block.length, offset, () => {});

  if(pieces.isDone()) {
    console.log("----DONE-----");
    socket.end();
    try { 
      fs.closeSync(file); 
    } catch(e) { 
      console.log(e)
    }
  } else {
    requestPiece(socket, pieces, jobQueue);
  }

  jobQueue.shift();
  requestPiece(socket, pieces, jobQueue);
}

function msgHandler(msg, socket, pieces, jobQueue) {
  if(isHandShake(msg)) {
    socket.write(message.buildInterested());
  } else {
    const m = message.parse(msg);

    switch(m.id) {
      case 0:
        chokeHandler(socket);
        break;
      case 1:
        unchokeHandler(socket, pieces, jobQueue);
        break;
      case 4:
        haveHandler(socket, pieces, jobQueue, m.payload);
        break;
      case 5:
        bitfieldHandler(socket, pieces, jobQueue, m.payload);
        break;
      case 7:
        pieceHandler(socket, pieces, jobQueue, torrent, file, m.payload);
        break;
      default:
        return;
    }
  }
}

function isHandShake(msg) {
  return msg.length === msg.readUInt8(0) + 49 && msg.toString('utf8', 1, 20) === 'BitTorrent protocol';
}

function download(peer, torrent, pieces, file) {
  const socket = net.Socket();
  socket.on('error', console.log);
  socket.connect(peer.port, peer.ip, () => {
    socket.write(message.buildHandshake(torrent));
  });
  const jobQueue = new Queue(torrent);
  onWholeMsgReceived(socket, msg => msgHandler(msg, socket, pieces, jobQueue, torrent, file));
}

module.exports = torrent => {
  tracker.getPeers(torrent, peers => {
    const pieces = new Pieces(torrent);
    const file = fs.openSync(path, 'w');
    peers.forEach(download(peer, torrent, pieces, file));
  })
}