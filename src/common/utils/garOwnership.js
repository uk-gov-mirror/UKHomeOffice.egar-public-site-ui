const dataAccessApi = require('../services/dataAccessApi');
const logger = require('./logger')(__filename);

/**
 * For a supplied GAR object, check that the user id or organisation id
 * match the given parameters. Returns true if there is a match or false
 * otherwise.
 *
 * @param {Object} parsedGar The GAR to check
 * @param {String} userId The user id to check against
 * @param {String} organisationId The organisation to check against
 */

const checkGARUser = (parsedGar, userId, organisationId) => {
  if (parsedGar === undefined || parsedGar === null) return false;

  if (parsedGar.organisationId && organisationId && parsedGar.organisationId === organisationId) {
    logger.info('GAR organisation id matches current user ID');
    return true;
  }
  if (parsedGar.userId === userId) {
    logger.info('GAR user id matches current user ID');
    return true;
  }
  return false;
};

/**
 *
 * @param cookie  CookieModel
 * @param garId   string
 * @param param2  object - {isCbpId: false}
 * @returns {Promise<{ok: boolean, gar: null}>}
 */
const hasGarOwnership = async (cookie, garId, { isCbpId = false } = {}) => {
  if (!garId) return { ok: false, gar: null };

  try {
    const gar = await dataAccessApi.garApi.get(garId, isCbpId);
    const ok = checkGARUser(gar, cookie.getUserDbId(), cookie.getOrganisationId());
    return { ok, gar };
  } catch (err) {
    logger.error(`Failed to verify GAR ownership garId=${garId}`);
    logger.debug(err);
    return { ok: false, gar: null };
  }
};

module.exports = { checkGARUser, hasGarOwnership };
