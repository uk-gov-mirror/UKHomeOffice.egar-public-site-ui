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

  it('logs json-compatible messages with structured metadata', () => {
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
          combine: sinon.stub().returns('combined-format'),
          timestamp: sinon.stub().returns('timestamp-format'),
          json: sinon.stub().returns('json-format'),
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

    expect(loggerMethods.info.firstCall.args[0]).to.equal('Starting up');
    expect(loggerMethods.info.firstCall.args[1]).to.deep.include({
      correlationId: 'corr-123',
      fileName: '/Users/henrysenior/workspace/egar/egar-public-site-ui/src/server.js',
    });
    expect(loggerMethods.info.firstCall.args[1]).to.have.property('lineNumber').that.is.a('number');
    expect(loggerMethods.debug.firstCall.args[0]).to.equal('Debugging');
    expect(loggerMethods.debug.firstCall.args[1]).to.deep.include({
      userId: 'user-1',
      correlationId: 'corr-123',
      fileName: '/Users/henrysenior/workspace/egar/egar-public-site-ui/src/server.js',
    });
    expect(loggerMethods.debug.firstCall.args[1]).to.have.property('lineNumber').that.is.a('number');
    expect(loggerMethods.warn.firstCall.args[0]).to.equal('Validation failed');
    expect(loggerMethods.error).to.have.been.calledOnce;
    expect(loggerMethods.error.firstCall.args[0]).to.include('Error: Boom');
    expect(loggerMethods.error.firstCall.args[1]).to.deep.include({
      correlationId: 'corr-123',
      fileName: '/Users/henrysenior/workspace/egar/egar-public-site-ui/src/server.js',
    });
    expect(loggerMethods.error.firstCall.args[1]).to.have.property('lineNumber').that.is.a('number');
  });
});
