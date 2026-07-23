module.exports = {
  CSRF_EXCLUSION_LIST: [
    '/help',
    '/login',
    '/user/logout',
    '/user/details',
    '/public/.*',
    '/assets/.*',
    '/javascripts/.*',
    '/stylesheets/.*',
    '/',
    '/error/.*',
  ],
};
