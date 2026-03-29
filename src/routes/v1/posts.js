import express from "express";
import { PrismaClient } from "@prisma/client";
import authenticateApiKey from "../../middleware/authenticateApiKey.js";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * Helper: require req.blog to be set. Returns 400 if missing.
 */
function requireBlog(req, res) {
  if (req.blog) return true;
  res.status(400).json({
    error: "Blog not specified",
    message: "This API key has access to multiple blogs. Specify which blog with the X-Blog header (subdomain).",
    available: req.blogs?.map((b) => b.subdomain) || [],
  });
  return false;
}

/**
 * GET /api/v1/blogs
 * List blogs accessible by this API key
 */
router.get("/blogs", authenticateApiKey("posts:read"), async (req, res) => {
  const blogs = req.blogs || (req.blog ? [req.blog] : []);
  return res.json({
    data: blogs.map((b) => ({
      id: b.uuid,
      name: b.name,
      subdomain: b.subdomain,
      domain: b.domain,
      description: b.description,
      url: b.domain ? `https://${b.domain}` : `https://${b.subdomain}.taita.blog`,
    })),
  });
});

/**
 * Helper: generate slug from title
 */
function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Helper: resolve or create tags by name
 */
async function resolveTags(tagNames, blogId) {
  const tags = [];
  for (const name of tagNames) {
    const slug = slugify(name);
    const tag = await prisma.tag.upsert({
      where: { tag_slug_blog_id_unique: { slug, blogId } },
      update: {},
      create: { name, slug, blogId },
    });
    tags.push(tag);
  }
  return tags;
}

/**
 * POST /api/v1/posts
 * Create a new post
 */
router.post("/", authenticateApiKey("posts:write"), async (req, res) => {
  try {
    if (!requireBlog(req, res)) return;
    const { title, content, excerpt, slug, category, tags, status, image } = req.body;
    const blogId = req.blog.id;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        error: "Validation failed",
        message: "Fields 'title' and 'content' are required",
        required: ["title", "content"],
        optional: ["excerpt", "slug", "category", "tags", "status", "image"],
      });
    }

    // Resolve slug
    const postSlug = slug || slugify(title);

    // Check slug uniqueness
    const existing = await prisma.post.findUnique({ where: { slug: postSlug } });
    if (existing) {
      return res.status(409).json({
        error: "Slug conflict",
        message: `A post with slug '${postSlug}' already exists`,
        suggestion: `${postSlug}-${Date.now()}`,
      });
    }

    // Resolve category by slug or name
    let categoryId = null;
    if (category) {
      const cat = await prisma.category.findFirst({
        where: {
          blogId,
          OR: [{ slug: category }, { name: category }],
        },
      });
      if (cat) categoryId = cat.id;
    }

    // Resolve author (blog owner)
    const blog = await prisma.blog.findUnique({
      where: { id: blogId },
      include: { admin: true },
    });
    const authorId = blog.adminId || 1;

    // Determine publish status
    const publishStatus = status === "published" ? "PUBLISHED" : "DRAFT";

    // Create post
    const post = await prisma.post.create({
      data: {
        title,
        content,
        excerpt: excerpt || null,
        slug: postSlug,
        status: publishStatus,
        publishedAt: publishStatus === "PUBLISHED" ? new Date() : null,
        blogId,
        authorId,
        categoryId,
        image: image || null,
      },
      include: {
        category: true,
        author: { select: { id: true, name: true, email: true } },
      },
    });

    // Resolve and connect tags
    let postTags = [];
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const resolvedTags = await resolveTags(tags, blogId);
      for (const tag of resolvedTags) {
        await prisma.postTag.create({
          data: { postId: post.id, tagId: tag.id },
        });
      }
      postTags = resolvedTags;
    }

    return res.status(201).json({
      id: post.uuid,
      title: post.title,
      slug: post.slug,
      status: post.status.toLowerCase(),
      published_at: post.publishedAt,
      url: `https://${req.blog.subdomain}.taita.blog/blog/${post.slug}`,
      category: post.category ? { name: post.category.name, slug: post.category.slug } : null,
      tags: postTags.map((t) => ({ name: t.name, slug: t.slug })),
      created_at: post.createdAt,
    });
  } catch (error) {
    console.error("v1 create post error:", error);
    return res.status(500).json({
      error: "Internal error",
      message: "Failed to create post",
    });
  }
});

/**
 * GET /api/v1/posts
 * List posts for the blog
 */
router.get("/", authenticateApiKey("posts:read"), async (req, res) => {
  try {
    if (!requireBlog(req, res)) return;
    const blogId = req.blog.id;
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { blogId };
    if (status) {
      where.status = status.toUpperCase();
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          category: true,
          postTags: { include: { tag: true } },
          author: { select: { id: true, name: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    return res.json({
      data: posts.map((p) => ({
        id: p.uuid,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        status: p.status.toLowerCase(),
        published_at: p.publishedAt,
        url: `https://${req.blog.subdomain}.taita.blog/blog/${p.slug}`,
        category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
        tags: p.postTags.map((pt) => ({ name: pt.tag.name, slug: pt.tag.slug })),
        author: p.author,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("v1 list posts error:", error);
    return res.status(500).json({ error: "Internal error", message: "Failed to list posts" });
  }
});

/**
 * GET /api/v1/posts/:slug
 * Get a single post by slug
 */
router.get("/:slug", authenticateApiKey("posts:read"), async (req, res) => {
  try {
    if (!requireBlog(req, res)) return;
    const post = await prisma.post.findFirst({
      where: { slug: req.params.slug, blogId: req.blog.id },
      include: {
        category: true,
        postTags: { include: { tag: true } },
        author: { select: { id: true, name: true } },
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Not found", message: "Post not found" });
    }

    return res.json({
      id: post.uuid,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      status: post.status.toLowerCase(),
      published_at: post.publishedAt,
      url: `https://${req.blog.subdomain}.taita.blog/blog/${post.slug}`,
      category: post.category ? { name: post.category.name, slug: post.category.slug } : null,
      tags: post.postTags.map((pt) => ({ name: pt.tag.name, slug: pt.tag.slug })),
      author: post.author,
      image: post.image,
      created_at: post.createdAt,
      updated_at: post.updatedAt,
    });
  } catch (error) {
    console.error("v1 get post error:", error);
    return res.status(500).json({ error: "Internal error", message: "Failed to get post" });
  }
});

/**
 * PATCH /api/v1/posts/:slug
 * Update a post
 */
router.patch("/:slug", authenticateApiKey("posts:write"), async (req, res) => {
  try {
    if (!requireBlog(req, res)) return;
    const post = await prisma.post.findFirst({
      where: { slug: req.params.slug, blogId: req.blog.id },
    });

    if (!post) {
      return res.status(404).json({ error: "Not found", message: "Post not found" });
    }

    const { title, content, excerpt, status, category, tags, image } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (image !== undefined) updateData.image = image;

    if (status !== undefined) {
      updateData.status = status === "published" ? "PUBLISHED" : "DRAFT";
      if (updateData.status === "PUBLISHED" && !post.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    // Resolve category
    if (category !== undefined) {
      if (category === null) {
        updateData.categoryId = null;
      } else {
        const cat = await prisma.category.findFirst({
          where: {
            blogId: req.blog.id,
            OR: [{ slug: category }, { name: category }],
          },
        });
        if (cat) updateData.categoryId = cat.id;
      }
    }

    const updated = await prisma.post.update({
      where: { id: post.id },
      data: updateData,
      include: {
        category: true,
        author: { select: { id: true, name: true } },
      },
    });

    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      // Remove existing tags
      await prisma.postTag.deleteMany({ where: { postId: post.id } });
      // Add new tags
      const resolvedTags = await resolveTags(tags, req.blog.id);
      for (const tag of resolvedTags) {
        await prisma.postTag.create({
          data: { postId: post.id, tagId: tag.id },
        });
      }
    }

    return res.json({
      id: updated.uuid,
      title: updated.title,
      slug: updated.slug,
      status: updated.status.toLowerCase(),
      published_at: updated.publishedAt,
      url: `https://${req.blog.subdomain}.taita.blog/blog/${updated.slug}`,
      updated_at: updated.updatedAt,
    });
  } catch (error) {
    console.error("v1 update post error:", error);
    return res.status(500).json({ error: "Internal error", message: "Failed to update post" });
  }
});

/**
 * DELETE /api/v1/posts/:slug
 * Delete a post
 */
router.delete("/:slug", authenticateApiKey("posts:write"), async (req, res) => {
  try {
    if (!requireBlog(req, res)) return;
    const post = await prisma.post.findFirst({
      where: { slug: req.params.slug, blogId: req.blog.id },
    });

    if (!post) {
      return res.status(404).json({ error: "Not found", message: "Post not found" });
    }

    // Delete related tags first
    await prisma.postTag.deleteMany({ where: { postId: post.id } });
    await prisma.post.delete({ where: { id: post.id } });

    return res.json({ deleted: true, slug: req.params.slug });
  } catch (error) {
    console.error("v1 delete post error:", error);
    return res.status(500).json({ error: "Internal error", message: "Failed to delete post" });
  }
});

/**
 * GET /api/v1/categories
 * List categories for the blog
 */
router.get("/categories", authenticateApiKey("posts:read"), async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { blogId: req.blog.id },
      select: { name: true, slug: true, _count: { select: { posts: true } } },
    });

    return res.json({
      data: categories.map((c) => ({
        name: c.name,
        slug: c.slug,
        posts_count: c._count.posts,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal error" });
  }
});

/**
 * GET /api/v1/tags
 * List tags for the blog
 */
router.get("/tags", authenticateApiKey("posts:read"), async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({
      where: { blogId: req.blog.id },
      select: { name: true, slug: true, _count: { select: { postTags: true } } },
    });

    return res.json({
      data: tags.map((t) => ({
        name: t.name,
        slug: t.slug,
        posts_count: t._count.postTags,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
