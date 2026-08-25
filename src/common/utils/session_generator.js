const logger = require('../utils/logger')(__filename);
const CookieModel = require('../models/Cookie.class');
/**
 * Regenerates the session identifier and migrates non-cookie, non-function state.
 * This prevents a pre-auth session identifier from being reused after login.
 */

const sessionRegenerateForAuthenticatedUser = (req) => {
  if (!req?.session || typeof req.session.regenerate !== 'function') {
    logger.error('Session regeneration unavailable during login flow.');
    return Promise.resolve(false);
  }
  const keysToPreserve = ['redirectUrl', 'currentUser'];

  const preservedState = keysToPreserve.reduce((acc, key) => {
    if (req.session[key] !== undefined && typeof req.session[key] !== 'function') {
      acc[key] = structuredClone(req.session[key]);
    }
    return acc;
  }, {});
  return new Promise((resolve) => {
    req.session.regenerate((error) => {
      if (error) {
        logger.error(`Failed to regenerate session during login: ${error}`);
        return resolve(false);
      }

      const cookie = new CookieModel(req);

      Object.assign(cookie.session, preservedState);

      return resolve(true);
    });
  });
};

module.exports = {
  sessionRegenerateForAuthenticatedUser,
};
