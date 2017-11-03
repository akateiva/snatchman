const rp = require('request-promise')

class RedClient {
  constructor(opts) {
    this.logger = opts.logger;
  }

  login(username, password) {
    return rp({
        method: 'POST',
        uri: 'https://redacted.ch/login.php',
        form: {
          username: username,
          password: password
        },
        resolveWithFullResponse: true,
        simple: false,
        jar: true
      })
      //status 200 = bad login
      //status 302 = ok login
      .then((response) => {
        switch (response.statusCode) {
          case 200:
            throw new Error("could not log in")
            break;
          case 302:
            return true;
            break;
          default:
            throw new Error("unknown response status")
        }
      })
      .catch((e) => {
        console.log(e)
      }) // todo: implement proper feedback
  }

  getTorrentData(id) {
    return rp({
      method: 'POST',
      uri: 'https://redacted.ch/ajax.php',
      qs: {
        action: 'torrent',
        id: id
      },
      jar: true,
      json: true
    }).then((body) => {
      if (body.status != 'success') throw new Error("Status not success" + body.status)
      return body.response.torrent;
    })
  }

}

module.exports = RedClient;
