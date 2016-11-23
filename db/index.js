import client from 'mongodb';
import config from './config/mongodb.json';

client.connect(config.uri, (err, db) => {
  if (err) throw err;

  console.log('Connected to mongodb.');
  console.log(`collections: ${db.collections}`);
});
