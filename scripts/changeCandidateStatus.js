import _ from 'lodash';
import Promise from 'bluebird';
import MongoClient from 'mongodb';
import dbconfig from '../config/mongo';
import statesLetterCodeToName from '../../app/fixtures/statesLetterCodeToName'

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;

  const levelOfGov = 'country'
  const branchOfGov = 'legislativeUpper'
  const collectionName = 'elections'
  const collection = db.collection(collectionName);
  const stateCode = 'PA'

  const field = `${levelOfGov}.${branchOfGov}.${stateCode}.winner`

  // collection.findOne().then(doc => {
  //   console.log(doc[levelOfGov][branchOfGov][stateCode])
  // })

  collection.findOneAndUpdate({}, {
    $set: {
      [field]: {
        name: "Pat Toomey",
        party: "Republican Party"
      }
    }
  }, null, (err, result) => {
    console.log(result)
  });
});
