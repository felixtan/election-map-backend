import cheerio from 'cheerio';
import _ from 'lodash';
import MongoClient from 'mongodb';
import Promise from 'bluebird';
// import states from '../utils/statesTwoLetters';
// import congressDistrictsPerState from '../utils/congressionalDistrictsPerState';
// import stateSenateDistrictsPerState from '../utils/stateSenateDistrictsPerState';
// import stateAssemblyDistrictsPerState from '../utils/stateAssemblyDistrictsPerState';
import dbconfig from '../config/mongo';
import { delay } from '../utils/helpers'

// Params
const ELECTIONS = 'elections';
const REPS = 'houseReps'
const LEVEL = 'country'
const BRANCH = 'legislativeLower'
const STATE = 'GA'
// const DIST = '8'

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;
  console.log(`Connected to mongo database ${dbconfig.dbname}`);

  const elections = db.collection(ELECTIONS)
  const reps = db.collection(REPS)

  reps.findOne().then(repsDoc => {
    // console.log(rep)
    elections.findOne({ iso_a2: 'US' }).then(electionsDoc => {
      if (err) throw err;
      // console.log(electionsDoc[LEVEL][BRANCH][STATE][DIST])
      _.each(electionsDoc[LEVEL][BRANCH][STATE], (dist, distNum) => {
        // _.each(state, (dist, distNum) => {
          _.each(dist.candidates, (cand, index) => {
            let rep = repsDoc[STATE][distNum]

            if (rep.name !== 'Vacant' && distNum == 10 && index == 0) {

            let name = cand.name    // normalize this with winner name or rep name
            const nameArray = name.split(' ')
            const lastName = nameArray[nameArray.length-1]

            // Compare them
            // Use rep name or winner name as standard because the cand name comes from FEC data
            // and the FEC data was horrible
            if (_.includes(rep.name.toLowerCase(), lastName.toLowerCase()) && _.includes(cand.party, rep.party)) {
              rep.party = cand.party

              // FL AND GA ARE ALL FUCKED

              rep.photo = {
                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Jody_Hice_official_portrait.jpg/220px-Jody_Hice_official_portrait.jpg",
                title: null,
                attrib: null,
                changes: null,
                source: null
              }

              // rep.urls.concat(["https://en.wikipedia.org/wiki/Mo_Brooks", "https://ballotpedia.org/Mo_Brooks"])

              if (_.includes(dist.winner.name.toLowerCase(), lastName.toLowerCase()) && _.includes(dist.winner.party, rep.party)) {
                rep.name = dist.winner.name
                rep.party = dist.winner.party
              }

              const field = `${LEVEL}.${BRANCH}.${STATE}.${distNum}.candidates.${index}`

              delay(1000)
              elections.update({ iso_a2: "US"}, { $set: {
                [field]: rep
              }}, null, (err, result) => {
                if (result) {
                  console.log(`updated cand in ${STATE} ${distNum}`)
                } else {
                  console.log(`failed to update cand in ${STATE} ${distNum}`)
                  /*
                    LA 1
                  */
                }

                const field2 = `${STATE}.${distNum}`

                delay(1000)
                reps.update({}, { $set: {
                  [field2]: rep
                }}, null, (err, result) => {
                  if (result) {
                    console.log(`updated rep in ${STATE} ${distNum}`)
                  } else {
                    console.log(`failed to update rep in ${STATE} ${distNum}`)
                  }
                })
              })
            } else {
              console.log(`no match; ${STATE} ${distNum} rep: ${rep.name} cand: ${cand.name}`)
            }
            }
          })
        // })
      })
    })
  })
})

function getPhotoUrlsForSenateCans(senateBallots) {
  return Promise.reduce(Object.keys(senateBallots), (res, state) => {
    return getPhotoUrlForCans(senateBallots[state]).then(cans => {
      res[state] = cans;
      return res;
    });
  }, senateBallots);
}

// call on array of cans for a specific seat
function getPhotoUrlForCans(cans) {
  return Promise.each(cans, can => {
    return getPhotoUrl(can.name).then(url => {
      can.photoUrl = url;
    });
  });
}

function getPhotoUrl(name) {
  const encodedName = encodeName(name);
  const url = `https://en.wikipedia.org/wiki/${encodedName}`;

  return fetch(url).then(res => {
    return res.text();
  }).then(html => {
    let $ = cheerio.load(html);
    let src = $('table.infobox.vcard img').attr('src');
    let photoUrl = `http:${src}`;
    return (typeof src === 'undefined') ? '' : photoUrl;
  }).catch(err => {
    console.error(err);
  });
}

function encodeName(name) {
  return name.replace(/ /g, '_');
}
