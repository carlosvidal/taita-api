const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const pageSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4()
  },
  title: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
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

// Update timestamps on save
pageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isModified('status') && this.status === 'published') {
    this.publishedAt = this.publishedAt || Date.now();
  }
  next();
});

module.exports = mongoose.model('Page', pageSchema);