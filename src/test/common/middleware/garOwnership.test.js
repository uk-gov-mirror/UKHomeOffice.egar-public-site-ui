const sinon = require('sinon');
const { expect } = require('chai');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire');
require('../../global.test');

let middleware;

describe('middleware/garOwnership', () => {
  let res, req, next, cookieInstance, ownerShipStub, cookieMock;

  beforeEach(() => {
    chai.use(sinonChai);

    req = {
      body: {},
      query: {},
      session: {},
    };

    res = {
      redirect: sinon.spy(),
      locals: {},
    };
    next = sinon.spy();

    ownerShipStub = sinon.stub();

    cookieInstance = {
      getGarId: sinon.stub(),
      setGarId: sinon.spy(),
      clearGar: sinon.spy(),
      getUserDbId: sinon.stub().returns('123'),
    };

    cookieMock = sinon.stub().returns(cookieInstance);
    middleware = proxyquire('../../../common/middleware/garOwnership', {
      '../models/Cookie.class': cookieMock,
      '../utils/garOwnership': {
        hasGarOwnership: ownerShipStub,
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should call next when ownership is valid', async () => {
    ownerShipStub.resolves({ ok: true, gar: { garId: '123' } });
    req.body.garId = '123';

    const fn = middleware();
    await fn(req, res, next);

    expect(cookieInstance.setGarId).to.have.been.calledWith('123');
    expect(res.locals.gar).to.deep.equal({ garId: '123' });
    expect(next).to.have.been.called;
  });

  it('should redirect and clear cookie when ownership is invalid', async () => {
    req.body.garId = 'wrong-user';

    ownerShipStub.resolves({ ok: false, gar: null });

    const fn = middleware();
    await fn(req, res, next);

    expect(cookieInstance.clearGar).to.have.been.called;
    expect(res.redirect).to.have.been.calledWith('/home');
  });
});
