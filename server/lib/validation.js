const { z } = require('zod');

// ==========================================
// API KEY VALIDATION
// ==========================================

/**
 * Schema for creating API key
 */
const createApiKeySchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'API key name is required')
      .max(100, 'API key name must be less than 100 characters')
      .trim(),
    permissions: z.array(z.enum(['read', 'upload', 'delete', 'admin']))
      .optional()
      .default(['read']),
    expiresAt: z.string().datetime().optional().nullable(),
    environment: z.enum(['test', 'live'])
      .optional()
      .default('live')
  })
});

/**
 * Schema for API key ID parameter
 */
const apiKeyIdSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, 'API key ID is required')
      .regex(/^key_[a-f0-9]{16}$/, 'Invalid API key ID format')
  })
});

// ==========================================
// FILE UPLOAD VALIDATION
// ==========================================

/**
 * Schema for folder creation
 */
const createFolderSchema = z.object({
  body: z.object({
    name: z.string()
      .min(1, 'Folder name is required')
      .max(100, 'Folder name must be less than 100 characters')
      .trim()
      .refine(
        name => !/[<>:"/\\|?*]/.test(name),
        'Folder name contains invalid characters'
      ),
    parentId: z.string().optional().nullable()
  })
});

/**
 * Schema for folder ID parameter
 */
const folderIdSchema = z.object({
  params: z.object({
    folderId: z.string()
      .min(1, 'Folder ID is required')
      .regex(/^folder_[a-f0-9]{16}$/, 'Invalid folder ID format')
  })
});

/**
 * Schema for filename parameter
 */
const filenameSchema = z.object({
  params: z.object({
    filename: z.string()
      .min(1, 'Filename is required')
      .refine(
        name => !name.includes('/') && !name.includes('..'),
        'Invalid filename - path traversal not allowed'
      )
  })
});

// ==========================================
// NOTIFICATION VALIDATION
// ==========================================

/**
 * Schema for creating notification
 */
const createNotificationSchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .trim(),
    message: z.string()
      .min(1, 'Message is required')
      .max(1000, 'Message must be less than 1000 characters')
      .trim(),
    type: z.enum(['info', 'warning', 'error', 'success'])
      .optional()
      .default('info'),
    priority: z.enum(['low', 'normal', 'high', 'urgent'])
      .optional()
      .default('normal'),
    targetUserId: z.string().optional(),
    isBroadcast: z.boolean().optional().default(false),
    metadata: z.record(z.any()).optional()
  })
});

/**
 * Schema for notification ID parameter
 */
const notificationIdSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, 'Notification ID is required')
      .regex(/^notif_[a-f0-9]{16}$/, 'Invalid notification ID format')
  })
});

// ==========================================
// USER ID VALIDATION
// ==========================================

/**
 * Schema for user ID
 */
const userIdSchema = z.object({
  body: z.object({
    userId: z.string()
      .min(1, 'User ID is required')
      .max(128, 'User ID too long')
  })
});

// ==========================================
// VALIDATION MIDDLEWARE
// ==========================================

/**
 * Create validation middleware from Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Parse and validate request
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: 'Validation error',
          details: errors
        });
      }
      next(error);
    }
  };
};

/**
 * Validate request body only
 * @param {z.ZodSchema} schema - Zod schema for body
 * @returns {Function} Express middleware
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: 'Validation error',
          details: errors
        });
      }
      next(error);
    }
  };
};

/**
 * Validate request params only
 * @param {z.ZodSchema} schema - Zod schema for params
 * @returns {Function} Express middleware
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: 'Validation error',
          details: errors
        });
      }
      next(error);
    }
  };
};

module.exports = {
  // Schemas
  createApiKeySchema,
  apiKeyIdSchema,
  createFolderSchema,
  folderIdSchema,
  filenameSchema,
  createNotificationSchema,
  notificationIdSchema,
  userIdSchema,
  
  // Middleware
  validate,
  validateBody,
  validateParams
};
