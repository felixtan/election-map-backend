// 2016

const _ = require('lodash')
const Promise = require('bluebird')
const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectId
const dbconfig = require('../config/mongo')
const houseWinners = require('../../external-data/2016HouseElectionWinners')

const ELECTIONS = 'elections'
const LEVEL = 'country'
const BRANCH = 'legislativeLower'
const STATE = 'AS'
const DIST = 1
const INDEX = 1

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
    const area = `${LEVEL}.${BRANCH}.${STATE}.${DIST}`
    const candidates = `${area}.candidates`
    const winner = `${area}.winner`
    const cand = `${candidates}.${INDEX}`
    const photo = `${cand}.photo`
    const name = `${cand}.name`
    const party = `${cand}.party`
    const address = `${cand}.address`
    const photoChanges = `${photo}.changes`
    const photoUrl = `${photo}.url`
    const photoAttrib = `${photo}.attrib`
    const photoTitle = `${photo}.title`
    const photoSource = `${photo}.source`

    // _.each(fixWinners, fix => {
    //   const name = `${LEVEL}.${BRANCH}.${fix.state}.candidates`
      elections.update({ iso_a2: 'US'}, {
        // $pull: {
        //   [candidates]: { name: "Gordon Ackley" }
        // }
        $set: {
          [name]: "Vaitinasa Salu Hunkin-Finau",
          [winner]: {
            name: "Aumua Amata Coleman Radewagen",
            party: "Republican Party"
          }
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
