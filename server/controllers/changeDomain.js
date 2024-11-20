module.exports = ({ strapi }) => ({
  async index(ctx) {
    try {
      const service = strapi.plugin('strapi-migrate-to-cloudflare-r2').service('changeDomain');

      if (!service) {
        throw new Error('Service changeDomain is undefined');
      }

      if (!service.changeCDNDomain) {
        throw new Error('Method changeCDNDomain is undefined on service changeDomain');
      }

      const result = await service.changeCDNDomain();

      ctx.body = result;
    } catch (error) {
      strapi.log.error(`Domain change error: ${error.message}`);
      ctx.status = 500;
      ctx.body = { error: { message: `Domain change error: ${error.message}` } };
    }
  },
});
