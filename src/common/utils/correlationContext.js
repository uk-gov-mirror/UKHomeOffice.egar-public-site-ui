const { AsyncLocalStorage } = require('async_hooks');
const { v4: uuidv4 } = require('uuid');

const correlationContext = new AsyncLocalStorage();

const correlationIdMiddleware = (_req, _res, next) => {
  correlationContext.run({ correlationId: uuidv4() }, next);
};

const getCorrelationId = () => correlationContext.getStore()?.correlationId;

module.exports = {
  correlationIdMiddleware,
  getCorrelationId,
};
