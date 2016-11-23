import _ from 'lodash';
import MongoClient from 'mongodb';
import dbconfig from '../config/mongo';
import statesLetterCodeToName from '../../app/fixtures/statesLetterCodeToName'

const collectionName = "senators"

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;

  const collection = db.collection(collectionName);

  const STATE = 'NC'
  const DIST = 1
  // const INDEX = 0
  const reps = `${STATE}`

  // UPDATE ONE
  collection.findOneAndUpdate({}, {
    $pull: {
      [reps]: null
  }}, null, (err, result) => {
    // doesn't show the updated form
    if (result.ok) {
      console.log(`updated rep ${STATE}`)
    } else {
      console.log('update failed')
    }
  })

  // UPDATE MANY
  // collection.findOne().then(doc => {
  //   _.each(doc, (state, stateCode) => {
  //     _.each(state, (senator, index) => {
  //       // const rep = doc[stateCode]
  //       if (senator !== undefined && senator.photo !== undefined && (senator.photo.attrib === null || senator.photo.attrib === '') && senator.name !== 'Vacant') {
  //         // console.log(`${stateCode} ${distNum}`)
  //         // console.log(rep.photo.attrib)
  //         const atr = `${stateCode}.${index}.photo.attrib`
  //         const url = `${stateCode}.${index}.photo.url`
  //         if (senator.name === "Cory A. Booker") {
  //           collection.update({}, {
  //             $set: {
  //               [atr]: 'public domain',
  //               [url]: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Cory_Booker%2C_official_portrait%2C_114th_Congress.jpg/196px-Cory_Booker%2C_official_portrait%2C_114th_Congress.jpg"
  //             }
  //           }, null, (err, result) => {
  //             console.log(`updated ${stateCode} ${index+1}`)
  //           })
  //         } else {
  //           collection.update({}, {
  //             $set: {
  //               [atr]: 'public domain'
  //             }
  //           }, null, (err, result) => {
  //             console.log(`updated ${stateCode} ${index+1}`)
  //           })
  //         }
  //       }
  //     })
  //   })
  // })
});
