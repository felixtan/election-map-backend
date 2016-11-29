const _ = require('lodash')
const fetch = require('node-fetch')
const MongoClient = require('mongodb')
const dbconfig = require('../config/mongo')
const statesLetterCodeToName = require('../../client-dev/app/fixtures/statesLetterCodeToName')
const houseWinners = require('../../external-data/2016HouseElectionWinners')

const LEVEL = 'country'
const BRANCH = 'legislativeLower'
const STATE = 'GU'
const DIST = 1
const INDEX = 0
const collectionName = 'elections'

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;

  const elections = db.collection(collectionName)
  const reps = db.collection('houseReps')

  elections.findOne({ iso_a2: 'US' }).then(doc => {
    delete doc._id

    // console.log(doc[LEVEL][BRANCH][STATE][DIST])
    // console.log(doc[LEVEL][BRANCH][STATE][DIST].candidates[INDEX].photo)

  //   // CHECK ALL
    _.each(doc[LEVEL][BRANCH], (stateData, stateCode) => {
      _.each(stateData, (distData, distNum) => {
        const winner = distData.winner !== undefined ? (distData.winner) : ('undefined')
        if (distData.candidates !== undefined && Array.isArray(distData.candidates) && winner !== undefined && winner.name !== undefined) {
          const cand = _.find(distData.candidates, cand => {
            const names = cand.name.split(' ')
            const lastName = names[names.length-1]
            return (_.includes(winner.name.toLowerCase(), lastName.toLowerCase()) && winner.party === cand.party)
          })

          // There was a winner but it cannot be found in candidates array
          if (cand === undefined) {
            console.log(`${stateCode} ${distNum}`)
            console.log(`winner:`)
            console.log(winner)
            console.log(`cands:`)
            console.log(distData.candidates)
            console.log()
          } else {
            // console.log('err2')
          }

            // reps.findOne().then(houseReps => {
            //   const rep = houseReps[stateCode][dataNum]
            //
            //   _.each(data, cand => {
            //     if (rep.name === cand.name && (cand.photo === undefined || rep.photo.url !== cand.photo.url)) {
            //       console.log(`${stateCode} ${dataNum}`)
            //       // console.log(rep.photo.url)
            //       // if (cand.photo === undefined) {
            //       //   console.log('undefined')
            //       // } else {
            //       //   console.log(cand.photo.url)
            //       // }
            //     }
            //   })
            // })
        } else {
          console.log('err1: winner or candidates is undefined')
          console.log(`${stateCode} ${distNum}`)
          console.log(`winner:`)
          console.log(winner)
          console.log(`cands:`)
          console.log(distData.candidates)
          console.log()
        }
      })
    })
  }, err => {
    console.error(err)
  })
})
