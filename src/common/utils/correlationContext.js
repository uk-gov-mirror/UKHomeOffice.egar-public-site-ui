const { AsyncLocalStorage } = require('async_hooks');
const { v4: uuidv4 } = require('uuid');

const correlationContext = new AsyncLocalStorage();

const correlationIdMiddleware = (req, _res, next) => {
  const correlationId = uuidv4();
  req.correlationId = correlationId;
  correlationContext.run({ correlationId }, next);
};

const getCorrelationId = () => correlationContext.getStore()?.correlationId;

module.exports = {
  correlationIdMiddleware,
  getCorrelationId,
};
