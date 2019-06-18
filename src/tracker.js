'use strict';

const dgram = require('dgram');
const Buffer =  require('buffer').Buffer;
const urlParse = require('url').parse;
const crypto = require('crypto');

const torrentParser = require('./torrent-parser');
const util = require('./util');

function udpSend(socket, message, rawUrl, callback=()=>{}) {
  const url = urlParse(rawUrl);
  socket.send(message, 0, message.length, url.port, url.host, callback);
};

function getResType(res) {
  const action = res.readUInt32BE(0);
  if(action === 0) return 'connect';
  if(action === 1) return 'announce';
}

function buildConnectionRequest() {
  /**
   * connection request format
   * 
   * Offset   Size        Name              Value
   * 0        64b' int    connection_id       0x41727101980
   * 8        32b' int    action              0 (for connect)
   * 12       32b' int    transaction_id     random
   */

  const buffer = Buffer.alloc(16);

  //connection id
  buffer.writeUInt32BE(0x417, 0);
  buffer.writeUInt32BE(0x27101980, 4);

  //action
  buffer.writeUInt32BE(0, 8);

  //transaction id
  crypto.randomBytes(4).copy(buffer, 12);

  return buffer;
}

function parseConnectionResponse(res) {
  /**
   * response format:
   * 
   * Offset   Size      Name              Value
   * 0        32b' int  action              0 (for connect)
   * 4        32b' int  transaction_id      rand
   * 8        64b' int  connection_id       rand
   */

  return {
    action: res.readUInt32BE(0),
    transactionId: res.readUInt32BE(4),
    connectionId: res.slice(8)
  }
}

function buildAnnounceRequest(connectionId, torrent, port=6881) {
  /**
   *  Announce request format
   * 
   * Offset  Size    Name    Value
      0       64-bit integer  connection_id
      8       32-bit integer  action          1 // announce
      12      32-bit integer  transaction_id
      16      20-byte string  info_hash
      36      20-byte string  peer_id
      56      64-bit integer  downloaded
      64      64-bit integer  left
      72      64-bit integer  uploaded
      80      32-bit integer  event           0 // 0: none; 1: completed; 2: started; 3: stopped
      84      32-bit integer  IP address      0 // default
      88      32-bit integer  key             ? // random
      92      32-bit integer  num_want        -1 // default
      96      16-bit integer  port            ? // should be betwee
  */

  const buffer = Buffer.allocUnsafe(98);

  //connection id
  connectionId.copy(buffer, 0);
  //action
  buffer.writeUInt32BE(1, 8);
  //transaction id
  crypto.randomBytes(4).copy(buffer, 12);
  //info has
  torrentParser.infoHash(torrent).copy(buffer, 16);
  // peer id
  util.genId().copy(buffer, 36);
  // downloaded
  Buffer.alloc(8).copy(buffer, 56);
  //left
  torrentParser.size(torrent).copy(buffer, 64);
  //uploaded
  Buffer.alloc(8).copy(buffer, 72);
  //event
  buffer.writeUInt32BE(0, 80);
  //ip address
  buffer.writeUInt32BE(0, 84);
  // key
  crypto.randomBytes(4).copy(buffer, 88);
  //num want
  buffer.writeInt32BE(-1, 92);
  //port
  buffer.writeUInt16BE(port, 96);

  return buffer;
}

function parseAnnounceResponse(res) {
  /**
   * response format
   * 
   * Offset      Size            Name            Value
      0           32-bit integer  action          1 // announce
      4           32-bit integer  transaction_id
      8           32-bit integer  interval
      12          32-bit integer  leechers
      16          32-bit integer  seeders
      20 + 6 * n  32-bit integer  IP address
      24 + 6 * n  16-bit integer  TCP port
      20 + 6 * N
   */

  function group(iterable, groupSize) {
    let groups = [];
    for(let i = 0; i < iterable.length; i += groupSize) {
      groups.push(iterable.slice(i, i + groupSize));
    }

    return groups;
  }

  return {
    action: res.readUInt32BE(0),
    transactionId: res.readUInt32BE(4),
    leechers: res.readUInt32BE(12),
    seeders: res.readUInt32BE(16),
    peers: group(res.slice(20), 6).map(address => {
      return {
        ip: address.slice(0, 4).join('.'),
        port: address.readUInt16BE(4)
      }
    })
  }
}

module.exports.getPeers = (torrent, callback) => {
  const socket = dgram.createSocket('udp4');
  const url = torrent.announce.toString('utf8');

  udpSend(socket, buildConnectionRequest(), url);

  socket.on('message', response => {
    if(getResType(response) === 'connect') {

      const connectionResponse = parseConnectionResponse(response);
      const announceRequest = buildAnnounceRequest(connectionResponse.connectionId, torrent);

      udpSend(socket, announceRequest, url);
    } else if(getResType(response) === 'announce') {

      const announceResponse = parseAnnounceResponse(response);

      callback(announceResponse.peers);
    }
  });
};