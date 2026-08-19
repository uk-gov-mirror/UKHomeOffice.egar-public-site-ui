const CookieModel = require('../models/Cookie.class');
const { hasGarOwnership } = require('../../common/utils/garOwnership');
const logger = require('../utils/logger')(__filename);

module.exports = (req, res, next) => {
  const cookie = new CookieModel(req);
  const garId = (req.body && req.body.garId) || (req.query && req.query.garId) || cookie.getGarId();

  return Promise.resolve(hasGarOwnership(cookie, garId))
    .then(({ ok, gar }) => {
      if (!ok) {
        logger.error(
          `Detected an attempt by user-id: ${cookie.getUserDbId()} to access GAR id: ${garId} which does not match userId or OrganisationId.`
        );
        cookie.clearGar();
        return res.redirect('/home');
      }

      cookie.setGarId(gar.garId);
      res.locals.gar = gar;
      return next();
    })
    .catch(next);
};
