import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

// Get all menu items for a specific blog
router.get("/", async (req, res) => {
  try {
    const { blogId } = req.query;
    
    if (!blogId) {
      return res.status(400).json({ error: "blogId query parameter is required" });
    }
    
    // Verificar que el blog exista
    const blog = await prisma.blog.findUnique({
      where: { id: parseInt(blogId) }
    });
    
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    
    // Obtener todos los ítems de menú para este blog
    const menuItems = await prisma.menuItem.findMany({
      where: { blogId: parseInt(blogId) },
      orderBy: { order: "asc" },
    });
    
    res.json(menuItems);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
});

// Create menu item
router.post("/", async (req, res) => {
  try {
    console.log("Received request:", req.body);
    const { label, url, order, parentId, blogId } = req.body;
    
    if (!blogId) {
      return res.status(400).json({ error: "blogId is required" });
    }
    
    // Verificar que el blog exista
    const blog = await prisma.blog.findUnique({
      where: { id: parseInt(blogId) }
    });
    
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    
    const menuItem = await prisma.menuItem.create({
      data: {
        label,
        url,
        order: parseInt(order),
        parentId: parentId ? parseInt(parentId) : null,
        blogId: parseInt(blogId),
      },
    });
    
    console.log("Created menu item:", menuItem);
    res.status(201).json(menuItem);
  } catch (error) {
    console.error("Menu creation error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Update menu item
router.put("/:id", async (req, res) => {
  try {
    const { label, url, order, parentId } = req.body;
    const menuItem = await prisma.menuItem.update({
      where: { id: parseInt(req.params.id) },
      data: {
        label,
        url,
        order: parseInt(order),
        parentId: parentId ? parseInt(parentId) : null,
      },
    });
    res.json(menuItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Reorder menu items
router.patch("/reorder", async (req, res) => {
  try {
    const { items } = req.body;
    await prisma.$transaction(
      items.map((item) =>
        prisma.menuItem.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );
    res.json({ message: "Menu reordered successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete menu item
router.delete("/:id", async (req, res) => {
  try {
    await prisma.menuItem.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Menu item deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get single menu item
router.get("/:id", async (req, res) => {
  try {
    const { blogId } = req.query;
    
    if (!blogId) {
      return res.status(400).json({ error: "blogId query parameter is required" });
    }
    
    const menuItem = await prisma.menuItem.findUnique({
      where: { 
        id: parseInt(req.params.id),
        blogId: parseInt(blogId)
      },
    });
    
    if (!menuItem) {
      return res.status(404).json({ error: "Menu item not found" });
    }
    
    res.json(menuItem);
  } catch (error) {
    console.error("Error fetching menu item:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
});

export default router;
