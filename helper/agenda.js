const Agenda = require('agenda');
const config = require('../config/config');
const File = require('../models/file');
const async = require('async');
const fs = require('fs');
const agenda = new Agenda({ db: { address:  'mongodb://' +
  config.dbUser +
  ':' +
  config.dbPassword +
  '@' + config.dbUrl + '/' +
  config.db,}});
agenda.define("auto clear file", async (job) => {
  console.log('auto clear file');
  const now = Date.now();
  const keeptime = config.keeptime * 60 * 1000;
  const time = new Date(now-keeptime);
  const files = await File.find({lastSeen: {$lt: time}});
  async.mapLimit(files, 30, function (file, callback) {
    fs.unlink('./public/tmp/' + file.nid, async function(err) {
      if(err) {
        callback(err);
      }
      await File.deleteOne({_id: file._id});
      callback(null, 'delete' + file._id);
    })
  }, function (err, result) {
    if(err) {
      console.log(err);
    }
  });
});
exports.startJob = async function() {
  await agenda.start();
  await agenda.every(config.keeptime + " minutes", "auto clear file");
}
exports.existJob = async function() {
  const jobs = await agenda.jobs({
    name: "auto clear file" 
  });
  return jobs;
}
exports.stopJob = async function() {
  await agenda.cancel({ name: "auto clear file" });
}