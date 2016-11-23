import _ from 'lodash';
import fetch from 'node-fetch';
import Promise from 'bluebird';
import config from '../config/civicInfo';

/*
  state: String - two letter abbrev. of US state
  districtNumber: Int - district number
  typeOfDistrict: String - member of set { 'cd', 'sldu', 'sldl', 'atLarge' }

  if either districtNumber or typeOfDistrict are defined, then they must both be defined
*/
export function createOcdId(state, districtNumber, typeOfDistrict) {
  if (typeof state === 'undefined' && typeof districtNumber === 'undefined' && typeof typeOfDistrict === 'undefined') {
    return encodeURIComponent(`ocd-division/country:us`);
  } else if (typeof districtNumber === 'undefined' && typeof typeOfDistrict === 'undefined') {
    return encodeURIComponent(`ocd-division/country:us/state:${state.toLowerCase()}`);
  } else {
    if (typeOfDistrict === 'atLarge') {
      return encodeURIComponent(`ocd-division/country:us/state:${state.toLowerCase()}`);
    } else {
      return encodeURIComponent(`ocd-division/country:us/state:${state.toLowerCase()}/${typeOfDistrict}:${districtNumber}`);
    }
  }
}

/*
  state: String - two letter abbrev. of US state
  params: Object - parameters for civic info api
  config: Object - civic info API config
*/
export function createUri(params, state, districtNumber, typeOfDistrict) {
  const ocdId = createOcdId(state, districtNumber, typeOfDistrict);
  let uri = config.reps + '/' + ocdId + '?' + 'key=' + config.key;
  for (const prop in params) {
    uri += `&${prop}=${params[prop]}`
  }
  return uri;
}

/*
  state: String - two letter abbrev. of US state
  params: Object - parameters for civic info api
*/
export function getRep(params, state, districtNumber, typeOfDistrict) {
  const uri = createUri(params, state, districtNumber, typeOfDistrict);

  // console.log(`request made for ${state} ${typeOfDistrict} ${districtNumber}`);
  // delay
  // const timer = Date.now();
  // while (Date.now() - timer < 250) {}

  return fetch(uri)
    .then(res => {
      return res.json();
    })
    .catch(err => {
      console.error(err);
    });
}

// test the uri
export function getRepTest(params, state, districtNumber, typeOfDistrict) {
  const uri = createUri(params, state, districtNumber, typeOfDistrict);
  return new Promise(resolve => {
    resolve(uri);
  });
}

/*
  db: Object - reference to database client
  collectionName: String - name of mongo collection
  doc: Object - doc to insert
*/
export function writeBigDocToDB(db, collectionName, doc) {
  console.log(`Writing to ${collectionName} collection...`);
  db.collection(collectionName).insert(doc, (err, result) => {
    if (err) throw err;
    console.log(result);
    console.log(`Successfully written to ${collectionName} collection.`)
  });
}

// For throttling request rate
export function delay(ms) {
  // delay
  const timer = Date.now();
  while (Date.now() - timer < ms) {}
}


export function printDoc(doc) {
  console.log(doc);
  const total = _.reduce(doc, (result, value, key) => {
    const c = isNaN(value.length) ? 0 : value.length;
    console.log(`${key}: ${c}`);
    result += c
    return result;
  }, 0);
  console.log(`total=${total}`);
}
