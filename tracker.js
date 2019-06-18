'use strict';

const dgram = require('dgram');
const Buffer =  require('buffer').Buffer;
const urlParse = require('url').parse;

function udpSend(socket, message, rawUrl, callback = () => {
  const url = urlParse(rawUrl);
  socket.send(message, 0, message.length, url.port, url.host, callback);
});

function getResType(res) {
  
}

function buildConnectionRequest() {

}

function parseConnectionResponse(res) {

}

function buildAnnounceRequest(connectionId) {

}

function parseAnnounceResponse(res) {

}

module.exports.getPeers = (torrent, callback) => {
  const socket = dgram.createSocket('udp4');
  const url = torrent.announce.toString('utf8');

  udpSend(socket, buildConnectionRequest(), url);

  socket.on('message', response => {
    if(getResType(response) === 'connect') {

      const connectionResponse = parseConnectionResponse(response);
      const announceRequest = buildAnnounceRequest(connectionResponse.connectionId);

      udpSend(socket, announceRequest, url);
    } else if(getResType(response) === 'announce') {

      const announceResponse = parseAnnounceResponse(response);

      callback(announceResponse.peers);
    }
  });
};