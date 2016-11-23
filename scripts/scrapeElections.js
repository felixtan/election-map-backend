import _ from 'lodash';
import MongoClient from 'mongodb';
import assert from 'assert';
import Promise from 'bluebird';
import states from '../utils/statesTwoLetters';
import congressDistrictsPerState from '../utils/congressionalDistrictsPerState';
import stateSenateDistrictsPerState from '../utils/stateSenateDistrictsPerState';
import stateAssemblyDistrictsPerState from '../utils/stateAssemblyDistrictsPerState';
import dbconfig from '../config/mongo';
import { getRep, getRepTest } from '../utils/helpers';
import FEC_Candidates_Data from '../utils/FECCandidateSummaries.js';
import partyCodesToName from '../utils/partyCodesToName.js';
import countries from '../utils/countriesList';

const partyCodes = Object.keys(partyCodesToName);
let filtered = {};
let elections = {};


// c: candidate object with FEC format
// props: list of properties to validate
function validateCandidate(c) {
  return (validString(c.can_par_aff) &&
         validParty(c.can_par_aff) &&
         validString(c.can_nam));

         // &&
        //  validOffice(c));
        // filters out P cands because they have state 'US'

  // validNum(c.tot_rec) &&
  // couldn't use this one because Daniel Maio has invalid tot_rec
  // but he's definitely running against Grace Meng for NY CD 6
}

function validOffice(c) {
  // FEC data has candidates with invalid offices
  const office = c.can_off;
  const state = c.can_off_sta;
  const dist = c.can_off_dis;

  function invalidOffices() {
    return (office === 'S' && state === 'NE' ||
            office === 'S' && state === 'NJ');
  }

  return (validString(office) &&
          validString(state) &&
          !invalidOffices() &&
          !isNaN(dist) &&
          parseInt(dist) <= congressDistrictsPerState[state]);
}

function validParty(p, validParties = partyCodes) {
  return validParties.indexOf(p) > -1;
}

function validNum(n) {
  return (n !== null &&
          typeof n !== 'undefined' &&
          !isNaN(toFloat(n))
  );
}

function validString(s) {
  return (s !== null &&
          typeof s === 'string' &&
          s.trim() !== ''
  );
}

// data assumed to be object
function validateAndArrangeByOffice(C) {
  // let P = [], S = [], H = [];

  let res = Promise.reduce(C, (res, c) => {
    const office = c.can_off;
    const party = c.can_par_aff;
    const state = c.can_off_sta;
    const district = c.can_off_dis;
    const id = c.can_id;

    if (typeof res.P === 'undefined') res.P = [];
    if (typeof res.S === 'undefined') res.S = {};
    if (typeof res.H === 'undefined') res.H = {};

    // Assuming there are no special elections such that both senate seats from
    // one state are up for election in the same year
    if (typeof res.S[state] === 'undefined' && _.includes(states, state)) res.S[state] = [];
    if (typeof res.H[state] === 'undefined' && _.includes(states, state)) res.H[state] = {};

    if (typeof res.H[state] !== 'undefined' && typeof res.H[state][district] === 'undefined') res.H[state][district] = [];

    if (validateCandidate(c)) {
      if (_.isEqual(office, 'P')) {
        res.P.push(c);
      } else if (_.isEqual(office, 'S') && _.includes(states, state)) {
        res.S[state].push(c);
      } else if (_.isEqual(office, 'H') && _.includes(states, state)) {
        res.H[state][district].push(c);
      }
    }

    return res;
  }, {});

  return Promise.props(res);
}

// 1
function arrangeByOffice(C) {
  return new Promise.each(C, c => {

    const office = c.can_off;
    const party = c.can_par_aff;
    const state = c.can_off_sta;
    const district = c.can_off_dis;

    // President
    if (office === 'P') {

      // initialize array for all candidates
      if (typeof filtered.P === 'undefined') filtered.P = { candidates: [] };

      // Filter out members of parties without state representation (in 2016 there were no Independent candidates for P)
      if (partyCodes.indexOf(party) > -1) filtered.P.candidates.push(c);

      // if (_.includes(c.can_name, 'TRUMP')) console.log(c);
    // Senate
    } else if (office === 'S') {

      if (typeof filtered.S === 'undefined') filtered.S = {};

      // initialize  array for all candidates of the given state
      if (typeof filtered.S[state] === 'undefined') filtered.S[state] = { candidates: [] };

      // Filter out members of parties without state representation (except for Independents)
      if (partyCodes.concat('IND').indexOf(party) > -1) filtered.S[state].candidates.push(c);

    // House
  } else if (office === 'H') {

      if (typeof filtered.H === 'undefined') filtered.H = {};

      // initialize nested object for the given state
      if (typeof filtered.H[state] === 'undefined') filtered.H[state] = {};

      // initialize  array for all candidates of the given district
      if (typeof filtered.H[state][district] === 'undefined' &&
          !isNaN(parseInt(district)) &&
          _.includes(states, state)) {
            filtered.H[state][district] = { candidates: [] };
      }

      if (partyCodes.concat('IND').indexOf(party) > -1 && !isNaN(parseInt(district))) filtered.H[state][district].candidates.push(c);
    }
  });
}

/*
  Output: For each office, for each major party, only one candidate
  Should be the active, competing candidates for that office

  The bad: The FEC filter does not distinguish between active and inactive candidates and primary winners for each party for each office.
  So there are many joke candidates and inactive candidates in the data.

  Therefore the candidate data points used to filter:
    cash on hand on the most recent filing: cas_on_han_clo_of_per
    total receipts: tot_rec
    total disbursements: tot_dis
*/

/*
  Reusable functions that returns a promise that returns the top candidates
  for a specific seat.
*/
// call this on array of candidates, regardless of party, for a specific seat
function mapCandidatesToParty(arrOfCandsForASpecificSeat) {
  // 1. gather by party in an obj
  // 2. filter the top cand by tot_rec (for now)
  //  see if daniel maio is around for NY CD 6
  //    if he is, continue
  //    else revise filter strategy, might have to do it manually
  // console.log(arrOfCandsForASpecificSeat);
  let res = Promise.reduce(arrOfCandsForASpecificSeat, (res, c) => {
    const party = c.can_par_aff;
    const id = c.can_id;
    if (typeof res[party] === 'undefined') res[party] = [];
    const dup = _.find(res[party], cand => { return cand.can_id === id; });
    if (typeof dup === 'undefined') res[party].push(c);
    return res;
  }, {});

  return Promise.props(res);
}

// call this for each party for each individual seat
function filterPrimaryWinners(arrOfSamePartyCands, filterProp = 'tot_rec') {
  return Promise.reduce(arrOfSamePartyCands, (res, c) => {
    let val = c[filterProp];

    if (val === null ||
        typeof val === 'undefined' ||
        val.trim() === '') {
          val = '$0.00';
    }

    if (res[filterProp] === '' || toFloat(val) > toFloat(res[filterProp])) res = c;

    return res;
  }, arrOfSamePartyCands[0]);
}

// call this for each individual seat (array of cands)
function filterGeneralElection(mapOfCandidatesToParty) {
  // console.log(Object.keys(mapOfCandidatesToParty));
  // console.log(mapOfCandidatesToParty['REP']);
  // _.forIn(mapOfCandidatesToParty, (cands, partyCode) => {
  //   console.log(typeof cands);
  // });
  return Promise.reduce(Object.keys(mapOfCandidatesToParty), (ballot, party) => {
    // console.log(ballot);
    return filterPrimaryWinners(mapOfCandidatesToParty[party]).then(primaryWinner => {
      // console.log('gettint primary');
      // console.log(ballot);
      ballot.push(primaryWinner);
      return ballot;
    }, err => {
      console.error(err);
    });
  }, []);
}

// call on P cands after arranging by office
function filterPresGeneralElectionBallots(P) {
  return new Promise((resolve, reject) => {
    mapCandidatesToParty(P).then(filterGeneralElection).then(ballot => {
      resolve(ballot);
    }, err => {
      reject(err);
    });
  });
}

// call on S cands after arranging by office
function filterSenGeneralElectionBallots(S) {
  return Promise.reduce(Object.keys(S), (res, state) => {
    return mapCandidatesToParty(S[state]).then(filterGeneralElection).then(ballot => {
      // if (typeof res[state] === 'undefined') res[state] = null;
      res[state] = ballot;
      return res;
    }, err => {
      throw err;
    });
  }, {});
}

// call on H cands after arranging by office
function filterHouseGeneralElectionBallots(H) {
  return Promise.reduce(Object.keys(H), (res, state) => {
    return generatHouseGeneralElectionBallotsForState(H[state], state).then(mapOfDistsToBallots => {
      res[state] = mapOfDistsToBallots;
      return res;
    }, err => {
      throw err;
    });
  }, {});
}

// call in states
function generatHouseGeneralElectionBallotsForState(state, stateCode) {
  return Promise.reduce(Object.keys(state), (res, districtNum) => {
    return mapCandidatesToParty(state[districtNum]).then(filterGeneralElection).then(ballot => {

      // 1 distrcit only states 0->1
      // delete 0s from >1 district states
      if (congressDistrictsPerState[stateCode] === 1) {
        res[parseInt(districtNum)+1] = ballot;
      } else if (congressDistrictsPerState[stateCode] !== 1 && districtNum !== '0') {
        res[districtNum] = ballot;
      }

      return res;
    }, err => {
      throw err;
    });
  }, {});
}

function filterTopCandidates(key) {
  let promises = [];
  const C = filtered;
  const topPresCands = new Promise.each(C.P.candidates, c => {
    const cashOnHand = c[key];
    const party = c.can_par_aff;

    if (typeof C.P[party] === 'undefined' && !isNaN(toFloat(cashOnHand))) {
      C.P[party] = c;
    } else if (!isNaN(toFloat(cashOnHand)) &&
      toFloat(cashOnHand) > toFloat(C.P[party][key])) {
      C.P[party] = c;
    }
  });
  promises.push(topPresCands);

  _.each(C.S, (state, stateName) => {
      const topSenateCands = new Promise.each(state.candidates, c => {
        const cashOnHand = c[key];
        const party = c.can_par_aff;
        if (typeof state[party] === 'undefined' && !isNaN(toFloat(cashOnHand))) {
          state[party] = c;
        } else if (!isNaN(toFloat(cashOnHand)) &&
          toFloat(cashOnHand) > toFloat(state[party][key])) {
          state[party] = c;
        }
      });
      promises.push(topSenateCands);
  });

    _.each(C.H, (state, stateName) => {
      _.each(state, (district, districtNum) => {
        const topHouseCands = new Promise.each(district.candidates, c => {
          const cashOnHand = c[key];
          const party = c.can_par_aff;
          if (typeof district[party] === 'undefined' && !isNaN(toFloat(cashOnHand))) {
            district[party] = c;
          } else if (!isNaN(toFloat(cashOnHand)) &&
            toFloat(cashOnHand) > toFloat(district[party][key])) {
            district[party] = c;
          }
        });
        promises.push(topHouseCands);
      });
    });

    return Promise.all(promises);
}

function initElectionsDoc() {
  const branchesOfGov = ['executive', 'legislativeUpper', 'legislativeLower'];
  const templateForIndividualPoliticalSeat = { 'status': 'inactive', 'candidates': [] };
  return new Promise.each(countries, country => {
    if (typeof elections[country] === 'undefined' || elections[country] === null) {
      elections[country] = { 'country': {}, 'adminSubdiv1': {}, 'local': {}};
      let countryBody = elections[country];

      // US only
      _.each(countryBody, (level, levelName) => {
        _.each(branchesOfGov, branchName => {
          level[branchName] = {};
          let branch = level[branchName];
          if (levelName === 'country') {
            if (branchName === 'legislativeUpper') {
              _.each(states, state => {
                branch[state] = {
                  '1': templateForIndividualPoliticalSeat,
                  '2': templateForIndividualPoliticalSeat
                };
              });
            } else if (branchName === 'legislativeLower') {
              _.each(states, state => {
                branch[state] = {};
                _.each(_.range(1, congressDistrictsPerState[state]+1), i => {
                  branch[state][i] = templateForIndividualPoliticalSeat;
                });
              });
            } else if (branchName === 'executive') {
              level[branchName] = templateForIndividualPoliticalSeat;
            }
          } else if (levelName === 'adminSubdiv1') {
            if (branchName === 'legislativeUpper') {
              _.each(states, state => {
                branch[state] = {};
                _.each(_.range(1, stateSenateDistrictsPerState[state]+1), i => {
                  branch[state][i] = templateForIndividualPoliticalSeat;
                });
              });
            } else if (branchName === 'legislativeLower') {
              _.each(states, state => {
                branch[state] = {};
                _.each(_.range(1, stateAssemblyDistrictsPerState[state]+1), i => {
                  branch[state][i] = templateForIndividualPoliticalSeat;
                });
              });
            } else if (branchName === 'executive') {
              _.each(states, state => {
                branch[state] = {
                  'headOfGovernment': templateForIndividualPoliticalSeat,
                  'deputyHeadOfGovernment': templateForIndividualPoliticalSeat
                };
              });
            }
          }
        });
      });
    }
  });
}

// the monetary values in this data are strings like '$1,000.00'
// if compared as is, '$800.00' > '$1,000.00' evaluates to true
//
// Therefore, before being compared, '$' and ',' must be removed
//
// This function take string number and returns float number
function toFloat(s) {
  return parseFloat(s.replace(/\$|,/g, ''));
}

function enterPresCandidates() {
  // TODO: Write a function to change election statuses instead of manually
  // writing it, like what redux reducers do.
  elections['US']['country']['executive'].status = 'active';

  return Promise.all(_.chain(filtered.P).each((candidate, partyCode) => {
    elections['US']['country']['executive'].candidates.push(xformCandidate(candidate));
  }));
}

function enterSenateCandidates() {
  return Promise.all(_.chain(filtered.S).each((state, stateCode) => {
    return Promise.all(_.chain(state).each((candidate, partyCode) => {
      elections['US']['country']['legislativeUpper'][stateCode]['1'].status = 'active';
      elections['US']['country']['legislativeUpper'][stateCode]['1'].candidates.push(xformCandidate(candidate));
    }));
  }));
}

function enterHouseCandidates() {
  let promises = [];
  _.each(filtered.H, (state, stateCode) => {
    _.each(state, (district, districtNum) => {
      return Promise.all(_.chain(district).each((candidate, partyCode) => {

        // some have empty arrays are are bs (ex. CO 0, MD 35)
        if (district.candidates.length) {

          // FEC uses 0 for districts-at-large. I use 1.
          const realDistNum = (districtNum === '0') ? '1' : districtNum;

          // there are some registered candidates for nonexistent districts (ex. OH 92, VA 32)
          if (typeof elections['US']['country']['legislativeLower'][stateCode][realDistNum] !== 'undefined') {
            // console.log(`${stateCode} ${districtNum} -> ${realDistNum}`);
            // console.log(elections['US']['country']['legislativeLower'][stateCode]);
            // console.log(district);
            elections['US']['country']['legislativeLower'][stateCode][realDistNum].status = 'active';
            elections['US']['country']['legislativeLower'][stateCode][realDistNum].candidates.push(xformCandidate(candidate));
            console.log('baz');
          }
        }
      }));
    });
  });
}

function xformCandidate(FEC_candidate) {
  const fec = FEC_candidate;
  return {
    name: prettifyName(fec.can_nam),
    status: fec.can_inc_cha_ope_sea,
    address: [{
      line1: fec.can_str1,
      line2: fec.can_str2,
      city: fec.can_cit,
      state: fec.can_sta,
      zip: fec.can_zip,
    }],
    party: partyCodesToName[fec.can_par_aff],
    phones: [],
    urls: [],
    photoUrl: "",
    channels: []
  };
}

function countHouseElections() {
  const n = _.reduce(filtered.H, (result, state, stateCode) => {
      // keys of state are district numbers
      return (result + Object.keys(state).length);
  }, 0);
  console.log(`there are ${n} house elections`);
}

function printPrettyCandidates(mapOfPartyToCandidate) {
  _.forIn(mapOfPartyToCandidate, (cand, partyCode) => {
    console.log(`${cand.can_nam} ${cand.can_par_aff}`)
    console.log(xformCandidate(cand));
  });
}

function validateAndPrettifyFECData(C) {
  // WORKS, but just returns an array of candidates
  // return Promise.each(C, (c, i) => {
  //   C[i] = xformCandidate(c);
  // });

  return Promise.reduce(C, (res, c, i) => {

    // array of candidate objects
    if (typeof res.candidates === 'undefined') res.candidates = [];

    // Array of urls
    if (typeof res.pollsSources === 'undefined') res.pollsSources = [];


    /* members of mostRecentPolls are {}
       structure of members: { source: "",
                               date: "",
                               polls: {
                                  REP: {
                                      name: "",
                                      pct: 100,
                                      index: index in res.candidates
                                  },
                                  DEM: { ... }
                               }
                             }
    */
    if (typeof mostRecentPolls === 'undefined') res.mostRecentPolls = [];

    res.candidates.push(xformCandidate(c));
    return res;
  }, {});
}

function validateAndPrettifyS(S) {
  return Promise.reduce(Object.keys(S), (res, state) => {
    return validateAndPrettifyFECData(S[state]).then(C => {
      res[state] = C;
      return res;
    });
  }, {});
}

function validateAndPrettifyH(H) {
  return Promise.reduce(Object.keys(H), (res, state) => {
    return validateAndPrettifyS(H[state]).then(C => {
      res[state] = C;
      return res;
    });
  }, {});
}

function prettifyName(name) {
  /*
    1. If there's a '/' in the name, then there's a vice-candidate so
        i. split by '/'
       ii. for each name, call the generic prettifyName function
    2. generic prettifyName:
      i. split by ','
     ii. invert the order of the resulting elements;
         this turns [lastName, firstName middleName] into [firstName middleName, lastName]
    iii. split "firstName middleName" by ' ', then return only the firstName
     iv. join firstName and lastName
  */

  function pascalCase(n) {
    function pascalCaseSubname(subName) {
      if (_.includes(subName, 'MC')) {
        return `${subName[0]}${subName[1].toLowerCase()}${subName[2]}${subName.substring(3, subName.length).toLowerCase()}`;
      } else if (_.includes(subName, 'O\'')) {
        return `${subName.substring(0, 3)}${subName.substring(3, subName.length).toLowerCase()}`;
      } else {
        return `${subName[0]}${subName.substring(1, subName.length).toLowerCase()}`;
      }
    }

    let a = n.split(' ');
    a = _.each(a, (name, i, names) => {
      names[i] = pascalCaseSubname(name);
    });
    return _.join(a, ' ');
  }

  function extractPresCandName(n) {
    let a = _.reverse(n.split(','));
    return _.join(a, ' ');
  }

  function hasSuffix(n) {
    let res = false;
    const suffixes = ['JR', 'SR', 'II', 'III', 'IV'];
    _.each(suffixes, suffix => {
      res = res || _.includes(n, suffix);
    });
    return res;
  }

  function removeMiddleName(n) {
    let a = n.split(' ');
    if (a.length > 2) {
      if (hasSuffix(n)) {
        return `${a[0]} ${a[a.length-2]} ${a[a.length-1]}`;
      } else {
        return `${a[0]} ${a[a.length-1]}`;
      }
    } else {
      return n;
    }
  }

  // Whoever input the FEC data fucked up
  if (_.includes(name, 'GARY JOHNSON')) name = 'GARY JOHNSON';
  if (_.includes(name, 'MCMULLIN / NATHAN DANIEL, EVAN JOHNSON')) name = 'EVAN MCMULLIN';
  if (_.includes(name, 'DUCKWORTH, L TAMMY')) name = 'TAMMY DUCKWORTH';
  if (_.includes(name, 'GILLAM')) name = 'LEROY GILLAM';
  if (_.includes(name, "NEILL")) name = "DAN O'NEILL";

  if (_.includes(name, '/')) {
    name = _.each(name.split('/'), (n, i, names) => {
      names[i] = extractPresCandName(n.trim());
    })[0].trim();
  } else {
    name = extractPresCandName(name).trim()
  }

  name = removeMiddleName(name);
  name = pascalCase(name);
  return name;
}

function printNameGivenSubname(name, subName) {
  if (_.includes(name, subName)) console.log(name);
}

validateAndArrangeByOffice(FEC_Candidates_Data).then(res => {
  /*
    Issues with res; it's not done validating.
    1. There may be duplicate candidates in an array, so later use
    can_id to make sure there's only 1 in elections doc.
    2. Tot_rec may be empty string, so let the first candidate
    of party enter elections doc regardless of whether tot_rec is defined.
    Then, if there are others, idk.
  */
  Promise.props({
    P: filterPresGeneralElectionBallots(res.P).then(validateAndPrettifyFECData),
    S: filterSenGeneralElectionBallots(res.S).then(validateAndPrettifyS),
    H: filterHouseGeneralElectionBallots(res.H).then(validateAndPrettifyH)
  }).then(federalElections => {
    // remove invalid senate ballots
    federalElections.S['NJ'] = [];
    federalElections.S['NE'] = [];
    delete federalElections.H['OH'][92];
    delete federalElections.H['VA'][32];
    delete federalElections.H['MD'][35];
    delete federalElections.H['MD'][''];
    delete federalElections.H['FL'][''];
    delete federalElections.H['AK']['NaN'];
    delete federalElections.H['AS']['NaN'];
    delete federalElections.H['CO'][''];
    delete federalElections.H['PR'][98];
    delete federalElections.H['DC'][98];

    // Had wrong candidate
    _.each(federalElections.H['TX'][14], (can, i, cans) => {
      if (_.includes(can.party, 'Dem')) {
        cans[i].name = 'Michael Cole';
        cans[i].address = [{
          line1: 'PO Box 1963',
          line2: '',
          city: 'Beaumont',
          state: 'TX',
          zip: '77704'
        }];
      }
    });

    MongoClient.connect(dbconfig.uri, (err, db) => {
      if (err) throw err;
      console.log(`Connected to mongo database ${dbconfig.dbname}`);

      const doc = {
        name: 'United States of America',
        iso_a2: 'US',
        iso_a3: 'USA',
        country: {
          executive: federalElections.P,
          legislativeUpper: federalElections.S,
          legislativeLower: federalElections.H
        },
        adminSubdiv1: {},
      };

      // console.log(doc.country.legislativeLower['GA']);

      const collectionName = 'elections';
      // CREATING
      db.collection(collectionName).insert(doc, (err, result) => {
        if (err) throw err;
        console.log(result);
        console.log(`Successfully written to ${collectionName} collection.`)
      });
    });
  }, err => {
    throw err;
  });
});
