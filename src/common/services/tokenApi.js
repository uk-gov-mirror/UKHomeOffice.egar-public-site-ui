const request = require('request');
const moment = require('moment');
const Sequelize = require('sequelize');
const logger = require('../utils/logger')(__filename);
const endpoints = require('../config/endpoints');
const db = require('../utils/db');
const config = require('../config/index');

const { lte } = Sequelize.Op;

module.exports = {
  /**
   * Sends user tokenId to API.
   *
   * @param {String} tokenId token id
   * @param {String} userId user id for which token was generated
   * @returns {Promise} returns response body when resolved
   */
  setToken(tokenId, userId) {
    return new Promise((resolve, reject) => {
      request.post(
        {
          headers: { 'content-type': 'application/json' },
          url: endpoints.setToken(),
          body: JSON.stringify({
            tokenId,
            userId,
          }),
        },
        (error, _response, body) => {
          if (error) {
            logger.error('There was a problem calling the settoken API');
            logger.error(error);
            reject(error);
          }
          logger.debug('Successfully called settoken API');
          resolve(body);
        }
      );
    });
  },

  /**
   * Sends updated user tokenId to API. This presumes the existence of a token.
   *
   * @param {String} tokenId token id
   * @param {String} userId user id for which token was generated
   * @returns {Promise} returns response body when resolved
   */
  updateToken(tokenId, userId) {
    return new Promise((resolve, reject) => {
      request.put(
        {
          headers: { 'content-type': 'application/json' },
          url: endpoints.setToken(),
          body: JSON.stringify({
            tokenId,
            userId,
          }),
        },
        (error, _response, body) => {
          if (error) {
            logger.error('There was a problem calling the updateToken API');
            reject(error);
            return;
          }
          logger.info('Successfully called updateToken API');
          resolve(body);
        }
      );
    });
  },

  /**
   * Sends organisation invite token to API for storage.
   *
   * @param {String} tokenId token id to be stored
   * @param inviterId
   * @param {String} organisationId organisationid of the organisation sending the invite
   * @param roleName
   * @param inviteeEmail
   * @returns {Promise} returns response body when resolved.
   */
  setInviteUserToken(tokenId, inviterId, organisationId, roleName, inviteeEmail = null) {
    const requestBody = {
      tokenId,
      inviterId,
      organisationId,
      roleName,
    };

    if (inviteeEmail) {
      requestBody.inviteeEmail = inviteeEmail;
    }

    return new Promise((resolve, reject) => {
      request.post(
        {
          headers: { 'content-type': 'application/json' },
          url: endpoints.setToken(),
          body: JSON.stringify(requestBody),
        },
        (error, _response, body) => {
          if (error) {
            logger.error('There was a problem calling the setInviteUserToken API');
            reject(error);
            return;
          }
          logger.info('Successfully called setInviteUserToken API');
          resolve(body);
        }
      );
    });
  },

    /**
   * Validates the number of verification attempts for a token.
   *
   * @param {Object} UserSession object
   */
  validNumAttempts(token) {
    token.increment('NumAttempts', { by: 1 });
    logger.info(`Token verification attempt number ${token.NumAttempts}`);
    return token.NumAttempts <= config.MFA_TOKEN_MAX_ATTEMPTS;
  },
};
