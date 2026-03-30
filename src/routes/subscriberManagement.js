import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateUser } from "../middleware/authMiddleware.js";

const prisma = new PrismaClient();
const router = express.Router();

// All routes require admin JWT
router.use(authenticateUser);

// GET / — List subscribers for a blog (paginated)
router.get("/", async (req, res) => {
  try {
    const { blogId, tier, search, page = 1, limit = 50 } = req.query;

    if (!blogId) {
      return res.status(400).json({ error: "blogId is required" });
    }

    const parsedBlogId = parseInt(blogId);

    // Verify blog ownership
    const blog = await prisma.blog.findUnique({
      where: { id: parsedBlogId },
      select: { id: true, adminId: true },
    });

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    if (req.user.role !== "SUPER_ADMIN" && blog.adminId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Build filter
    const where = { blogId: parsedBlogId };
    if (tier) where.tier = tier;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
        select: {
          uuid: true,
          email: true,
          name: true,
          tier: true,
          confirmedAt: true,
          patreonId: true,
          createdAt: true,
        },
      }),
      prisma.subscriber.count({ where }),
    ]);

    res.json({
      subscribers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error listing subscribers:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /stats — Subscriber counts by tier
router.get("/stats", async (req, res) => {
  try {
    const { blogId } = req.query;

    if (!blogId) {
      return res.status(400).json({ error: "blogId is required" });
    }

    const parsedBlogId = parseInt(blogId);

    const [total, free, premium, confirmed] = await Promise.all([
      prisma.subscriber.count({ where: { blogId: parsedBlogId } }),
      prisma.subscriber.count({ where: { blogId: parsedBlogId, tier: "FREE" } }),
      prisma.subscriber.count({ where: { blogId: parsedBlogId, tier: "PREMIUM" } }),
      prisma.subscriber.count({ where: { blogId: parsedBlogId, confirmedAt: { not: null } } }),
    ]);

    res.json({ total, free, premium, confirmed, unconfirmed: total - confirmed });
  } catch (error) {
    console.error("Error getting subscriber stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /:uuid — Remove a subscriber
router.delete("/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;

    const subscriber = await prisma.subscriber.findUnique({
      where: { uuid },
      include: { blog: { select: { adminId: true } } },
    });

    if (!subscriber) {
      return res.status(404).json({ error: "Subscriber not found" });
    }

    if (req.user.role !== "SUPER_ADMIN" && subscriber.blog.adminId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.subscriber.delete({ where: { uuid } });

    res.json({ success: true, message: "Subscriber removed" });
  } catch (error) {
    console.error("Error deleting subscriber:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
