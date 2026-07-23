module.exports = {
  CSRF_EXCLUSION_LIST: [
    '/help',
    '/user/details',
    '/public/.*',
    '/assets/.*',
    '/javascripts/.*',
    '/stylesheets/.*',
    '/',
  ],
};
