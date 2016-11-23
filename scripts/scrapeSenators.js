import MongoClient from 'mongodb';
import assert from 'assert';
import Promise from 'bluebird';
import states from '../utils/statesTwoLetters';
import dbconfig from '../config/mongo';
import { createOcdId, createUri, getRep } from '../utils/helpers';

// Should include 50 states, 5 territories, and 1 federal district
assert.deepStrictEqual(states.length, 56);

const collectionName = "senators";
const params = {
  'roles': 'legislatorUpperBody',
  'levels': 'country'
};

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;
  console.log(`Connected to mongo database ${dbconfig.dbname}`);
  let doc = {};
  Promise.map(states, state => {
    return getRep(params, state).then(data => {
      const key = state.toUpperCase();
      if (data.error) {
        doc[key]  = [];
      } else {
        doc[key] = data.reps;
      }
      console.log(`created entry for ${key}...`);
    });
  }).then(() => {
    console.log(`Writing to ${collectionName} collection...`);
    db.collection(collectionName).insert(doc, (err, result) => {
      if (err) throw err;
      console.log(result);
      console.log(`Successfully written ${collectionName}.`)
    });
  });
});
