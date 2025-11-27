'use strict';

module.exports = [
  {
    method: 'POST',
    path: '/migrate-images',
    handler: 'migration.index',
    config: {
      policies: []
    }
  },
  {
    method: 'POST',
    path: '/change-domain',
    handler: 'changeDomain.index',
    config: {
      policies: []
    }
  },
  {
    method: 'POST',
    path: '/reupload-images',
    handler: 'reupload.index',
    config: {
      policies: []
    }
  }
];
