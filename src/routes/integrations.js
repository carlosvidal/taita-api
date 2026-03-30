import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateUser } from "../middleware/authMiddleware.js";

const prisma = new PrismaClient();
const router = express.Router();

router.use(authenticateUser);

// GET / — Get integration settings for a blog
router.get("/", async (req, res) => {
  try {
    const { blogId } = req.query;

    if (!blogId) {
      return res.status(400).json({ error: "blogId is required" });
    }

    const parsedBlogId = parseInt(blogId);

    // Verify ownership
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

    const integration = await prisma.blogIntegration.findUnique({
      where: { blogId: parsedBlogId },
      select: {
        uuid: true,
        patreonClientId: true,
        patreonCampaignId: true,
        // Don't expose secrets
        patreonClientSecret: false,
        patreonWebhookSecret: false,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      integration: integration || null,
      hasPatreonSecret: integration?.patreonClientSecret ? true : false,
    });
  } catch (error) {
    console.error("Error getting integrations:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT / — Save/update integration settings
router.put("/", async (req, res) => {
  try {
    const { blogId, patreonClientId, patreonClientSecret, patreonCampaignId } =
      req.body;

    if (!blogId) {
      return res.status(400).json({ error: "blogId is required" });
    }

    const parsedBlogId = parseInt(blogId);

    // Verify ownership
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

    const data = {};
    if (patreonClientId !== undefined) data.patreonClientId = patreonClientId;
    if (patreonClientSecret !== undefined) data.patreonClientSecret = patreonClientSecret;
    if (patreonCampaignId !== undefined) data.patreonCampaignId = patreonCampaignId;

    const integration = await prisma.blogIntegration.upsert({
      where: { blogId: parsedBlogId },
      update: data,
      create: {
        blogId: parsedBlogId,
        ...data,
      },
    });

    res.json({
      success: true,
      integration: {
        uuid: integration.uuid,
        patreonClientId: integration.patreonClientId,
        patreonCampaignId: integration.patreonCampaignId,
      },
    });
  } catch (error) {
    console.error("Error saving integrations:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
