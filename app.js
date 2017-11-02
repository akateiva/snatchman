const irc = require('irc');
const log = require('pino')();
const twitter = require('./twitter-client.js');

const nconf = require('nconf');
nconf.file({file: 'config.json'})

log.info('[irc] starting client')
let c = new irc.Client('irc.scratch-network.net', nconf.get('bot:username'), {
  userName: nconf.get('bot:username'),
  realName: 'bot',
  port: 6697,
  secure: true
})

const r = /(.+?) - (.+) \[(\d+)\] \[([^\]]+)\] - (MP3|FLAC|Ogg|AAC|AC3|DTS|Ogg Vorbis) \/ ((?:24bit)?(?: ?Lossless)?(?:[\d|~|\.xVq|\s]*(?:AAC|APX|APS|Mixed|Auto|VBR)?(?: LC)?)?(?: ?(?:\(VBR\)|\(?ABR\)?|[K|k][b|p]{1,2}s)?)?)(?: \/ (?:Log))?(?: \/ (?:[-0-9\.]+)\%)?(?: \/ (?:Cue))?(?: \/ (CD|DVD|Vinyl|Soundboard|SACD|Cassette|DAT|WEB|Blu-ray))(?: \/ (Scene))?(?: \/ (?:Freeleech!))? - https:\/\/redacted\.ch\/torrents\.php\?id=(\d+) \/ https:\/\/redacted\.ch\/torrents\.php\?action=download&id=(\d+) - ?(.*)/g

c.addListener('registered', () => {
  log.info('[irc] client registered, entering announce chan');
  c.say('Drone', 'enter #red-announce ' + nconf.get('red:username') + ' ' + nconf.get('red:irc_token') )
})

c.addListener('message', async function (from, to, message) {
  log.info('[irc] msg: ' + from + ' => ' + to + ': ' + message);
  if(to != "#red-announce") return;

  let m = r.exec(message);
  if(!m) return;

  [ , artist, release, year, releaseType, releaseFormat, bitrate, media, , id, torrent_id, tags ] = m;
  tags = tags.split(',');

  log.info({meta: {
    artist,
    release,
    year,
    releaseType,
    releaseFormat,
    bitrate,
    media,
    media,
    id,
    torrent_id,
    tags
  }}, "announce")
  
  let popularity = await twitter.getSearchResultCount(artist + " " + release);
  log.info('[popularity] twitter search result count for this release:', popularity);

  if(popularity < 50) return log.info({meta: {id}},'[skipped] not popular enough');
  if(releaseFormat != "FLAC") return log.info({meta: {id}},'[skipped] not flac');
  if(year != new Date().getFullYear()) return log.info({meta: {id}},'[skipped] not this year');

  log.info({meta: {id}}, "passes")

});

c.addListener('error', function(message) {
    log.info('[irc] error: ', message);
});

process.on('SIGINT', function() {
  log.info("[irc] disconnecting");
  c.disconnect("Bye!", (err) => {
    if(err) log.error(err);
    process.exit();
  })
});
