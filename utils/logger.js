const winston = require('winston')
winston.emitErrs = true

const logger = new winston.Logger({
  transports: [
    new winston.transports.File({
      level: 'info',
      filename: './logs/all-logs.log',
      handleExceptions: true,
      json: true,
      maxsize: 5242880,
      maxFiles: 5,
      colorize: false,
      timestamp: true
    }),
    new winston.transports.Console({
      level: 'info',
      handleExceptions: true,
      json: false,
      colorize: true,
      timestamp: true
    })
  ],
  exitOnError: false
})

module.exports = logger
module.exports.stream = {
  write: function(message, encoding) {
    logger.info(message)
  }
}
