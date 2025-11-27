'use strict';

module.exports = ({ strapi }) => ({
  async index(ctx) {
    try {
      const result = await strapi
        .plugin('strapi-migrate-to-cloudflare-r2')
        .service('reupload')
        .reuploadImages();

      ctx.body = result;
    } catch (error) {
      strapi.log.error(`Reupload error: ${error.message}`);
      ctx.status = 500;
      ctx.body = { error: { message: `Reupload error: ${error.message}` } };
    }
  },
});

