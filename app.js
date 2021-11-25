const express = require('express')
const morgan = require("morgan");
const createError = require('http-errors');
const mongoose = require('mongoose');
const _ = require('lodash');
const multer = require('multer');
const { body, query, param, validationResult, check, oneOf } = require('express-validator');
const config = require('./config/config');
const request = require('request');
const fs = require('fs');
const sharp = require('sharp');
const { nanoid } = require('nanoid');
const File = require('./models/file');
const urlParse = require('url-parse');
const path = require('path');
const agenda = require('./helper/agenda');

agenda.startJob();

// const storage = multer.memoryStorage();
// const upload = multer({
//   storage: storage,
//   fileFilter: function (req, file, cb) {
//     if (file.mimetype !== 'image/png' && file.mimetype !== 'image/jpg' && file.mimetype !== 'image/jpeg') {
//       cb(null, false);
//     }
//     else {
//       cb(null, true);
//     }
//   }
// });

const app = express()
const port = 3000

// mongodb
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoIndex: true,
};
mongoose.connect(
  'mongodb://' +
  config.dbUser +
  ':' +
  config.dbPassword +
  '@' + config.dbUrl + '/' +
  config.db,
  options
);

app.set('trust proxy', 1);
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: false, parameterLimit: 10000 }));
app.use('/public', express.static('public'));


app.get('/', (req, res) => {
  const accept = req.headers.accept;
  let supportWebp = false;
  if (accept && accept.indexOf('image/webp')) {
    supportWebp = true;
  }
  console.log(supportWebp);
  res.send('Hello World!')
})

app.get('/api',
  query('url').notEmpty().isURL().trim(),
  oneOf([
    check('width').notEmpty().isInt({ min: 20, max: 3000 }).toInt(),
    check('height').notEmpty().isInt({ min: 30, max: 6000 }).toInt(),
  ]),
  query('format').default('webp').trim().isIn(['webp', 'jpg', 'png']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const rootPath = path.join(__dirname, 'public');
    let { url, width, height, format } = req.query;
    const urlObject = new urlParse(url);
    let limit = false;
    const whiteLists = config.whiteLists;
    if(whiteLists && whiteLists.length > 0) {
      limit = true;
    }
    if(limit) {
      if(whiteLists.indexOf(urlObject.host)==-1) {
        return res.json({success: 0, message: 'only allow given host！'});
      }
    }
    const resizeObj = {};
    if (height && height > 6000) {
      height = 6000;
    }
    if (width && width > 3000) {
      width = 3000;
    }
    if (height) {
      resizeObj.height = height;
    }
    if (width) {
      resizeObj.width = width;
    }
    const accept = req.headers.accept;
    let supportWebp = false;
    if (accept && accept.indexOf('image/webp') > -1) {
      supportWebp = true;
    }
    if (format == 'webp' && !supportWebp) {
      format = 'jpg';
    }
    const imageUrl = urlObject.protocol + '//' + urlObject.host + urlObject.pathname;
    let key = 'f-' + format;
    if (width) {
      key += 'w-' + width;
    }
    if (height) {
      key += 'h-' + height;
    }
    const file = await File.findOne({ key, url: imageUrl });
    res.set('Cache-control', 'public, max-age=3000');
    if (file) {
      File.updateOne({ _id: file._id }, { $inc: { views: 1 }, lastSeen: Date.now() }, function(err, res) {
        if(err) {
          console.log(err);
        }
      });
      res.header('Content-Type', 'image/' + format);
      res.header('Content-Disposition', 'inline; filename=index.' + format);
      return res.sendFile(rootPath + '/tmp/' + file.nid);
    }
    request
      .get(url)
      .on('error', function (err) {
        res.json({ success: 0, message: err.message });
      })
      .on('response', function (response) {
        // 'image/png'
        const type = response.headers['content-type'];
        if (type != 'image/png' && type != 'image/jpg' && type != 'image/jpeg' && type != 'image/webp') {
          return res.json({ success: 0, message: 'wrong image！' });
        }
        const nid = nanoid();
        const desPath = './public/tmp/' + nid;
        const writeStream = fs.createWriteStream(desPath);
        response.pipe(writeStream);
        writeStream.on('finish', async function () {
          const nid = nanoid();
          const newDesPath = './public/tmp/' + nid;
          var info = await sharp(desPath)
            .resize(resizeObj)
            .toFormat(format)
            .toFile(newDesPath);
          const readStream = fs.createReadStream(newDesPath);
          readStream.pipe(res);
          File.create({ nid, key, url: imageUrl, width: info.width, height: info.height, size: info.size }, function (err) {
            if (err) {
              console.log(err);
            }
          });
          sharp.cache(false);
          fs.unlink(desPath, function (err) {
            if (err) {
              console.log(err);
            }
          });
        });
      })
  });

app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({ success: 0 });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})