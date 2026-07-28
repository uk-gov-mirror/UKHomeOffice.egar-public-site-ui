const sinon = require('sinon');
const { expect } = require('chai');
const chai = require('chai');
const sinonChai = require('sinon-chai');
const config = require('../../../common/config');

require('../../global.test');
const CookieModel = require('../../../common/models/Cookie.class');

const controller = require('../../../app/user/logout/get.controller');

describe('Logout Get Controller', () => {
  let req;
  let res;
  let sessionDestroyStub;

  beforeEach(() => {
    chai.use(sinonChai);

    req = {
      cookies: {},
      get: sinon.stub().withArgs('host').returns('public-site.dev.egar-notprod.homeoffice.gov.uk'),
      session: {
        u: { dbId: 'USER-DB-ID-1' },
        destroy: (callback) => callback(),
      },
    };
    res = {
      redirect: sinon.spy(),
      clearCookie: sinon.spy(),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should destroy session and redirect to welcome page for default logout', () => {
    sessionDestroyStub = sinon.stub(req.session, 'destroy').callsArg(0);

    const cookie = new CookieModel(req);
    cookie.reset();

    controller(req, res);

    expect(cookie.session.u).to.be.null;
    expect(sessionDestroyStub).to.have.been.calledOnce;
    expect(res.redirect).to.have.been.calledWith('/welcome/index');
  });

  it('should redirect to One Login logout URL using session id_token', () => {
    req.cookies = { state: 'valid_state' };
    req.session.id_token = 'session_id_token';
    config.ONE_LOGIN_INTEGRATION_URL = 'https://onelogin.example';
    config.ONE_LOGIN_LOGOUT_URL = 'https://public-site.dev.egar-notprod.homeoffice.gov.uk/onelogin/logout';

    sessionDestroyStub = sinon.stub(req.session, 'destroy').callsArg(0);

    controller(req, res);

    expect(sessionDestroyStub).to.have.been.calledOnce;
    expect(res.clearCookie).to.have.been.calledWith('state');
    expect(res.redirect).to.have.been.calledOnce;
    expect(res.redirect.firstCall.args[0]).to.contain('https://onelogin.example/logout?');
    expect(res.redirect.firstCall.args[0]).to.contain('id_token_hint=session_id_token');
    expect(res.redirect.firstCall.args[0]).to.contain('state=valid_state');
  });
});
