const sinon = require('sinon');
const { expect } = require('chai');

require('../../global.test');

describe('CSRF Check Middleware', () => {
  let res;
  let req;
  let next;
  let proxiedMiddleware;

  beforeEach(() => {
    req = {
      csrfToken: () => {},
    };

    res = {
      locals: {},
      header: sinon.stub(),
    };
    next = sinon.spy();
    proxiedMiddleware = require('../../../common/middleware/csrfcheck');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should not generate token if path is in exclusion list', async () => {
    const requestPaths = [
      '/',
      '/user/details',
      '/assets/.*',
      '/javascripts/.*',
      '/stylesheets/.*',
      '/login',
      '/help',
      '/error/500',
    ];

    sinon.spy(req, 'csrfToken');

    for (const path of requestPaths) {
      req.path = path;

      await proxiedMiddleware(req, res, next);

      expect(req.csrfToken).to.not.have.been.called;
      expect(next).to.have.been.called;
    }
  });

  it('should generate token if path is not in exclusion list', async () => {
    const requestPaths = ['/home', '/organisation/assignrole', '/unknown_path'];

    sinon.spy(req, 'csrfToken');

    for (const path of requestPaths) {
      req.path = path;

      await proxiedMiddleware(req, res, next);

      expect(req.csrfToken).to.have.be.called;
      expect(next).to.have.been.called;
    }
  });
});
