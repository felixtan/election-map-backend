import _ from 'lodash';
import MongoClient from 'mongodb';
import assert from 'assert';
import Promise from 'bluebird';
import _states from '../utils/statesTwoLetters';
import districtsPerState from '../utils/stateSenateDistrictsPerState'
import dbconfig from '../config/mongo';
import { getRep, getRepTest, writeBigDocToDB } from '../utils/helpers';

// Should include 50 states, 5 territories, and 1 federal district
// assert.deepStrictEqual(states.length, 56, `Error: states.length=${states.length}`);
// assert.deepStrictEqual(Object.keys(districtsPerState).length, states.length, `Error: districtsPerState and states have unequal number of entries.`);
const numberOfDistrictsTest = _.reduce(districtsPerState, (result, value, key) => {
  // console.log(`result=${result}, value=${value}, key=${key}`);
  result += value;
  return result;
}, 0);
console.log(`State Senate seats: ${numberOfDistrictsTest}`);

const collectionName = "stateSenators";
const params = {};
const typeOfDistrict = 'sldu';
const states = _.without(_states, 'MA', 'VT', 'AK', 'DC', 'AS', 'GU', 'MP', 'PR', 'VI');

function delay() {
  // delay
  const timer = Date.now();
  while (Date.now() - timer < 1000) {}
}
  /*
    Empirical log
    -------------
    1500, all states, ~0.61 req/sec
    1200, all states minus those without sldu data, ~0.75 req/sec

    *all req/sec from google api console are based on 5 minute avg
  */

function printDoc(doc) {
  const total = _.reduce(doc, (result, value, key) => {
    const c = value.length;
    console.log(`${key}: ${c}`);
    result += c
    return result;
  }, 0);
  console.log(`total=${total}`);
}

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
    delay();

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

function promiseWhile(condition, action) {
  let timer = Date.now() / 1000;
  let counter = 0;    // # of requests

  function getInterval() {
    return (Date.now() / 1000) - timer;
  }

  function resetTimer() {
    timer = Date.now() / 1000;
  }

  function resetCount() {
    counter = 0;
  }

  /*
    limit: Int - in seconds
    tol: Int - for range (limit - tol, limit)
  */
  function breakTime(limit, tol) {
    return (getInterval() >= limit-tol && getInterval() <= limit);
  }

  function breakCount(limit, tol) {
    return (counter >= limit-tol && counter <= limit);
  }

  /*
    timeToWait: Int - time in seconds to wait if break conditions are met
    defaultTimeToWaitimeToWait: Int - time in seconds to wait regardless if break conditions are met
  */
  function wait(timeToWait, defaultTimeToWait = 0) {
    return (breakTime(100, 20) && breakCount(100, 20)) ? timeToWait*1000 : defaultTimeToWait*1000;
  }

  function loop() {
    if (!condition()) return;
    setTimeout(() => {
      counter += 1;
      return Promise.resolve(action()).then(loop);
    }, wait(3, 0.005));
  }

  return Promise.resolve().then(loop);
 }

/*
Getting this error. Need to set delays.
{
"error": {
"errors": [
 {
  "domain": "usageLimits",
  "reason": "userRateLimitExceeded",
  "message": "User Rate Limit Exceeded"
 }
],
"code": 403,
"message": "User Rate Limit Exceeded"
}
}
*/


/*
  Solutions used:

  1. promiseWhile
    https://stackoverflow.com/questions/29375100/while-loop-using-bluebird-promises
  2.
*/


// promiseWhile(function() {
//   return districtNumber > 0;
// }, function() {
//     return getRep(params, state, districtNumber, typeOfDistrict)
//     .then(data => {
//       if (typeof data.error === 'undefined') {
//         // stateDoc.districts[districtNumber] = data.reps[0];
//         reqs.push({
//           district: districtNumber,
//           official: data.reps[0]
//         });
//         console.log(`completed entry for ${state} ${typeOfDistrict.toUpperCase()} ${districtNumber}...`);
//         districtNumber += 1;
//       } else {
//         districtNumber = -1;
//       }
//     })
//     .catch(err => {
//       throw err;
//     });
// });
