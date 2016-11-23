import _ from 'lodash';
import fetch from 'node-fetch';
import MongoClient from 'mongodb';
import dbconfig from '../config/mongo';
import statesLetterCodeToName from '../../app/fixtures/statesLetterCodeToName'
import houseWinners from '../data/2016HouseElectionWinners'

const LEVEL = 'country'
const BRANCH = 'executive'
// const STATE = 'KS'
// const DIST = 45
const INDEX = 2
const collectionName = 'elections'

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;

  const elections = db.collection(collectionName)
  const reps = db.collection('senators')

  elections.findOne({ iso_a2: 'US' }).then(doc => {
    delete doc._id

    console.log(doc[LEVEL][BRANCH])
    // console.log(doc[LEVEL][BRANCH][STATE][DIST].candidates[INDEX])

    // CHECK ALL
    // _.each(doc[LEVEL][BRANCH], (data, stateCode) => {
    //     if (data.candidates !== undefined && data.candidates.length > 2) {
    //       // const cand = _.find(data, cand => {
    //       //   if (data === undefined || cand === undefined || cand.name === undefined || data.winner === undefined) return true
    //       //   return cand.name === data.winner.name
    //       // })
    //
    //       console.log(`${stateCode}`)
    //     }
    //     // reps.findOne().then(houseReps => {
    //     //   const rep = houseReps[stateCode][dataNum]
    //     //
    //     //   _.each(data, cand => {
    //     //     if (rep.name === cand.name && (cand.photo === undefined || rep.photo.url !== cand.photo.url)) {
    //     //       console.log(`${stateCode} ${dataNum}`)
    //     //       // console.log(rep.photo.url)
    //     //       // if (cand.photo === undefined) {
    //     //       //   console.log('undefined')
    //     //       // } else {
    //     //       //   console.log(cand.photo.url)
    //     //       // }
    //     //     }
    //     //   })
    //     // })
    //   })
  }, err => {
    console.error(err)
  })
})
