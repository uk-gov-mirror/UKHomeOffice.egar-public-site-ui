const winston = require('winston');
const config = require('../config/index');
const { getCorrelationId } = require('./correlationContext');

const LEVEL_NAME_MAP = { warn: 'WARNING' };

const uppercaseLevelFormat = winston.format((info) => {
  info.level = LEVEL_NAME_MAP[info.level] || info.level.toUpperCase();
  return info;
});

const logger = winston.createLogger({
  level: config.LOG_LEVEL.toLowerCase(),
  format: winston.format.combine(winston.format.timestamp(), uppercaseLevelFormat(), winston.format.json()),
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), uppercaseLevelFormat(), winston.format.json()),
    })
  );
}

const getCallerLineNumber = () => {
  const stack = new Error().stack?.split('\n') ?? [];
  const callerFrame = stack.find(
    (line) => (line.includes('.js:') || line.includes('.ts:')) && !line.includes('common/utils/logger'),
  );

  if (!callerFrame) {
    return undefined;
  }

  const match = callerFrame.match(/:(\d+):\d+\)?$/);
  return match ? Number(match[1]) : undefined;
};

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

const buildMetadata = (fileName, metadata) => {
  const correlationId = getCorrelationId();
  const logMetadata = {
    fileName,
  };

  if (correlationId) {
    logMetadata.correlationId = correlationId;
  }

  const lineNumber = getCallerLineNumber();
  if (lineNumber !== undefined) {
    logMetadata.lineNumber = lineNumber;
  }

  if (metadata === undefined) {
    return logMetadata;
  }

  if (metadata instanceof Error) {
    return {
      ...logMetadata,
      errorMessage: metadata.message,
      stack: metadata.stack,
    };
  }

  if (typeof metadata === 'object' && metadata !== null) {
    return {
      ...logMetadata,
      ...metadata,
    };
  }

  return {
    ...logMetadata,
    metadata: formatValue(metadata),
  };
};

module.exports = (fileName) => {
  // Dockerfile stores and sets working dir to public-site, so remove it from file path
  const normalisedFileName = fileName.replace('/public-site/', '/');
  const loggerWithFilename = {
    error: (text, metadata) => logger.error(formatValue(text), buildMetadata(normalisedFileName, metadata)),
    warn: (text, metadata) => logger.warn(formatValue(text), buildMetadata(normalisedFileName, metadata)),
    debug: (text, metadata) => logger.debug(formatValue(text), buildMetadata(normalisedFileName, metadata)),
    info: (text, metadata) => logger.info(formatValue(text), buildMetadata(normalisedFileName, metadata)),
  };

  return loggerWithFilename;
};
