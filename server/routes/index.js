'use strict';

module.exports = [
  {
    method: 'POST',
    path: '/migrate-images',
    handler: 'migration.index',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/change-domain',
    handler: 'change-domain.index',
    config: {
      policies: [],
    },
  },
];
