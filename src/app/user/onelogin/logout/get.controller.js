const { getOneLoginLogoutUrl } = require('../../../../common/utils/oneLoginAuth');
const CookieModel = require('../../../../common/models/Cookie.class');

module.exports = (req, res) => {
  const state = req.cookies?.state;
  const idToken = req.session?.id_token;
  const logoutUrl = state && idToken ? getOneLoginLogoutUrl(req, idToken, state) : '/welcome/index';

  // Destroy session and clear cookies before redirecting
  if (req.session) {
    const cookie = new CookieModel(req);

    req.session.destroy(() => {
      cookie.reset();

      // Clear all cookies
      const cookies = req.cookies;
      for (const cookieName in cookies) {
        res.clearCookie(cookieName);
      }
      res.redirect(logoutUrl);
    });
  } else {
    // If no session, just clear cookies and redirect
    const cookies = req.cookies;
    for (const cookieName in cookies) {
      res.clearCookie(cookieName);
    }
    res.redirect('/welcome/index');
  }
};
