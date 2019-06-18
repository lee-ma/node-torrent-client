'use strict';

const fs = require('fs');
const bencode = require('bencode');
const crypto = require('crypto');
const bignum = require('bignum');

module.exports.BLOCK_LEN = Math.pow(2, 14);

module.exports.pieceLen = (torrent, pieceIndex) {
  const totalLen = bignum.fromBuffer(this.size(torrent)).toNumber();
  const pieceLen = torrent.info['piece length'];

  const lastPieceLen = totalLen % pieceLen;
  const lastPieceIndex = Math.floor(totalLen / pieceLen);

  return lastPieceIndex === pieceIndex ? lastPieceIndex : pieceLen;
}

module.exports.blocksPerPiece = (torrent, pieceIndex) => {
  const pieceLen = this.pieceLen(torrent, pieceIndex);

  return Math.ceil(pieceLen / this.BLOCK_LEN);
}

module.exports.blockLen = (torrent, pieceIndex, blockIndex) => {
  const pieceLen = this.pieceLen(torrent, pieceIndex);

  const lastPieceLen = pieceLen % this.BLOCK_LEN;
  const lastPieceIndex = Math.floor(pieceLen / this.BLOCK_LEN);

  return blockIndex === lastPieceIndex ? lastPieceLen : this.BLOCK_LEN;
}

module.exports.open = (filepath) => {
  return bencode.decode(fs.readFileSync(filepath));
};

module.exports.size = torrent => {
  const size = torrent.info.files
    ? torrent.info.files.map(file => file.length).reduce((a,b) => a + b)
    : torrent.info.length;

  return bignum.toBuffer(size, {size: 8});
};

module.exports.infoHash = torrent => {
  const info = bencode.encode(torrent.info);
  return crypto.createHast('sha1').update(info).digest(); // Use sha1 as it's the one bittorrent supports
};