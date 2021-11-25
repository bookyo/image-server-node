var mongoose = require('mongoose');
var FileSchema  = new mongoose.Schema({
  nid: String,
  key: String,
  url: String,
  width: Number,
  height: Number,
  size: Number,
  views: {type: Number, default: 0},
  lastSeen: Date,
});

FileSchema.pre('save', function(next) {
  if (this.isNew) {
    this.lastSeen  = Date.now();
  }
  else {
    this.lastSeen = Date.now();
  }

  next();
});
FileSchema.index({nid: 1});
FileSchema.index({url: 1, key: 1});
FileSchema.index({lastSeen: -1});

const File = mongoose.model('File', FileSchema);

module.exports = File;