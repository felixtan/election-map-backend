import _ from 'lodash';
import MongoClient from 'mongodb';
import assert from 'assert';
import Promise from 'bluebird';
import _states from '../utils/statesTwoLetters';
import districtsPerState from '../utils/stateAssemblyDistrictsPerState'
import dbconfig from '../config/mongo';
import { getRep, getRepTest, writeBigDocToDB, delay, printDoc } from '../utils/helpers';

// Should include 50 states, 5 territories, and 1 federal district
assert.deepStrictEqual(_states.length, 56, `Error: states.length=${_states.length}`);
assert.deepStrictEqual(Object.keys(districtsPerState).length, _states.length, `Error: districtsPerState and states have unequal number of entries.`);
const numberOfDistrictsTest = _.reduce(districtsPerState, (result, value, key) => {
  // console.log(`result=${result}, value=${value}, key=${key}`);
  result += value;
  return result;
}, 0);
console.log(`State Senate seats: ${numberOfDistrictsTest}`);

const collectionName = "stateAssemblyMembers";
const params = {};
const typeOfDistrict = 'sldl';
const states = _.without(_states, 'PR', 'GU', 'DC', 'VI', 'MP', 'AS', 'NE', 'MA', 'VT');
// const states = _states.slice(1, 2);

/*
  Empirical log
  -------------
  sldu
  1500, all states, ~0.61 req/sec
  1200, all states minus those without sldu data, ~0.75 req/sec

  sldl
  1000, first five states, ~0.9 req/sec
   900, all states, ~0.86 req/sec

  *all req/sec from google api console are based on 5 minute avg
*/

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;
  console.log(`Connected to mongo database ${dbconfig.dbname}`);
  let doc = {};
  Promise.each(states, state => {
    return mapStateToReps(state, districtsPerState[state], typeOfDistrict).then(data => {
      doc[state] = data;
      console.log(`completed entry for ${state}...`);
    });
  }).then(() => {
    writeBigDocToDB(db, collectionName, doc);
    printDoc(doc);
  }).catch(err => {
    throw err;
  });
});

function mapStateToReps(state, numberOfDistricts, typeOfDistrict) {
  let stateDoc = { districts: {}, length: 0 };
  return new Promise.each(_.range(numberOfDistricts), districtIndex => {
    const districtNumber = districtIndex + 1;

    // for throttling request rate
    delay(750);

    return getRep(params, state, districtNumber, typeOfDistrict).then(data => {
      if (typeof data.error === 'undefined' && typeof data.reps !== 'undefined') {
        stateDoc.districts[districtNumber] = data.reps[0];
      } else {
        console.log(data);
      }
      console.log(`created entry for ${state} ${typeOfDistrict} ${districtNumber}...`);
    });
  }).then(() => {
    stateDoc.length = Object.keys(stateDoc.districts).length;
    return stateDoc;
  }).catch(err => {
    throw err;
  });
}
