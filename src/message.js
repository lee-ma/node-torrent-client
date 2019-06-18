'use strict';

const Buffer = require('buffer').Buffer;
const torrentParser = require('./torrent-parser');
const util = require('../util');

/**
 * handshake: <pstrlen><pstr><reserved><info_hash><peer_id>

pstrlen: string length of <pstr>, as a single raw byte
pstr: string identifier of the protocol
reserved: eight (8) reserved bytes. All current implementations use all zeroes.
peer_id: 20-byte string used as a unique ID for the client.

In version 1.0 of the BitTorrent protocol, pstrlen = 19, and pstr = "BitTorrent protocol".
 */

module.exports.buildHandshake = torrent => {
  const buffer = Buffer.alloc(68);

  //pstrlen
  buffer.writeUInt8(19, 0);
  //pstr
  buffer.write('BitTorrent protocol', 1);
  //reserved
  buffer.writeUInt32BE(0, 20);
  buffer.writeUInt32BE(0, 24);
  //info hash
  torrentParser.infoHash(torrent).copy(buffer, 28);
  //peer id
  buffer.write(util.genId());
  return buffer;
};

module.exports.buildKeepAlive = () => Buffer.alloc(4);

module.exports.buildChoke = () => {
  const buffer = Buffer.alloc(5);
  //length
  buffer.writeUInt32BE(1, 0);
  //id
  buffer.writeUInt8(0, 4);
  return buffer;
};

module.exports.buildUnchoke = () => {
  const buffer = Buffer.alloc(5);
  //length
  buffer.writeUInt32BE(1, 0);
  //id
  buffer.writeUInt8(1, 4);
  return buffer;
};

module.exports.buildUninterested = () => {
  const buffer = Buffer.alloc(5);
  //length
  buffer.writeInt32BE(1, 0);
  //id
  buffer.writeUInt8(3, 4);
  return buffer;
};

module.exports.buildHave = payload => {
  const buffer = Buffer.alloc(9);
  //length
  buffer.writeUInt32BE(5, 0);
  //id
  buffer.writeUInt8(4, 4);
  //piece index
  buffer.writeUInt32BE(payload, 5);

  return buffer;
};

module.exports.buildBitfield = bitfield => {
  const buffer = Buffer.alloc(14);
  //length
  buffer.writeUInt32BE(payload.length + 1, 0);
  //id
  buffer.writeUInt8(5, 4);
  //bitfield
  bitfield.copy(buffer, 5);
  return buffer;
}

module.exports.buildRequest = payload => {
  const buffer = Buffer.alloc(17);
  // length
  buffer.writeUInt32BE(13, 0);
  // id
  buffer.writeUInt8(6, 4);
  // piece index
  buffer.writeUInt32BE(payload.index, 5);
  // begin
  buffer.writeUInt32BE(payload.begin, 9);
  // length
  buffer.writeUInt32BE(payload.length, 13);
  return buffer;
};

module.exports.buildPiece = payload => {
  const buffer = Buffer.alloc(payload.block.length + 13);
  // length
  buffer.writeUInt32BE(payload.block.length + 9, 0);
  // id
  buffer.writeUInt8(7, 4);
  // piece index
  buffer.writeUInt32BE(payload.index, 5);
  // begin
  buffer.writeUInt32BE(payload.begin, 9);
  // block
  payload.block.copy(buffer, 13);
  return buffer;
};

module.exports.buildCancel = payload => {
  const buffer = Buffer.alloc(17);
  // length
  buffer.writeUInt32BE(13, 0);
  // id
  buffer.writeUInt8(8, 4);
  // piece index
  buffer.writeUInt32BE(payload.index, 5);
  // begin
  buffer.writeUInt32BE(payload.begin, 9);
  // length
  buffer.writeUInt32BE(payload.length, 13);
  return buffer;
};

module.exports.buildPort = payload => {
  const buffer = Buffer.alloc(7);
  // length
  buffer.writeUInt32BE(3, 0);
  // id
  buffer.writeUInt8(9, 4);
  // listen-port
  buffer.writeUInt16BE(payload, 5);
  return buffer;
};
