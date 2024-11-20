'use strict';

module.exports = ({ strapi }) => ({
  async index(ctx) {
    try {
      const result = await strapi
        .plugin('strapi-migrate-to-cloudflare-r2')
        .service('change-domain')
        .changeCDNDomain();

      ctx.body = result;
    } catch (error) {
      strapi.log.error(`Domain change error: ${error.message}`);
      ctx.status = 500;
      ctx.body = { error: { message: `Domain change error: ${error.message}` } };
    }
  },
});

