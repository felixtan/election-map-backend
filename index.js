import client from 'mongodb';
import express from 'express';
import bodyParser from 'body-parser';
import config from './config/mongo.js';
// import { default as router } from './routes';

const app = express();
let db;

// middleware
app.use('/', bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// routes
app.get('/', (req, res) => {
  // console.log(req.body);
  // console.log(req.params);
  res.send('ok');
});

// GET all us senators or house reps or country level execs
app.get('/api/v1/:levelOfGov/:branchOfGov/:role/:country', (req, res) => {
  const q = req.params;
  // console.log(q);

  // TODO: Use query params in db query, not if statement
  // Role is not used when branchOfGov=executive
  if (q.levelOfGov === 'country' && q.country.toLowerCase() === 'us') {
    if (q.branchOfGov === 'legislative') {
      if (q.role === 'upper') {
        db.collection('senators').findOne().then(data => { res.json(data); });
      } else if (q.role === 'lower') {
        db.collection('houseReps').findOne().then(data => { res.json(data); });
      } else {
        res.status(400).json({ msg: 'Invalid role in request url' });
      }
    } else if (q.branchOfGov === 'executive') {
      db.collection('countryExecutives')
        .findOne({ iso_a2: q.country.toUpperCase() })
        .then(data => { res.json(data); });
    } else {
      res.status(400).json({ msg: 'Invalid branchOfGov in request url' });
    }
  } else if (q.levelOfGov === 'state' && q.country.toLowerCase() === 'us') {
    if (q.branchOfGov === 'legislative') {
      if (q.role === 'upper') {
        db.collection('stateSenators').findOne().then(data => { res.json(data); });
      } else if (q.role === 'lower') {
        db.collection('stateAssemblyMembers').findOne().then(data => { res.json(data); });
      } else {
        res.status(400).json({ msg: 'Invalid role in request url' });
      }
    } else {
      res.status(400).json({ msg: 'Invalid request url' });
    }
  } else {
    res.status(400).json({ msg: 'Invalid request url' });
  }
});

app.get('/api/v1/elections/:country', (req, res) => {
  const q = req.params;
  db.collection('elections').findOne({ iso_a2: q.country.toUpperCase() }).then((err, doc) => {
    if (err) {
      res.json(err);
    } else {
      res.json(doc);
    }
  });
});

// house reps and state legislators
app.get('/api/v1/:levelOfGov/:branchOfGov/:country/:subDivision/:role/:id', (req, res) => {
  // console.log(req.params);
  res.send('ok');
});

client.connect(config.uri, (err, _db) => {
  if (err) throw err;
  db = _db;
  console.log('Connected to mongodb.');

  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
  });
});
