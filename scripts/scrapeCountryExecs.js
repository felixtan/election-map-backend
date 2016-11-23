import _ from 'lodash';
import MongoClient from 'mongodb';
import Promise from 'bluebird';
import dbconfig from '../config/mongo';
import countries from '../utils/countriesList';
import { getRep, getRepTest, writeBigDocToDB } from '../utils/helpers';

const collectionName = "countryExecutives";
const params = {};

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;
  console.log(`Connected to mongo database ${dbconfig.dbname}`);
  let doc = {};
  Promise.map(countries, country => {
    doc[country] = {};
    return getRep(params).then(data => {
      if (typeof data.error === 'undefined') {
        _.each(data.offices, (office, index) => {
          _.each(office.roles, role => {
            _.each(office.officialIndices, i => {
              doc[country][role] = data.reps[i];
              doc[country][role].office = office.name;
            });
          });
        });
      }

      console.log(`created entry for ${country}...`);
    });
  }).then(() => {
    writeBigDocToDB(db, collectionName, doc);
  }).catch(err => {
    throw err;
  });
});
