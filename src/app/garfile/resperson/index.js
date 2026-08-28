const nav = require('../../../common/utils/nav');
const getController = require('./get.controller');
const postController = require('./post.controller');

module.exports = nav.buildGarRouterAndPaths('/garfile/resperson', getController, postController);
