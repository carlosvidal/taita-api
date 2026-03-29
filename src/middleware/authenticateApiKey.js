import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Middleware to authenticate requests using API keys.
 * Expects header: X-API-Key: tb_live_xxx
 *
 * Attaches req.blog and req.apiKey to the request.
 */
const authenticateApiKey = (requiredPermission) => {
  return async (req, res, next) => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        error: "Missing API key",
        message: "Include your API key in the X-API-Key header",
        docs: "https://taita.blog/docs/api",
      });
    }

    try {
      const keyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKey },
        include: { blog: true },
      });

      if (!keyRecord) {
        return res.status(401).json({
          error: "Invalid API key",
          message: "The provided API key is not valid",
        });
      }

      if (!keyRecord.active) {
        return res.status(403).json({
          error: "API key disabled",
          message: "This API key has been deactivated",
        });
      }

      if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
        return res.status(403).json({
          error: "API key expired",
          message: "This API key has expired. Generate a new one from the CMS.",
        });
      }

      if (requiredPermission && !keyRecord.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          error: "Insufficient permissions",
          message: `This API key does not have the '${requiredPermission}' permission`,
        });
      }

      // Update last used timestamp (fire and forget)
      prisma.apiKey.update({
        where: { id: keyRecord.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});

      // Attach to request
      req.blog = keyRecord.blog;
      req.apiKey = keyRecord;

      next();
    } catch (error) {
      console.error("API Key auth error:", error);
      return res.status(500).json({
        error: "Authentication failed",
        message: "An error occurred while validating your API key",
      });
    }
  };
};

export default authenticateApiKey;
