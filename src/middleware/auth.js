// En middleware/auth.js (o en el archivo que estés usando)
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

module.exports = { isLoggedIn };
