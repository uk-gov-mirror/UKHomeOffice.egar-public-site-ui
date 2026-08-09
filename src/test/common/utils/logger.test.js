const sinon = require('sinon');
const { expect } = require('chai');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire');

require('../../global.test');

describe('Logger utility', () => {
  beforeEach(() => {
    chai.use(sinonChai);
  });

  it('prefixes each log line with the active correlation id', () => {
    const loggerMethods = {
      add: sinon.spy(),
      error: sinon.spy(),
      warn: sinon.spy(),
      debug: sinon.spy(),
      info: sinon.spy(),
    };

    const loggerFactory = proxyquire('../../../common/utils/logger', {
      winston: {
        createLogger: sinon.stub().returns(loggerMethods),
        format: {
          json: sinon.stub().returns('json-format'),
          simple: sinon.stub().returns('simple-format'),
        },
        transports: {
          Console: sinon.stub().returns({}),
        },
      },
      './correlationContext': {
        getCorrelationId: () => 'corr-123',
      },
      '../config/index': {
        LOG_LEVEL: 'info',
      },
    });

    const logger = loggerFactory('/Users/henrysenior/workspace/egar/egar-public-site-ui/public-site/src/server.js');

    logger.info('Starting up');
    logger.debug('Debugging', { userId: 'user-1' });
    logger.warn('Validation failed');
    logger.error(new Error('Boom'));

    expect(loggerMethods.info.firstCall.args[0]).to.include('correlationId=corr-123 Starting up');
    expect(loggerMethods.debug.firstCall.args[0]).to.include('correlationId=corr-123 Debugging');
    expect(loggerMethods.debug.firstCall.args[1]).to.eql({ userId: 'user-1' });
    expect(loggerMethods.warn.firstCall.args[0]).to.include('correlationId=corr-123 Validation failed');
    expect(loggerMethods.error).to.have.been.calledOnce;
    expect(loggerMethods.error.firstCall.args[0]).to.include('correlationId=corr-123 Error: Boom');
  });
});
