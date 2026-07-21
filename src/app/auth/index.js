const CookieModel = require('../../common/models/Cookie.class');
const logger = require('../../common/utils/logger')(__filename);
const garApi = require('../../common/services/garApi');
const checkGARUser = require('../../common/utils/checkGARUser');

const isAuthorized = (req) => {
  const cookie = new CookieModel(req);
  const userRole = cookie.getUserRole();
  const authorizedRoles = ['Admin', 'User', 'Manager'];
  return authorizedRoles.includes(userRole);
};

const isAuthorizedUserAccess = async (req, garId) => {
  const cookie = new CookieModel(req);

  if (!garId || cookie.getGarId() !== garId) {
    logger.info(`Supporting document request garId mismatch. Session GAR: ${cookie.getGarId()}, request GAR: ${garId}`);
    return false;
  }

  const garResponse = await garApi.get(garId);
  const parsedGar = JSON.parse(garResponse);

  if (Object.prototype.hasOwnProperty.call(parsedGar, 'message')) {
    logger.info(`Unable to authorize supporting document request for GAR: ${garId}`);
    return false;
  }

  return checkGARUser(parsedGar, cookie.getUserDbId(), cookie.getOrganisationId());
};

module.exports = {
  isAuthorized,
  isAuthorizedUserAccess,
};
