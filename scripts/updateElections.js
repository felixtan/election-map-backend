// 2016

import _ from 'lodash'
import Promise from 'bluebird';
import { MongoClient, ObjectId } from 'mongodb';
import dbconfig from '../config/mongo';
import houseWinners from '../data/2016HouseElectionWinners'
import partyCodeToName from '../data/partyCodeToName'
import partyLetterToCode from '../data/partyLetterToCode'

const ELECTIONS = 'elections'
const LEVEL = 'country'
const BRANCH = 'executive'
const STATE = 'KS'
// const DIST = 1
const INDEX = 2

const fixWinners = [
  {
    state: "AL",
    index: 0,
    name: "Richard Shelby",
  },
  {
    state: "CO",
    index: 0,
    name: "Michael Bennet",
  },
  {
    state: "PA",
    index: 3,
    name: "Pat Toomey",
  },
  {
    state: "VT",
    index: 0,
    name: "Patrick Leahy",
  }
]

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;

  const elections = db.collection(ELECTIONS)
  const reps = db.collection('senators')

  // ONE
  elections.findOne({ iso_a2: 'US' }).then(doc => {

    // console.log(doc[LEVEL][BRANCH][STATE].candidates[INDEX])
    // const error = `${LEVEL}.${BRANCH}.${STATE}.${DIST}.photo`
    const cand = `${LEVEL}.${BRANCH}.${STATE}.candidates`
    const changes = `${LEVEL}.${BRANCH}.${STATE}.candidates.${INDEX}.photo.changes`
    const url = `${LEVEL}.${BRANCH}.candidates.${INDEX}.photo.url`
    const atr = `${LEVEL}.${BRANCH}.candidates.${INDEX}.photo.attrib`
    const title = `${LEVEL}.${BRANCH}.${STATE}.candidates.${INDEX}.photo.title`
    const source = `${LEVEL}.${BRANCH}.${STATE}.candidates.${INDEX}.photo.source`
    const name = `${LEVEL}.${BRANCH}.${STATE}.candidates.${INDEX}.name`
    const party = `${LEVEL}.${BRANCH}.${STATE}.candidates.${INDEX}.party`
    const address = `${LEVEL}.${BRANCH}.${STATE}.candidates.${INDEX}.address`

    // _.each(fixWinners, fix => {
    //   const name = `${LEVEL}.${BRANCH}.${fix.state}.candidates`
      elections.update({ iso_a2: 'US'}, {
        // $pull: {
        //   [cand]: { name: "Gregory Orman" }
        // }
        $set: {
          // [name]: "Gary Swing",
          // [party]: "Green Party",
          // [address]: [],
          // [title]: "John Neely Kennedy's portrait as Treasurer of Louisiana in 2014.",
          [atr]: "public domain",
          // [source]: "https://www.flickr.com/photos/36823845n08/28156075060/",
          [url]: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Evan_McMullin_2016-10-21_headshot.jpg/180px-Evan_McMullin_2016-10-21_headshot.jpg",
          // [changes]: null,
        }
      }, null, (err, result) => {
        console.log(result.result)
      })
    // })
  })

  // MANY
  // elections.findOne({ iso_a2: 'US' }).then(doc => {
  //   console.log(Object.keys(doc[LEVEL][BRANCH]).length)
  //   _.each(doc[LEVEL][BRANCH], (state, stateCode) => {
  //     if (_.includes(error, stateCode) && state.candidates !== undefined && state.candidates !== null && Array.isArray(state.candidates) && state.candidates.length > 0) {
  //       reps.findOne().then(senators => {
  //         _.each(state.candidates, (cand, index) => {
  //
  //           const name = cand.name.split(' ')
  //           const rep = _.find(senators[stateCode], s => {
  //             return (_.includes(s.name, name[name.length-1]) && _.includes(cand.party, s.party))
  //           })
  //
  //           if (rep !== undefined && _.includes(rep.name, name[name.length-1])) {
  //             if (cand.photo.attrib === 'public domain') {
  //               //
  //             } else {
  //               // console.log('no public domain')
  //               // console.log(`${stateCode} ${index+1}`)
  //               // console.log(cand.name)
  //               const atr = `${LEVEL}.${BRANCH}.${stateCode}.candidates.${index}.photo.attrib`
  //               const name = `${LEVEL}.${BRANCH}.${stateCode}.candidates.${index}.name`
  //               elections.update({}, {
  //                 $set: {
  //                   [atr]: 'public domain',
  //                   [name]: rep.name
  //                 }
  //               }, null, (err, res) => {
  //                 console.log(`updates ${stateCode} ${index+1}`)
  //               })
  //             }
  //           } else {
  //             console.log(`cand not incumbent ${stateCode} ${index+1}`)
  //           }
  //         })
  //       })
  //     } else {
  //       console.log(`no elections ${stateCode}`)
  //     }
  //   })
  // })
})
