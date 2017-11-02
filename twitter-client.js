const Twitter = require('twitter');

const nconf = require('nconf');
nconf.file({file: 'config.json'})

const t = new Twitter({
  consumer_key: nconf.get('twitter:consumer_key'),
  consumer_secret: nconf.get('twitter:consumer_secret'),
  access_token_key: nconf.get('twitter:access_token_key'),
  access_token_secret: nconf.get('twitter:access_token_secret')
})

function getSearchResultCount(query){
  return t.get('search/tweets', {q: query, count: 100})
    .then((tweets, response) => {
      return tweets.statuses.length;
    });
}

module.exports = {getSearchResultCount};
