const jwt = require('jsonwebtoken');
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if(!authHeader) {
        return res.status(401).json({
            message: 'Token required'
        });
    }
    const [scheme, token] = authHeader.split(' ');
    if (!token || scheme !== 'Bearer') {
        return res.status(401).json({
            message: 'Invalid authorization header'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'access_secret_key');

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            message: 'Token invalid'
        });
    }
};
module.exports = authenticate;