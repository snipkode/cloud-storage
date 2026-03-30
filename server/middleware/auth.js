const { admin } = require('../lib/firebase-admin');
const { getUserRole } = require('./role');
const logger = require('../lib/logger');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token; // Support token in query param for video streaming

    logger.debug('[Auth] Request headers:', {
      hasAuthHeader: !!authHeader,
      authHeaderStart: authHeader?.substring(0, 10),
      hasQueryToken: !!queryToken,
      path: req.path
    });

    // Get token from header or query param
    let token;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
    } else if (queryToken) {
      token = queryToken;
      logger.debug('[Auth] Using token from query param');
    } else {
      logger.warn('[Auth] No token provided in header or query');
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    logger.debug('[Auth] Token received:', {
      tokenLength: token?.length,
      tokenStart: token?.substring(0, 10)
    });

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
    }

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Get user role from Firestore
    const role = await getUserRole(decodedToken.uid);

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
      role,
      authMethod: 'firebase'
    };

    next();
  } catch (error) {
    logger.error('Auth error:', error.message);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }

    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = authMiddleware;
