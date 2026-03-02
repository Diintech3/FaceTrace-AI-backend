const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  platforms: [{
    platform: String,
    username: String,
    profileUrl: String,
    data: mongoose.Schema.Types.Mixed
  }],
  searchedAt: {
    type: Date,
    default: Date.now
  },
  imageUrl: String
});

module.exports = mongoose.model('Profile', profileSchema);
