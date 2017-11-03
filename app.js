const irc = require('irc');
const log = require('pino')();
const twitter = require('./twitter-client.js');
const Red = require('./red-client.js');

const nconf = require('nconf');
nconf.file({
  file: 'config.json'
})

const red = new Red({
  logger: log
})
red.login(nconf.get('red:username'), nconf.get('red:password'))
  .then(() => {
    log.info("[red] logged in as", nconf.get('red:username'));
  })
  .catch((e) => {
    log.error("[red] failed to log in to red", e);
  })

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
  c.say('Drone', 'enter #red-announce ' + nconf.get('red:username') + ' ' + nconf.get('red:irc_token'))
})

c.addListener('message', async function(from, to, message) {
  log.info('[irc] msg: ' + from + ' => ' + to + ': ' + message);
  if (to != "#red-announce") return;

  let m = r.exec(message);
  if (!m) return;

  [, artist, release, year, releaseType, releaseFormat, bitrate, media, , id, torrent_id, tags] = m;
  tags = tags.split(',');

  log.info({
    meta: {
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
    }
  }, "announce")

  //Log popularity of terms
  twitter.getSearchResultCount(artist + " " + release).then((count) => {
    log.info({
      meta: {
        id,
        popularity: count
      }
    }, "popularity");
  })

  //Report torrent data from API after 6 hrs 
  setTimeout(() => {
    red.getTorrentData(id).then((torrent) => {
      log.info({
        meta: {
          id,
          torrent
        }
      });
    }).catch((err) => {
      log.error(err);
    })
  }, 60 * 3600 * 1000)


  /*
  if(popularity < 50) return log.info({meta: {id}},'[skipped] not popular enough');
  if(releaseFormat != "FLAC") return log.info({meta: {id}},'[skipped] not flac');
  if(year != new Date().getFullYear()) return log.info({meta: {id}},'[skipped] not this year');
  */

  log.info({
    meta: {
      id
    }
  }, "passes")

});

c.addListener('error', function(message) {
  log.info('[irc] error: ', message);
});

process.on('SIGINT', function() {
  log.info("[irc] disconnecting");
  c.disconnect("Bye!", (err) => {
    if (err) log.error(err);
    process.exit();
  })
});
