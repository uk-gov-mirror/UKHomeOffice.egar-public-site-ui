const { expect } = require('chai');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire');
const moment = require('moment');
const nock = require('nock');

require('../../global.test');

const endpoints = require('../../../common/config/endpoints');
const tokenApi = require('../../../common/services/tokenApi');
const genToken = require('../../../common/services/create-token');
const config = require('../../../common/config/index');

const { MFA_TOKEN_EXPIRY, MFA_TOKEN_MAX_ATTEMPTS } = config;
const createStub = sinon.stub().resolves(true);
const updateStub = sinon.stub().resolves(true);
const findOneStub = sinon.stub().resolves({
  get() {
    return '2019-03-01 14:24:23.195+00';
  },
  increment() {
    this.NumAttempts += 1;
  },
  NumAttempts: 0,
});

describe('TokenService', () => {
  const url = '/user/settoken';
  const tokenId = '1ebc7b27-ae9f-4962-8bc4-434cdbc6c7ec';
  const newTokenId = '1be8ed60-fd12-400b-9dc1-350447272199';
  const userId = 'a066ca4e-9d08-49e4-8fcc-881daf9f1099';
  const orgId = 'a066ca4e-9d08-49e4-8888-881daf9f1099';
  const roleName = 'Owner';
  const BASE_URL = endpoints.baseUrl();

  beforeEach(() => {
    nock(BASE_URL).post(url, { tokenId, userId }).reply(201, {});

    nock(BASE_URL).put(url, { tokenId: newTokenId, userId }).reply(201, {});

    nock(BASE_URL)
      .post(url, {
        tokenId,
        inviterId: userId,
        organisationId: orgId,
        roleName,
      })
      .reply(201, {});
  });

  it('Should successfully call the settoken API', (done) => {
    tokenApi.setToken(tokenId, userId).then((response) => {
      const responseObj = JSON.parse(response);
      expect(typeof responseObj).to.equal('object');
      expect(responseObj).to.be.empty;
      done();
    });
  });

  it('should throw an error when calling the settoken API', () => {
    nock.cleanAll();
    nock(BASE_URL).post(url, { tokenId, userId }).replyWithError({ message: 'Example setToken error', code: 404 });

    tokenApi
      .setToken(tokenId, userId)
      .then(() => {
        chai.assert.fail('Should not have returned without error');
      })
      .catch((err) => {
        expect(err.message).to.equal('Example setToken error');
      });
  });

  it('should allow the updating of a tokenId', (done) => {
    tokenApi.updateToken(newTokenId, userId).then((response) => {
      const responseObj = JSON.parse(response);
      expect(typeof responseObj).to.equal('object');
      expect(responseObj).to.be.empty;
      done();
    });
  });

  it('should throw an error when updating a tokenId', () => {
    nock.cleanAll();
    nock(BASE_URL)
      .put(url, { tokenId: newTokenId, userId })
      .replyWithError({ message: 'Example updateToken error', code: 404 });

    tokenApi
      .updateToken(newTokenId, userId)
      .then(() => {
        chai.assert.fail('Should not have returned without error');
      })
      .catch((err) => {
        expect(err.message).to.equal('Example updateToken error');
      });
  });

  it('should successfully set the token of an invited org user', (done) => {
    tokenApi.setInviteUserToken(tokenId, userId, orgId, roleName).then((response) => {
      const responseObj = JSON.parse(response);
      expect(typeof responseObj).to.equal('object');
      expect(responseObj).to.be.empty;
      done();
    });
  });

  it('should throw an error when setting the token of an invited org user', () => {
    nock.cleanAll();
    nock(BASE_URL)
      .post(url, {
        tokenId,
        inviterId: userId,
        organisationId: orgId,
        roleName,
      })
      .replyWithError({ message: 'Example setInviteUserToken error', code: 404 });

    tokenApi
      .setInviteUserToken(tokenId, userId, orgId, roleName)
      .then(() => {
        chai.assert.fail('Should not have returned without error');
      })
      .catch((err) => {
        expect(err.message).to.equal('Example setInviteUserToken error');
      });
  });
});

describe('Generate Hash', () => {
  it('should successfully generate a hash', () => {
    config.NOTIFY_TOKEN_SECRET = 'example';
    const token = 'randominput'.toString();
    const output = genToken.generateHash(token);

    expect(output).not.to.equal(token);
    expect(output.length).to.eq(64);
  });
});
