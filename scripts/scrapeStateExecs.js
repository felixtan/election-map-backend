import _ from 'lodash';
import MongoClient from 'mongodb';
import assert from 'assert';
import Promise from 'bluebird';
import states from '../utils/statesTwoLetters';
import dbconfig from '../config/mongo';
import { getRep, getRepTest, writeBigDocToDB } from '../utils/helpers';

const collectionName = "stateExecutives";
const params = {};

assert.deepStrictEqual(states.length, 56, `Error: states.length=${states.length}`);

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;
  console.log(`Connected to mongo database ${dbconfig.dbname}`);
  let doc = {};
  Promise.map(states, state => {
    doc[state] = {};
    return getRep(params, state).then(data => {
      if (typeof data.error === 'undefined') {
        const execOffices = _.reject(data.offices, (office, index, offices) => {
          if (typeof office.roles !== 'undefined') {
            return _.includes(office.roles, "legislatorUpperBody") || _.includes(office.roles, "legislatorLowerBody");
          }
        });

        _.each(execOffices, (office, index) => {
            _.each(office.officialIndices, i => {
              doc[state][office.name] = data.reps[i];
            });
        });
      }

      console.log(`created entry for ${state}...`);
    });
  }).then(() => {
    writeBigDocToDB(db, collectionName, doc);
  }).catch(err => {
    throw err;
  });
});
