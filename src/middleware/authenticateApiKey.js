import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Middleware to authenticate requests using API keys.
 * Expects header: X-API-Key: tb_live_xxx
 *
 * Supports two scopes:
 * - blogId set: key is scoped to that specific blog (req.blog is set)
 * - adminId set: key has access to all blogs of that admin (req.blogs is set, req.blog resolved from X-Blog header)
 */
const authenticateApiKey = (requiredPermission) => {
  return async (req, res, next) => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        error: "Missing API key",
        message: "Include your API key in the X-API-Key header",
      });
    }

    try {
      const keyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKey },
        include: { blog: true, admin: { include: { blogs: true } } },
      });

      if (!keyRecord) {
        return res.status(401).json({ error: "Invalid API key" });
      }

      if (!keyRecord.active) {
        return res.status(403).json({ error: "API key disabled" });
      }

      if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
        return res.status(403).json({ error: "API key expired" });
      }

      if (requiredPermission && !keyRecord.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          error: "Insufficient permissions",
          message: `This API key does not have '${requiredPermission}' permission`,
        });
      }

      // Update last used (fire and forget)
      prisma.apiKey.update({
        where: { id: keyRecord.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});

      req.apiKey = keyRecord;

      if (keyRecord.blogId && keyRecord.blog) {
        // Scoped to a single blog
        req.blog = keyRecord.blog;
        req.blogs = [keyRecord.blog];
      } else if (keyRecord.adminId && keyRecord.admin) {
        // Scoped to all blogs of the admin
        req.blogs = keyRecord.admin.blogs;

        // Resolve which blog from X-Blog header or query param
        const blogIdentifier = req.headers["x-blog"] || req.query.blog;
        if (blogIdentifier) {
          req.blog = keyRecord.admin.blogs.find(
            (b) => b.subdomain === blogIdentifier || b.uuid === blogIdentifier || String(b.id) === blogIdentifier
          );
          if (!req.blog) {
            return res.status(404).json({
              error: "Blog not found",
              message: `No blog matching '${blogIdentifier}' found for this account`,
              available: keyRecord.admin.blogs.map((b) => b.subdomain),
            });
          }
        } else if (keyRecord.admin.blogs.length === 1) {
          // Auto-select if only one blog
          req.blog = keyRecord.admin.blogs[0];
        }
        // If multiple blogs and no X-Blog header, req.blog stays undefined
        // Routes that need it will check
      }

      next();
    } catch (error) {
      console.error("API Key auth error:", error);
      return res.status(500).json({ error: "Authentication failed" });
    }
  };
};

export default authenticateApiKey;
