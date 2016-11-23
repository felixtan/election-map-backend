import _ from 'lodash';
import fetch from 'node-fetch';
import MongoClient from 'mongodb';
import dbconfig from '../config/mongo';
import statesLetterCodeToName from '../../app/fixtures/statesLetterCodeToName'
import { delay } from '../utils/helpers';

// const LEVEL = "country"
// const BRANCH = 'legislativeLower'
const STATE = 'NY'
const DIST = 13
const collectionName = "houseReps"

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;

  const collection = db.collection(collectionName);
  let count = 0

  collection.findOne().then(doc => {
    delete doc._id
    // CHECK ONE
    console.log(doc[STATE][DIST])

    // CHECK ALL
    // _.each(doc, (state, stateCode) => {
    //   _.each(state, (senator, index) => {
    //     count++
    //     if (senator.photo === undefined || senator.photo === null || senator.photo.url === null || senator.photo.url.length === 0) {
    //       console.log(`no photo: ${stateCode}`)
    //     } else {
    //       if (senator.photo.attrib === 'public domain') {
    //         // console.log(`no attrib or source, these better be public domain: ${stateCode} ${distNum}`)
    //       } else {
    //         if (!_.includes(senator.photo.url, '.gov')) {
    //           console.log(`not gov: ${stateCode}: ${senator.photo.url}`)
    //         }
    //       }
    //     }
    //   })
    // })
    //
    // console.log(`count: ${count}`)
  });
});
