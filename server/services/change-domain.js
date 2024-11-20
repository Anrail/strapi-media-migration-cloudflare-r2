'use strict';

const path = require('path');
const fs = require('fs');

module.exports = {
  async changeCDNDomain() {
    const files = await strapi.plugin('upload').service('upload').findMany();
    strapi.log.info(`Знайдено ${files.length} файлів для зміни домену.`);

    const newPublicAccessUrl = process.env.CF_PUBLIC_ACCESS_URL;

    for (const file of files) {
      // Перевіряємо, чи файл вже на R2
      if (
        file.provider !== 'strapi-provider-cloudflare-r2' &&
        file.provider !== 'cloudflare-r2'
      ) {
        continue;
      }

      try {
        // Оновлюємо основний URL файлу
        const oldUrl = file.url;
        const urlObj = new URL(oldUrl);
        const pathname = urlObj.pathname;
        const newUrl = newPublicAccessUrl + pathname;

        // Оновлюємо URL у форматах (якщо є)
        let updatedFormats = null;
        if (file.formats) {
          updatedFormats = {};
          for (const key in file.formats) {
            if (file.formats.hasOwnProperty(key)) {
              const format = file.formats[key];
              const formatUrl = format.url;
              const formatUrlObj = new URL(formatUrl);
              const formatPathname = formatUrlObj.pathname;
              const newFormatUrl = newPublicAccessUrl + formatPathname;
              updatedFormats[key] = {
                ...format,
                url: newFormatUrl,
              };
            }
          }
        }

        // Оновлюємо запис файлу в базі даних
        await strapi.entityService.update('plugin::upload.file', file.id, {
          data: {
            url: newUrl,
            formats: updatedFormats,
          },
        });

        strapi.log.info(`Домен файлу змінено: ${file.name}`);
      } catch (error) {
        strapi.log.error(`Помилка зміни домену файлу ${file.name}: ${error.message}`);
      }
    }
    strapi.log.info('Зміна домену завершена.');

    return { message: 'Усі медіафайли оновлено 🚀' };
  },
};
