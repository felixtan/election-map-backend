const cluster = require('cluster')
const express = require('express')
const logger = require('./utils/logger')

if (cluster.isMaster) {
  let WORKERS = process.env.NODE_ENV === 'production' ? (process.env.WEB_CONCURRENCY || 1) : require('os').cpus().length

  logger.log('info', `Master cluster setting up ${WORKERS} workers...`);

  for (let i = 0; i < WORKERS; i++) {
    cluster.fork()
  }

  cluster.on('online', (worker) => {
    logger.log('info', `Worker pid=${worker.process.pid} is online.`);
  })

  // If an instance of the app crashes, restart it
  cluster.on('exit', (worker, code, signal) => {
    logger.log('info', `Worker pid=${worker.process.pid} died with code ${code} and signal ${signal}`)
    logger.log('info', 'Starting a new worker...')
    cluster.fork()
  })
} else {
  const client = require('mongodb')
  const bodyParser = require('body-parser')
  const compression = require('compression')
  const config = require('./config/mongo')

  const app = express()

  // middleware
  app.use(compression({ level: 9 }))
  app.use(require('morgan')('combined', { stream: logger.stream }))
  app.use('/', bodyParser.json());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  client.connect(config.uri, (err, db) => {
    if (err) throw err;
    logger.log('info', `Connected to mongodb.`);

    // Resource routers
    const representativesRouter = require('./routes/representatives')(db)
    const electionsRouter = require('./routes/elections')(db)

    // Connect routers to app
    app.use('/api/v1/representatives', representativesRouter)
    app.use('/api/v1/elections', electionsRouter)

    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      logger.log(`Listening on port ${PORT}.`);
    });
  });
}
