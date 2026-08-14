// Npm dependencies
const express = require('express');

// Middleware
const flagpole = require('../../common/middleware/flagpole');
const usercheck = require('../../common/middleware/usercheck');
const csrfcheck = require('../../common/middleware/csrfcheck');
const parseForm = require('../../common/middleware/parseForm');
const pageAccess = require('../middleware/pageAccess');

const logger = require('./logger')(__filename);
const CookieModel = require('../models/Cookie.class');
const garAccessCheck = require('../middleware/garOwnership');

const buildRouterAndPaths = (path, getController, postController) => {
  // Initialisation
  const router = new express.Router();
  const indexPath = path;
  const paths = {
    index: indexPath,
  };

  // Routing
  router.get(paths.index, flagpole, usercheck, csrfcheck, pageAccess, getController);
  if (postController) {
    router.post(paths.index, flagpole, usercheck, parseForm, csrfcheck, pageAccess, postController);
  }

  return { router, paths };
};

const buildRouterAndPathsNoUserCheck = (path, getController, postController) => {
  // Initialisation
  const router = new express.Router();
  const indexPath = path;
  const paths = {
    index: indexPath,
  };

  // Routing
  router.get(paths.index, flagpole, csrfcheck, getController);
  if (postController) {
    router.post(paths.index, flagpole, parseForm, csrfcheck, postController);
  }

  return { router, paths };
};

/**
 * Some pages just simply create a Cookie instance of the request and render
 * the response for the given page. So this is a convenience method to perform
 * that step.
 *
 * @param {} req incoming request
 * @param {*} res outgoing response
 * @param {*} page page to render
 */
const simpleGetRender = (req, res, page) => {
  logger.info(`Rendering page ${page}`);
  const cookie = new CookieModel(req);
  res.render(page, { cookie });
};

exports.garMiddlewares = (initialMiddleware = []) => {
  let middlewares = [flagpole, usercheck, parseForm, csrfcheck];

  if (initialMiddleware) {
    middlewares = [...initialMiddleware];
  }

  middlewares.push(garAccessCheck);
  return middlewares;
};

/**
 *  A utility function for building route with the ability to dynamically add middlewares are needed.
 *
 * @param router express.Router
 * @param path string
 * @param method string
 * @param middlewares Array - list of middleware to pass before controller
 * @param controller function - controller to instantiate
 */
let buildRoute = (router, path, method, middlewares, controller) => {
  let middlewareConfig = middlewares || defaultMiddleware;

  switch (method.toUpperCase()) {
    case 'GET':
      router.get(path, ...middlewareConfig, controller);
      break;
    case 'POST':
      router.post(path, ...middlewareConfig, controller);
      break;
    case 'DELETE':
      router.delete(path, ...middlewareConfig, controller);
      break;
    default:
      throw new Error(`Unsupported method ${method.toUpperCase()}`);
  }

  return router;
};

exports.buildGarRouterAndPaths = (path, getController, postController, middlewares = []) => {
  const router = new express.Router();
  const paths = { index: path };

  const getMiddlewares = [flagpole, usercheck, csrfcheck, pageAccess, garAccessCheck, ...middlewares];
  const postMiddlewares = [flagpole, usercheck, parseForm, csrfcheck, garAccessCheck, ...middlewares];

  buildRoute(router, paths.index, 'GET', getMiddlewares, getController);

  if (postController) {
    buildRoute(router, paths.index, 'POST', postMiddlewares, postController);
  }

  return { router, paths };
};

exports.simpleGetRender = simpleGetRender;
exports.buildRouterAndPaths = buildRouterAndPaths;
exports.buildRouterAndPathsNoUserCheck = buildRouterAndPathsNoUserCheck;
