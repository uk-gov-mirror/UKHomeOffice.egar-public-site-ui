const CookieModel = require('../models/Cookie.class');
const { hasGarOwnership } = require('../../common/utils/garOwnership');
const logger = require('../utils/logger')(__filename);
const asyncHandler = require('../utils/asyncHandler');

module.exports = ({ isCbpId = false } = {}) =>
  asyncHandler(async (req, res, next) => {
    const cookie = new CookieModel(req);
    const garId = (req.body && req.body.garId) || (req.query && req.query.garId) || cookie.getGarId();
    const { ok, gar } = await hasGarOwnership(cookie, garId, { isCbpId });

    if (!ok) {
      logger.error(
        `Detected an attempt by user -di: ${cookie.getUserDbId()} to access GAR id: ${garId} which does not match userId or OrganisationId.`
      );
      cookie.clearGar();
      return res.redirect('/home');
    }
    cookie.setGarId(gar.garId);
    res.locals.gar = gar;
    next();
  });
