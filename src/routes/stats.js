import express from 'express'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const router = express.Router()

router.get('/posts/count', async (req, res) => {
  try {
    const count = await prisma.post.count()
    res.json({ count, status: 'success' })
  } catch (error) {
    console.error('Post count error:', error)
    res.status(500).json({ 
      error: 'Failed to count posts',
      details: error.message 
    })
  }
})

router.get('/pages/count', async (req, res) => {
  try {
    const count = await prisma.page.count()
    res.json({ count, status: 'success' })
  } catch (error) {
    console.error('Page count error:', error)
    res.status(500).json({ 
      error: 'Failed to count pages',
      details: error.message 
    })
  }
})

export default router