const _ = require('lodash')
const fetch = require('node-fetch')
const MongoClient = require('mongodb')
const dbconfig = require('../config/mongo')
const statesLetterCodeToName = require('../../client-dev/app/fixtures/statesLetterCodeToName')

// const LEVEL = "country"
// const BRANCH = 'legislativeLower'
const STATE = 'NY'
const DIST = 1
const collectionName = "countryExecutives"

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;

  const collection = db.collection(collectionName);
  let count = 0

  collection.findOne({ iso_a2: 'US' }).then(doc => {
    delete doc._id
    // CHECK ONE
    // console.log(doc)

    // CHECK ALL
    _.each(doc.representatives, (rep, title) => {
      // _.each(stateData, (rep, index) => {
        count++
        if (rep.party !== 'Independent' && !_.includes(rep.party, 'Party')) {
          console.log(`add party to: ${rep.party}`)
          // const party = `representatives.${title}.party`
          // collection.update({ iso_a2: 'US' }, {
          //   $set: {
          //     [party]: `${rep.party} Party`
          //   }
          // }, null, (err, result) => {
          //   console.log(`updated ${title}`)
          // })
        } else {
          //
        }
      // })
    })

    console.log(`count: ${count}`)
  });
});
