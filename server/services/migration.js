'use strict';

const path = require('path');
const fs = require('fs');

module.exports = {
    async migrateImages() {

        const files = await strapi.plugin('upload').service('upload').findMany();
        strapi.log.info(`Знайдено ${files.length} файлів для міграції.`);

        for (const file of files) {
            // Перевіряємо, чи файл вже мігрував

            if (file.provider === 'strapi-provider-cloudflare-r2' || file.provider === 'cloudflare-r2') {
                continue;
            }

            const filePath = path.join(strapi.dirs.static.public, file.url);

            if (!fs.existsSync(filePath)) {
                strapi.log.warn(`Файл не знайдено: ${filePath}`);
                continue;
            }

            try {
                // Завантажуємо файл на R2
                const uploadedFiles = await strapi.plugin('upload').service('upload').upload({
                    data: {},
                    files: {
                        path: filePath,
                        name: file.name,
                        type: file.mime,
                        size: file.size,
                        folderPath: file.folderPath,
                    },
                });

                if (uploadedFiles && uploadedFiles.length > 0) {
                    // Оновлюємо запис файлу

                    const status = await strapi.entityService.update('plugin::upload.file', file.id, {
                        data: {
                            provider: 'strapi-provider-cloudflare-r2',
                            url: uploadedFiles[0].url,
                            formats: uploadedFiles[0].formats,
                        },
                    });
                    await strapi.entityService.delete('plugin::upload.file', uploadedFiles[0].id);

                    strapi.log.info(`Файл мігровано: ${file.name}`);
                }
            } catch (error) {
                strapi.log.error(`Помилка міграції файлу ${file.name}: ${error.message}`);
            }
        }
        strapi.log.info('Міграція зображень завершена.');

        return { message: 'Міграція завершена 🚀' };
    },
};
