const fileType = require('file-type');
const stream = require('stream');

const logger = require('../../../common/utils/logger')(__filename);
const garApi = require('../../../common/services/garApi');
const transformers = require('../../../common/utils/transformers');
const clamAVService = require('../../../common/services/clamAVService');
const uploadFile = require('../../../common/services/fileUploadApi');
const config = require('../../../common/config/index');
const { isValidFileMime } = require('../../../common/utils/validator');

const exceedFileNumSizeLimit = (fileSize, garId) => {
  logger.debug('Checking supporting document limits', {
    garId,
    maxSizeBytes: config.SUPPORTING_DOCS_MAX_SIZE,
    maxNumFiles: config.MAX_NUM_FILES,
    uploadSizeBytes: fileSize,
  });
  return new Promise((resolve, reject) => {
    // Get supporting docs and add file size
    //check max number of files not more than 10.
    // Check if fileSize + total >= MAX_SIZE
    const MAX_SIZE = config.SUPPORTING_DOCS_MAX_SIZE;
    const MAX_NUM = config.MAX_NUM_FILES;
    garApi
      .getSupportingDocs(garId)
      .then((gars) => {
        let total = 0;
        const parsedGars = JSON.parse(gars);
        if (parsedGars.items.length >= MAX_NUM) {
          logger.info('Number of supporting docs exceeds maximum allowed', {
            garId,
            maxNumFiles: MAX_NUM,
            existingNumFiles: parsedGars.items.length,
          });
          resolve('EXCEEDS_MAX_NUMBER');
        }
        // Get total size from gars.items.size
        parsedGars.items.forEach((gar) => {
          total += transformers.strToBytes(gar.size);
        });
        logger.info('Computed total supporting document size', {
          garId,
          existingTotalBytes: total,
          uploadSizeBytes: fileSize,
        });
        if (fileSize + total > MAX_SIZE) {
          logger.info('Total supporting document size exceeds maximum allowed', {
            garId,
            maxSizeBytes: MAX_SIZE,
            attemptedTotalBytes: fileSize + total,
          });
          resolve('EXCEEDS_MAX_SIZE');
        }
        resolve('SUCCESS');
      })
      .catch((err) => {
        logger.error('Failed to determine supporting document file sizes', {
          garId,
          errorMessage: err?.message,
          stack: err?.stack,
        });
        reject(err);
      });
  });
};

const handleDeleteDocument = (req, res) => {
  if (!req.body.deleteDocId) {
    return false;
  }
  logger.info('Handling supporting document delete request', {
    garId: req.body.garid,
    deleteDocId: req.body.deleteDocId,
  });
  garApi
    .deleteGarSupportingDoc(req.body.garid, req.body.deleteDocId)
    .then((apiResponse) => {
      const parsedResponse = JSON.parse(apiResponse);
      if (parsedResponse.message) {
        res.redirect('/garfile/supportingdocuments?query=deletefailed');
        return;
      }
      // Redirect to supporting docs
      res.redirect('/garfile/supportingdocuments');
    })
    .catch((deleteSupportingDocErr) => {
      logger.error('Failed to delete supporting document', {
        garId: req.body.garid,
        deleteDocId: req.body.deleteDocId,
        errorMessage: deleteSupportingDocErr?.message,
        stack: deleteSupportingDocErr?.stack,
      });
      res.redirect('/garfile/supportingdocuments?query=deletefailed');
    });
  return true;
};

module.exports = (req, res) => {
  if (handleDeleteDocument(req, res)) {
    return;
  }

  if (!req.file) {
    logger.debug('No file selected for upload', {
    });
    res.redirect('/garfile/supportingdocuments?query=0');
    return;
  }

  logger.debug('About to check file size', {
    garId: req.body.garid,
    uploadSizeBytes: req.file.size,
  });
  exceedFileNumSizeLimit(req.file.size, req.body.garid)
    .then((result) => {
      if (result === 'EXCEEDS_MAX_SIZE') {
        logger.debug('Total file size was greater than the limit');
        res.redirect('/garfile/supportingdocuments?query=limit');
        return;
      } else if (result === 'EXCEEDS_MAX_NUMBER') {
        logger.debug('Total number of files greater than the limit');
        res.redirect('/garfile/supportingdocuments?query=number');
        return;
      }
      logger.debug('Uploading supporting document', {
        garId: req.body.garid,
        fileName: req.file.originalname,
        fileSizeBytes: req.file.size,
      });
      const mimeType = fileType(req.file.buffer);

      if (!mimeType || !isValidFileMime(req.file.originalname, mimeType.mime)) {
        logger.info('Rejecting file due to disallowed mimetype', {
          garId: req.body.garid,
          fileName: req.file.originalname,
          detectedMimeType: mimeType?.mime || null,
        });
        res.redirect('/garfile/supportingdocuments?query=invalid');
        return;
      }
      logger.info('Valid mimetype, proceeding', {
        garId: req.body.garid,
        fileName: req.file.originalname,
        detectedMimeType: mimeType.mime,
      });

      logger.debug('About to create a Stream of the file buffer');
      const readStream = new stream.Readable();
      readStream.push(req.file.buffer);
      readStream.push(null);
      logger.debug('Stream created, about to send to AV scan endpoint');

      const uriString = `${process.env.CLAMAV_BASE}:${process.env.CLAMAV_PORT}/scan`;
      logger.debug(`uri: ${uriString}`);

      const formData = {
        name: req.file.originalname,
        file: {
          value: req.file.buffer, // Upload the file in the multi-part post
          options: {
            filename: req.file.originalname,
          },
        },
      };

      clamAVService
        .scanFile(formData)
        .then((clamavResp) => {
          if (clamavResp) {
            uploadFile
              .postFile(req.body.garid, req.file)
              .then((response) => {
                const parsedResponse = JSON.parse(response);
                if (Object.prototype.hasOwnProperty.call(parsedResponse, 'message')) {
                  // API returned error
                  logger.debug('Upload API returned message payload', {
                    garId: req.body.garid,
                    apiMessage: parsedResponse.message,
                  });
                  req.session.errMsg = parsedResponse;
                  res.redirect('/garfile/supportingdocuments?query=e');
                  return;
                }
                logger.info('Supporting document uploaded', {
                  garId: req.body.garid,
                  fileName: req.file.originalname,
                });
                res.redirect('/garfile/supportingdocuments');
              })
              .catch((err) => {
                logger.error('Failed to upload supporting document', {
                  garId: req.body.garid,
                  fileName: req.file.originalname,
                  errorMessage: err?.message,
                  stack: err?.stack,
                });
                res.redirect('/garfile/supportingdocuments');
              });
          } else {
            res.redirect('/garfile/supportingdocuments?query=v');
          }
        })
        .catch((err) => {
          logger.error('Failed to scan supporting document', {
            garId: req.body.garid,
            fileName: req.file.originalname,
            errorMessage: err?.message,
            stack: err?.stack,
          });
          res.redirect('/garfile/supportingdocuments?query=e');
        });
    })
    .catch((err) => {
      logger.error('Error occurred during scan/upload flow', {
        garId: req.body.garid,
        errorMessage: err?.message,
      });
      res.redirect('/garfile/supportingdocuments?query=e');
    });
};
