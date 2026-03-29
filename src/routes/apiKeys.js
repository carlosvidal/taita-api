import express from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * Generate a secure API key with prefix
 */
function generateApiKey() {
  const raw = crypto.randomBytes(32).toString("base64url");
  return `tb_live_${raw}`;
}

/**
 * GET /api/api-keys
 * List API keys for the user's blog
 */
router.get("/", async (req, res) => {
  try {
    const blogId = req.user.blogId;
    if (!blogId) {
      return res.status(400).json({ error: "No blog associated with this account" });
    }

    const keys = await prisma.apiKey.findMany({
      where: { blogId },
      select: {
        id: true,
        uuid: true,
        name: true,
        key: true,
        permissions: true,
        active: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Mask keys: show only last 8 chars
    const masked = keys.map((k) => ({
      ...k,
      key: `tb_live_...${k.key.slice(-8)}`,
    }));

    return res.json({ data: masked });
  } catch (error) {
    console.error("List API keys error:", error);
    return res.status(500).json({ error: "Failed to list API keys" });
  }
});

/**
 * POST /api/api-keys
 * Create a new API key
 */
router.post("/", async (req, res) => {
  try {
    const blogId = req.user.blogId;
    if (!blogId) {
      return res.status(400).json({ error: "No blog associated with this account" });
    }

    const { name, permissions, expiresAt } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Field 'name' is required (e.g. 'Claude Agent')" });
    }

    const key = generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key,
        blogId,
        permissions: permissions || ["posts:write", "posts:read"],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    // Return full key only on creation (never shown again)
    return res.status(201).json({
      id: apiKey.uuid,
      name: apiKey.name,
      key: apiKey.key, // Full key - shown only once
      permissions: apiKey.permissions,
      expires_at: apiKey.expiresAt,
      created_at: apiKey.createdAt,
      message: "Save this key securely. It won't be shown again.",
    });
  } catch (error) {
    console.error("Create API key error:", error);
    return res.status(500).json({ error: "Failed to create API key" });
  }
});

/**
 * DELETE /api/api-keys/:uuid
 * Revoke an API key
 */
router.delete("/:uuid", async (req, res) => {
  try {
    const blogId = req.user.blogId;
    const apiKey = await prisma.apiKey.findFirst({
      where: { uuid: req.params.uuid, blogId },
    });

    if (!apiKey) {
      return res.status(404).json({ error: "API key not found" });
    }

    await prisma.apiKey.delete({ where: { id: apiKey.id } });

    return res.json({ deleted: true, id: req.params.uuid });
  } catch (error) {
    console.error("Delete API key error:", error);
    return res.status(500).json({ error: "Failed to delete API key" });
  }
});

/**
 * PATCH /api/api-keys/:uuid
 * Toggle active/inactive
 */
router.patch("/:uuid", async (req, res) => {
  try {
    const blogId = req.user.blogId;
    const apiKey = await prisma.apiKey.findFirst({
      where: { uuid: req.params.uuid, blogId },
    });

    if (!apiKey) {
      return res.status(404).json({ error: "API key not found" });
    }

    const { active, name } = req.body;
    const updateData = {};
    if (active !== undefined) updateData.active = active;
    if (name !== undefined) updateData.name = name;

    const updated = await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: updateData,
    });

    return res.json({
      id: updated.uuid,
      name: updated.name,
      active: updated.active,
    });
  } catch (error) {
    console.error("Update API key error:", error);
    return res.status(500).json({ error: "Failed to update API key" });
  }
});

export default router;
