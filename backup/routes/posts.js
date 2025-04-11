// Ejemplo para Express.js
router.get('/', async (req, res) => {
  const { category } = req.query;
  
  let query = {};
  if (category) {
    query = {
      $or: [
        { 'categories.slug': category },
        { 'categories.id': category }
      ]
    };
  }

  const posts = await Post.find(query).populate('categories');
  res.json(posts);
});