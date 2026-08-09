const winston = require('winston');
const config = require('../config/index');
const { getCorrelationId } = require('./correlationContext');

const logger = winston.createLogger({
  level: config.LOG_LEVEL.toLowerCase(),
  format: winston.format.json(),
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

const formatValue = (value) => {
  if (value instanceof Error) {
    return value.stack || value.message;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
};

const getCorrelationPrefix = () => {
  const correlationId = getCorrelationId();
  return correlationId ? `correlationId=${correlationId} ` : '';
};

module.exports = (fileName) => {
  // Dockerfile stores and sets working dir to public-site, so remove it from file path
  const logPrefix = `${fileName.replace('/public-site/', '')}: `;
  const loggerWithFilename = {
    error: (text, metadata) => logger.error(logPrefix + getCorrelationPrefix() + formatValue(text), metadata),
    warn: (text, metadata) => logger.warn(logPrefix + getCorrelationPrefix() + formatValue(text), metadata),
    debug: (text, metadata) => logger.debug(logPrefix + getCorrelationPrefix() + formatValue(text), metadata),
    info: (text, metadata) => logger.info(logPrefix + getCorrelationPrefix() + formatValue(text), metadata),
  };

  return loggerWithFilename;
};
