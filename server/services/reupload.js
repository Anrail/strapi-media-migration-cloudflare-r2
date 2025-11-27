'use strict';

const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const AWS = require('aws-sdk');

module.exports = {
    async reuploadImages() {
        const files = await strapi.plugin('upload').service('upload').findMany();
        strapi.log.info(`Знайдено ${files.length} файлів для перезавантаження.`);

        // Filter only images
        const imageFiles = files.filter(file => {
            const isImage = file.mime && file.mime.startsWith('image/');
            return isImage;
        });

        const tempDir = path.join(strapi.dirs.static.public, 'temp_reupload');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        for (const file of imageFiles) {
            let tempFilePath = null;

            if (file.provider_metadata && file.provider_metadata === 'reuploaded') {
              continue;
            }

            try {
                tempFilePath = path.join(tempDir, `${file.id}_${file.name}`);

                const isR2 = file.provider === 'strapi-provider-cloudflare-r2' || file.provider === 'cloudflare-r2';
                
                strapi.log.info(`Start ${file.name}`);

                if (isR2) {
                    // Download file from R2
                    await this.downloadFile(file.url, tempFilePath);

                    strapi.log.info(`Downloaded from R2 ${file.name}`);
                } else {
                    const localFilePath = path.join(strapi.dirs.static.public, file.url);
                    if (!fs.existsSync(localFilePath)) {
                        strapi.log.warn(`Local file not found: ${localFilePath}`);
                        continue;
                    }

                    fs.copyFileSync(localFilePath, tempFilePath);
                }

                if (!fs.existsSync(tempFilePath)) {
                    strapi.log.warn(`File not available: ${file.name}`);
                    continue;
                }

                // Save old URLs for deletion
                const oldUrls = [];
                if (isR2 && file.url) {
                    oldUrls.push(file.url);
                }

                // Add all formats URLs for deletion
                if (file.formats) {
                    Object.keys(file.formats).forEach(formatKey => {
                        if (file.formats[formatKey] && file.formats[formatKey].url) {
                            oldUrls.push(file.formats[formatKey].url);
                        }
                    });
                }

                strapi.log.info(`Reuploading to R2 ${file.name}`);
                // Reupload file to R2
                const uploadedFiles = await strapi.plugin('upload').service('upload').upload({
                    data: {},
                    files: {
                        path: tempFilePath,
                        name: file.name,
                        type: file.mime,
                        size: file.size,
                        folderPath: file.folderPath,
                    },
                });

                if (uploadedFiles && uploadedFiles.length > 0) {
                    // Видаляємо старі файли з R2 (основний файл та всі формати) через AWS SDK
                    if (oldUrls.length > 0 && isR2) {
                        try {
                            // Отримуємо конфігурацію провайдера через config.get або змінні оточення
                            let providerOptions = null;
                            
                            // Спробуємо отримати через strapi.config
                            try {
                                const uploadConfig = strapi.config.get('plugin.upload');
                                if (uploadConfig && uploadConfig.config && uploadConfig.config.providerOptions) {
                                    providerOptions = uploadConfig.config.providerOptions;
                                }
                            } catch (e) {
                                strapi.log.warn(`Could not get config via strapi.config: ${e.message}`);
                            }
                            
                            if (!providerOptions || !providerOptions.endpoint || !providerOptions.params) {
                                const accessKeyId = process.env.CF_ACCESS_KEY_ID;
                                const secretAccessKey = process.env.CF_ACCESS_SECRET;
                                const endpoint = process.env.CF_ENDPOINT;
                                const bucket = process.env.CF_BUCKET;
                                
                                if (accessKeyId && secretAccessKey && endpoint && bucket) {
                                    providerOptions = {
                                        accessKeyId,
                                        secretAccessKey,
                                        endpoint,
                                        params: {
                                            Bucket: bucket,
                                        },
                                    };
                                }
                            }
                            
                            if (providerOptions && providerOptions.endpoint && providerOptions.params && providerOptions.params.Bucket) {
                                // Створюємо S3 клієнт для R2 (використовуємо aws-sdk v2, як у провайдері)
                                const S3 = new AWS.S3({
                                    apiVersion: "2006-03-01",
                                    accessKeyId: providerOptions.accessKeyId,
                                    secretAccessKey: providerOptions.secretAccessKey,
                                    endpoint: providerOptions.endpoint,
                                    s3ForcePathStyle: true,
                                    signatureVersion: 'v4',
                                });

                                // Видаляємо кожен старий файл
                                for (const oldUrl of oldUrls) {
                                    try {
                                        // Витягуємо ключ файлу з URL
                                        const urlObj = new URL(oldUrl);
                                        let key = urlObj.pathname;
                                        
                                        // Якщо використовується cloudflarePublicAccessUrl, потрібно отримати правильний шлях
                                        // Прибираємо початковий слеш, якщо є
                                        if (key.startsWith('/')) {
                                            key = key.substring(1);
                                        }

                                        // Видаляємо файл з R2
                                        await S3.deleteObject({
                                            Bucket: providerOptions.params.Bucket,
                                            Key: key,
                                        }).promise();
                                        
                                        strapi.log.info(`Deleted old file from R2: ${key}`);
                                    } catch (deleteError) {
                                        // Якщо файл вже видалений або не знайдений - це нормально
                                        strapi.log.warn(`Could not delete old file from R2: ${oldUrl} - ${deleteError.message}`);
                                    }
                                }
                            } else {
                                strapi.log.warn('Provider configuration not available for deleting old files. Check CF_ACCESS_KEY_ID, CF_ACCESS_SECRET, CF_ENDPOINT, CF_BUCKET env variables.');
                            }
                        } catch (providerError) {
                            strapi.log.error(`Could not delete old files from R2: ${providerError.message}`);
                            strapi.log.error(providerError.stack);
                        }
                    }

                    // Update file with new formats
                    await strapi.entityService.update('plugin::upload.file', file.id, {
                        data: {
                            provider: 'strapi-provider-cloudflare-r2',
                            url: uploadedFiles[0].url,
                            formats: uploadedFiles[0].formats,
                            provider_metadata: 'reuploaded',
                        },
                    });

                    // Delete temporary file from database (if it was created)
                    if (uploadedFiles[0].id !== file.id) {
                        await strapi.entityService.delete('plugin::upload.file', uploadedFiles[0].id);
                    }

                    strapi.log.info(`File reuploaded: ${file.name}`);
                }

                // Delete temporary file
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }

                strapi.log.info(`End ${file.name} and left ${imageFiles.length} files`);
            } catch (error) {
                strapi.log.error(`File reupload error ${file.name}: ${error.message}`);
                
                // Delete temporary file in case of error
                if (tempFilePath && fs.existsSync(tempFilePath)) {
                    try {
                        fs.unlinkSync(tempFilePath);
                    } catch (unlinkError) {
                        strapi.log.warn(`Failed to delete temp file: ${tempFilePath}`);
                    }
                }

                throw new Error(`File reupload error ${file.name}: ${error.message}`);
            }
        }


        // Remove temporary directory if it is empty
        try {
            const filesInTemp = fs.readdirSync(tempDir);
            if (filesInTemp.length === 0) {
                fs.rmdirSync(tempDir);
            }

            for(const file2 of imageFiles) {
              if (file2.provider_metadata && file2.provider_metadata === 'reuploaded') {
                try {
                  await strapi.entityService.update('plugin::upload.file', file2.id, {
                    data: {
                      provider_metadata: null,
                    },
                  });
                } catch (error) {
                  strapi.log.error(`Error with removimg meta_data ${file2.name}: ${error.message}`);
                }
              }
            }
        } catch (error) {
            strapi.log.warn(`Failed to remove temp directory: ${error.message}`);
        }

        strapi.log.info('Reupload done.');

        return { message: 'All images reuploaded 🚀' };
    },

    async downloadFile(url, filePath) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const protocol = urlObj.protocol === 'https:' ? https : http;

            const file = fs.createWriteStream(filePath);

            file.on('error', (err) => {
                file.close();
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                reject(err);
            });

            protocol.get(url, (response) => {
                if (response.statusCode !== 200) {
                    file.close();
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                    reject(new Error(`Failed to download file: ${response.statusCode}`));
                    return;
                }

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (err) => {
                file.close();
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
                reject(err);
            });
        });
    },
};

