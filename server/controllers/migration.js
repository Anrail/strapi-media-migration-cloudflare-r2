'use strict';

module.exports = ({ strapi }) => ({
  async index(ctx) {
    try {
      const result = await strapi
        .plugin('strapi-migrate-to-cloudflare-r2')
        .service('migration')
        .migrateImages();

      ctx.body = result;
    } catch (error) {
      strapi.log.error(`Помилка міграції: ${error.message}`);
      ctx.status = 500;
      ctx.body = { error: { message: `Помилка міграції: ${error.message}` } };
    }
  },
});

