import _ from 'lodash';
import cheerio from 'cheerio';
import fetch from 'node-fetch';
import Promise from 'bluebird';
import { MongoClient, ObjectId } from 'mongodb';
import dbconfig from '../config/mongo';
import searchAPIConfig from '../config/customSearch';
import statesLetterCodeToName from '../../app/fixtures/statesLetterCodeToName'
import { delay } from '../utils/helpers';

const levelOfGov = "country"
const branchOfGov = "legislativeUpper"
const collectionName = "elections"
// const office = "headOfState"

/*=================================
Urls
  wiki
  official site
  google search

Social media
  Facebook
  Twitter

*/

const country = 'US'

/*
  Update all rep/can objects in the following to have the same
  photo, url, channels, structure

  elections.country.legislativeUpper[state].candidates        (an array of objects)
  elections.country.legislativeLower[state][dist].candidates  (an array of objects)
  senators[state]                                             (an array of objects)
  houseReps[state][dist]                                      (an array of objects)
*/

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;

  const elections = db.collection('elections')
  const sens = db.collection('senators')

  elections.findOne({ iso_a2: 'US' }).then(doc => {
    if (doc === null) {
      console.log("404: doc not found")
    } else {
      _.each(doc[levelOfGov][branchOfGov], (state, stateCode) => {
        if (typeof stateCode === 'string') {
        _.each(state.candidates, (can, i) => {
          // console.log('foo')
          sens.findOne().then(senatorsDoc => {
            _.each(senatorsDoc[stateCode], (senator) => {
                const name = senator.name.split(' ')
                const lastName = name[name.length-1]
                if (_.includes(can.name.toLowerCase(), lastName.toLowerCase()) && _.includes(can.party, senator.party)) {
                  const photo = `${levelOfGov}.${branchOfGov}.${stateCode}.candidates.${i}.photo`
                  const channels = `${levelOfGov}.${branchOfGov}.${stateCode}.candidates.${i}.channels`
                  const urls = `${levelOfGov}.${branchOfGov}.${stateCode}.candidates.${i}.urls`
                  const phones = `${levelOfGov}.${branchOfGov}.${stateCode}.candidates.${i}.phones`
                  // console.log(`${senator.name} ${senator.party} | ${can.name} ${can.party}`)
                  elections.update({}, {
                    $set: {
                      [photo]: senator.photo,
                      [channels]: senator.channels,
                      [urls]: senator.urls,
                      [phones]: senator.phones
                    }
                  }, null, (err, result) => {
                    if (err) {
                      console.error(err)
                    } else {
                      console.log(result.result)
                    }
                  })
              }
            })
          })
        })
      }
      })
    }
  });
});

/*
REP OBJECT EXAMPLE

name: "Loretta Sanchez",
status: 'CHALLENGER',
address:
 [ { line1: "1211 Longworth House Office Building",
     line2: '',
     city: "washington",
     state: 'DC',
     zip: 20515 },
   {
     line1: "12397 Lewis Street, Suite 101",
     line2: '',
     city: "Garden Grove",
     state: 'CA',
     zip: 92840
   } ],
party: 'Democratic Party',
phones: ["(202) 225-2965", "(714) 621-0102"],
urls: ["http://lorettasanchez.house.gov/", "https://en.wikipedia.org/wiki/Loretta_Sanchez"],
channels: ["https://www.facebook.com/LorettaSanchez", "https://twitter.com/@LorettaSanchez"],
photo: {
  url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Loretta_Sanchez_official_photo.jpg/162px-Loretta_Sanchez_official_photo.jpg",
  title: null,
  attrib: null,
  changes: null,
  source: null
}

*/
