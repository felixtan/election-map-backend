import _ from 'lodash';
import MongoClient from 'mongodb';
import assert from 'assert';
import Promise from 'bluebird';
import states from '../utils/statesTwoLetters';
import districtsPerState from '../utils/congressionalDistrictsPerState'
import dbconfig from '../config/mongo';
import { getRep, getRepTest } from '../utils/helpers';

// Should include 50 states, 5 territories, and 1 federal district
assert.deepStrictEqual(states.length, 56, `Error: states.length=${states.length}`);
assert.deepStrictEqual(Object.keys(districtsPerState).length, states.length, `Error: districtsPerState and states have unequal number of entries.`);
const numberOfDistrictsTest = _.reduce(districtsPerState, (result, value, key) => {
  // console.log(`result=${result}, value=${value}, key=${key}`);
  result += value;
  return result;
}, 0);
assert.deepStrictEqual(numberOfDistrictsTest, 441, `Error: numberOfDistricts=${numberOfDistrictsTest}`);
// 435 voting members + 6 non-voting members from territories

const collectionName = "houseReps";
const params = {
  'roles': 'legislatorLowerBody',
  'levels': 'country'
};

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;
  console.log(`Connected to mongo database ${dbconfig.dbname}`);

  let doc = {};
  
  Promise.map(states, state => {
    return mapStateToHouseReps(state, districtsPerState[state]).then(data => {
      doc[state] = data;
      console.log(`completed entry for ${state}...`);
    });
  }).then(() => {
    console.log(`Writing to ${collectionName} collection...`);
    db.collection(collectionName).insert(doc, (err, result) => {
      if (err) throw err;
      console.log(result);
      console.log(`Successfully written to ${collectionName} collection.`)
    });
  }).catch(err => {
    throw err;
  });
});

function mapStateToHouseReps(state, numberOfDistricts) {
  let stateDoc = {};
  return new Promise.map(_.range(numberOfDistricts), districtIndex => {
    const typeOfDistrict = (numberOfDistricts === 1) ? 'atLarge' : 'cd';
    const districtNumber = districtIndex + 1;
    return getRep(params, state, districtNumber, typeOfDistrict).then(data => {
      if (data.error) {
        stateDoc[districtNumber] = {};
      } else {
        stateDoc[districtNumber] = data.reps[0];
      }

      console.log(`created entry for ${state} CD${districtNumber}...`);
    });
  }).then(() => {
    return stateDoc;
  }).catch(err => {
    throw err;
  });
}
