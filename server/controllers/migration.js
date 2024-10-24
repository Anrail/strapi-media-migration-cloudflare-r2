'use strict';


module.exports = ({ strapi }) => ({
  index(ctx) {
    ctx.body = strapi
      .plugin('image-migration')
      .service('migration')
      .migrateImages();
  },
});
