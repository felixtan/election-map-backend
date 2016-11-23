const client = require('mongodb')
const express = require('express')
const bodyParser = require('body-parser')
const logger = require('morgan')
const config = require('./config/mongo.js')

const app = express()

// middleware
app.use(logger('combined'))
app.use('/', bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

client.connect(config.uri, (err, db) => {
  if (err) throw err;
  console.log('Connected to mongodb.');

  // Resource routers
  const representativesRouter = require('./routes/representatives')(db)
  const electionsRouter = require('./routes/elections')(db)

  // Connect routers to app
  app.use('/api/v1/representatives', representativesRouter)
  app.use('/api/v1/elections', electionsRouter)

  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
  });
});
