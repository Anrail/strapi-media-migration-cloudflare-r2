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
];
