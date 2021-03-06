const request = require('request-promise-native');
const Discord = require('discord.js');
const Url = require('urijs');
const fs = require('fs');

require.extensions['.txt'] = function (module, filename) {
  module.exports = fs.readFileSync(filename, 'utf8');
};

const cardList = require('../cardList.js');

const manamoji = require('./middleware/manamoji');
const utm = require('./middleware/utm');
const similarity = require('./card-similarity');

class TextResponse {
  constructor(client, cardName) {
    this.client = client;
    this.cardName = cardName;
  }

  makeQuerystring() {
    return {
      fuzzy: this.cardName,
      format: 'text'
    };
  }

  makeUrl() {
    return Url(this.url).query(this.makeQuerystring()).toString();
  }

  makeRequest() {
    return new Promise((resolve, reject) => {
      request({
        method: 'GET',
        resolveWithFullResponse: true,
        uri: this.makeUrl()
      }).then(response => {
        resolve(response);
      }).catch(err => {
        resolve(err.response);
      });
    });
  }

  makeEmbed(response) {
    //let parts = response.body.split('\n');
    //const embedTitle = parts.shift();

    let description = response.text;

    //Change HTML Bold and Italics to Discord Markdown
    description = description.replace(/<b>/g, '**').replace(/<\/b>/g,'**').replace(/<i>/g, '*').replace(/<\/i>/g,'*')

    console.log(response);
    
    return {
      title: response.title,
      rank: response.rank,
      suit: response.suit,
      keywords: response.keywords,
      description: description,
      url: response.url,
      thumbnail: {
        url: this.imageurl + response.imagesrc
      }
    };
  }

  lookupCard() {
    return new Promise(async (resolve, reject) => {

      let list = await cardList
                  .then((result) => {
                    return result;
                  });

      var i, len = list.length, stop = 1, out, bestCard,bestHit = 0;
      
      for (i = 0; i < len; i++) {
        
        var current = list[i];
        var hit = similarity(this.cardName,current.title);
        
        if(hit >= 0.45) {
          if(bestHit === 0 || hit > bestHit) {
            bestHit = hit;
            bestCard = current.title;
            out = current;
          }
        }

        //if (current.label.toLowerCase() === this.cardName.toLowerCase()) {
        //  console.log("here");
        //  out = cardListEval[i];
        //  stop = 0;
        //}
      }
      
      console.log("Best hit was: " + bestHit);
      console.log("Best card was: " + bestCard);
      
      if(bestHit > 0) {
        resolve(out);
      } else {
        resolve("Nothing Found");
      }
    });
  }

  embed() {
    return new Promise((resolve, reject) => {
      this.lookupCard().then(response => {
        let embed = this.makeEmbed(response);
        this.middleware.length > 0 && this.middleware.forEach(mw => {
          embed = mw(this.client, embed);
        });
        resolve(embed);
      });
    });
  }
}

TextResponse.prototype.middleware = [ utm ];
TextResponse.prototype.url = 'http://dtdb/api/card/';
TextResponse.prototype.imageurl = 'http://dtdb.co';


class ImageResponse extends TextResponse {
  makeEmbed(response) {
    //let parts = response.body.split('\n');
    return {
      title: response.title,
      url: response.url,
      image: {
        url: this.imageurl + response.imagesrc
      }
    };
  }
}


module.exports = { TextResponse, ImageResponse };
