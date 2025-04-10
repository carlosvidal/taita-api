// Update your Post model
const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  excerpt: String,
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: Date
});

postSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isModified('status') && this.status === 'published') {
    this.publishedAt = this.publishedAt || Date.now();
  }
  next();
});