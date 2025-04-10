// Update your controller
exports.createPost = async (req, res) => {
  try {
    const post = new Post({
      ...req.body,
      status: req.body.status || 'draft'
    });
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Add to your getPosts
exports.getPosts = async (req, res) => {
  const query = { status: 'published' }; // Only show published by default
  if (req.query.includeDrafts === 'true') {
    delete query.status;
  }
  // ... rest of your existing code
};

// En el método de actualización
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body,
        updatedAt: Date.now(),
        publishedAt: req.body.status === 'published' ? new Date() : undefined
      },
      { new: true }
    );
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};