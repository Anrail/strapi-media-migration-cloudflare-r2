'use strict';


const migration = require('./migration');
const changeDomain = require('./changeDomain');
const reupload = require('./reupload')

module.exports = {
  migration,
  changeDomain,
  reupload
};
