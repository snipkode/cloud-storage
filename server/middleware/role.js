const { db } = require('../lib/firebase-admin');

const USERS_COLLECTION = 'users';

/**
 * Get user role from Firestore
 * Roles: 'user', 'admin', 'super_admin'
 */
const getUserRole = async (userId) => {
  try {
    const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData.role || 'user';
    }

    // If user document doesn't exist, return default role
    return 'user';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'user';
  }
};

/**
 * Set user role in Firestore
 */
const setUserRole = async (userId, role) => {
  try {
    await db.collection(USERS_COLLECTION).doc(userId).set({
      role,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    return false;
  }
};

/**
 * Middleware to check if user has required role
 */
const requireRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      // Get user role from request (set by auth middleware) or from Firestore
      let userRole = req.user?.role;

      if (!userRole) {
        userRole = await getUserRole(req.user?.uid);
        // Attach role to request for future use
        if (req.user) {
          req.user.role = userRole;
        }
      }

      // Role hierarchy: super_admin > admin > user
      const roleHierarchy = {
        user: 0,
        admin: 1,
        super_admin: 2
      };

      const userRoleLevel = roleHierarchy[userRole] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Insufficient permissions. Required role: ${requiredRole}, your role: ${userRole}`
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify user role'
      });
    }
  };
};

/**
 * Check if user has specific role (helper function)
 */
const hasRole = async (userId, role) => {
  const userRole = await getUserRole(userId);
  const roleHierarchy = {
    user: 0,
    admin: 1,
    super_admin: 2
  };

  const userRoleLevel = roleHierarchy[userRole] || 0;
  const requiredRoleLevel = roleHierarchy[role] || 0;

  return userRoleLevel >= requiredRoleLevel;
};

module.exports = {
  getUserRole,
  setUserRole,
  requireRole,
  hasRole
};
