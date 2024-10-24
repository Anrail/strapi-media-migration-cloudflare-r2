'use strict';

const path = require('path');
const fs = require('fs');

module.exports = {
    async migrateImages() {

        const files = await strapi.plugin('upload').service('upload').findMany();
        strapi.log.info(`Знайдено ${files.length} файлів для міграції.`);

        for (const file of files) {
            // Check if the file is already migrated

            if (file.provider === 'strapi-provider-cloudflare-r2' || file.provider === 'cloudflare-r2') {
                continue;
            }

            const filePath = path.join(strapi.dirs.static.public, file.url);

            if (!fs.existsSync(filePath)) {
                strapi.log.warn(`File not found: ${filePath}`);
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
                    // Update the file with the new URL

                    const status = await strapi.entityService.update('plugin::upload.file', file.id, {
                        data: {
                            provider: 'strapi-provider-cloudflare-r2',
                            url: uploadedFiles[0].url,
                            formats: uploadedFiles[0].formats,
                        },
                    });
                    // Delete the local copy of the file in database
                    await strapi.entityService.delete('plugin::upload.file', uploadedFiles[0].id);

                    strapi.log.info(`File migrated: ${file.name}`);
                }
            } catch (error) {
                strapi.log.error(`File migration error ${file.name}: ${error.message}`);
            }
        }
        strapi.log.info('Migration done.');

        return { message: 'All media migrated 🚀' };
    },
};
