const { expect } = require('chai');

require('../../global.test');

const usercheck = require('../../../common/middleware/usercheck');
const postController = require('../../../app/api/uploadfile/post.controller');
const { router, paths } = require('../../../app/api/uploadfile');

describe('API upload file router', () => {
  it('requires authentication before handling POST /upload', () => {
    const uploadRoute = router.stack.find((layer) => layer.route?.path === paths.index);

    expect(uploadRoute).to.exist;
    expect(uploadRoute.route.stack[0].handle).to.equal(usercheck);
    expect(uploadRoute.route.stack[uploadRoute.route.stack.length - 1].handle).to.equal(postController);
  });
});
