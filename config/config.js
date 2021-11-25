module.exports = {
  dbUrl: "127.0.0.1",
  db: "imageserver",
  dbUser: "imageserver",
  dbPassword: "imageserver",
  jwtSecret: 'imageserversecret',
  jwtExpires: '30 days',
  whiteLists: [
    'image.querydata.org'
  ],
  keeptime: 3 //单位分钟 Minutes
};