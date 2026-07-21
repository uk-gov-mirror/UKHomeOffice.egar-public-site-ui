const fileType = require('file-type');
const stream = require('stream');

const logger = require('../../../common/utils/logger')(__filename);
const garApi = require('../../../common/services/garApi');
const transformers = require('../../../common/utils/transformers');
const clamAVService = require('../../../common/services/clamAVService');
const uploadFile = require('../../../common/services/fileUploadApi');
const config = require('../../../common/config/index');
const { isValidFileMime } = require('../../../common/utils/validator');
const { isAuthorized, isAuthorizedUserAccess } = require('../../auth');
const UNAUTHORIZED_REDIRECT = config.UNAUTHORIZED_REDIRECT;

const exceedFileNumSizeLimit = (fileSize, garId) => {
  logger.debug(`Entering exceed file number & size limit function, max size ${config.SUPPORTING_DOCS_MAX_SIZE} bytes,
    max number:${config.MAX_NUM_FILES}`);
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
          logger.info(`Number of supporting docs exceeds the limit: ${MAX_NUM}, gar:${garId}`);
          resolve('EXCEEDS_MAX_NUMBER');
        }
        // Get total size from gars.items.size
        parsedGars.items.forEach((gar) => {
          total += transformers.strToBytes(gar.size);
        });
        logger.info(`Total size of supporting documents for gar:${garId}`);
        if (fileSize + total > MAX_SIZE) {
          logger.info(`Total size of supporting documents exceeds max size GAR: ${fileSize + total} bytes`);
          resolve('EXCEEDS_MAX_SIZE');
        }
        resolve('SUCCESS');
      })
      .catch((err) => {
        logger.error('Unknown error whilst determining GAR supporting documents file sizes');
        logger.error(err);
        reject(err);
      });
  });
};

const isDocumentInGar = async (garId, deleteDocId) => {
  const supportingDocsResponse = await garApi.getSupportingDocs(garId);
  const parsedSupportingDocs = JSON.parse(supportingDocsResponse);

  if (!Array.isArray(parsedSupportingDocs.items)) {
    return false;
  }

  return parsedSupportingDocs.items.some((doc) => doc.supportingDocumentId === deleteDocId);
};

const handleDeleteDocument = async (req, res, garId) => {
  if (!req.body.deleteDocId) {
    return false;
  }
  logger.info('Found delete supporting document request');

  try {
    const isAuthorizedToDeleteDocument = await isDocumentInGar(garId, req.body.deleteDocId);

    if (!isAuthorizedToDeleteDocument) {
      logger.info(`Unauthorized to delete supporting document for GAR: ${garId}, document: ${req.body.deleteDocId}`);
      res.redirect(UNAUTHORIZED_REDIRECT);
      return true;
    }

    const apiResponse = await garApi.deleteGarSupportingDoc(garId, req.body.deleteDocId);
    const parsedResponse = JSON.parse(apiResponse);
    if (parsedResponse.message) {
      res.redirect('/garfile/supportingdocuments?query=deletefailed');
      return true;
    }
    res.redirect('/garfile/supportingdocuments');
    return true;
  } catch (deleteSupportingDocErr) {
    logger.error('Failed to delete supporting document');
    logger.error(deleteSupportingDocErr);
    res.redirect('/garfile/supportingdocuments?query=deletefailed');
    return true;
  }
};

module.exports = async (req, res) => {
  logger.info('Entering upload file post controller');

  if (!isAuthorized(req)) {
    logger.info('Unauthorized attempt to manage supporting documents');
    res.redirect(UNAUTHORIZED_REDIRECT);
    return;
  }

  const garId = req.body?.garid;

  try {
    const hasGarUploadAccess = await isAuthorizedUserAccess(req, garId);
    if (!hasGarUploadAccess) {
      logger.info(`Unauthorized attempt to manage supporting documents for GAR: ${garId}`);
      res.redirect(UNAUTHORIZED_REDIRECT);
      return;
    }
  } catch (authorizationErr) {
    logger.error('Failed to authorize supporting document request');
    logger.error(authorizationErr);
    res.redirect(UNAUTHORIZED_REDIRECT);
    return;
  }

  if (await handleDeleteDocument(req, res, garId)) {
    return;
  }

  if (!req.file) {
    logger.debug('No file selected for upload');
    res.redirect('/garfile/supportingdocuments?query=0');
    return;
  }

  logger.debug('About to check file size');
  try {
    const result = await exceedFileNumSizeLimit(req.file.size, garId);
    if (result === 'EXCEEDS_MAX_SIZE') {
      logger.debug('Total file size was greater than the limit');
      res.redirect('/garfile/supportingdocuments?query=limit');
      return;
    }

    if (result === 'EXCEEDS_MAX_NUMBER') {
      logger.debug('Total number of files greater than the limit');
      res.redirect('/garfile/supportingdocuments?query=number');
      return;
    }

    logger.debug(`In Upload File Service. Uploaded File: ${req.file.originalname}`);
    const mimeType = fileType(req.file.buffer);
    logger.info(`Detected uploaded file mimetype as: ${JSON.stringify(mimeType)}`);

    if (!mimeType || !isValidFileMime(req.file.originalname, mimeType.mime)) {
      logger.info('Rejecting file due to disallowed mimetype');
      res.redirect('/garfile/supportingdocuments?query=invalid');
      return;
    }
    logger.info('Valid mimetype, proceeding');

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

    const clamavResp = await clamAVService.scanFile(formData);
    logger.debug('User is authorized to upload supporting documents');
    if (!clamavResp) {
      res.redirect('/garfile/supportingdocuments?query=v');
      return;
    }

    const response = await uploadFile.postFile(garId, req.file);
    const parsedResponse = JSON.parse(response);
    if (Object.prototype.hasOwnProperty.call(parsedResponse, 'message')) {
      logger.debug('Api returned message key');
      logger.debug(JSON.stringify(parsedResponse));
      req.session.errMsg = parsedResponse;
      res.redirect('/garfile/supportingdocuments?query=e');
      return;
    }

    logger.debug('File uploaded');
    res.redirect('/garfile/supportingdocuments');
  } catch (err) {
    logger.error('Error occurred during supporting document upload');
    logger.error(err);

    if (err === 'garApi.getSupportingDocs Example Reject') {
      res.redirect('/garfile/supportingdocuments?query=e');
      return;
    }

    if (typeof err === 'string' && err.includes('scanFile')) {
      res.redirect('/garfile/supportingdocuments?query=e');
      return;
    }

    if (typeof err === 'string' && err.includes('postFile')) {
      res.redirect('/garfile/supportingdocuments');
      return;
    }

    res.redirect('/garfile/supportingdocuments?query=e');
  }
};
