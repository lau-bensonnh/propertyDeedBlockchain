/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * This sample is intended to work with the basic asset transfer
 * chaincode which imposes some constraints on what is possible here.
 *
 * For example,
 *  - There is no validation for Asset IDs
 *  - There are no error codes from the chaincode
 *
 * To avoid timeouts, long running tasks should be decoupled from HTTP request
 * processing
 *
 * Submit transactions can potentially be very long running, especially if the
 * transaction fails and needs to be retried one or more times
 *
 * To allow requests to respond quickly enough, this sample queues submit
 * requests for processing asynchronously and immediately returns 202 Accepted
 */
// eslint-disable  @typescript-eslint/no-explicit-any
// eslint-disable  @typescript-eslint/no-unused-vars
import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Contract } from 'fabric-network';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { Queue } from 'bullmq';
import { AssetNotFoundError } from './errors';
import { evatuateTransaction } from './fabric';
import { addSubmitTransactionJob } from './jobs';
import { logger } from './logger';
import { Asset } from './asset';
import _ from 'lodash';
import Joi from 'joi';
import { info } from 'console';
const { ACCEPTED, BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } = StatusCodes;
const ownerSchema = Joi.array()
  .items(Joi.alternatives().try(Joi.string(), Joi.object({ nameOfOwner: Joi.string(), capacity: Joi.string() })))
  .required();

const infoSchema = {
  transaction: Joi.object({
    memorialNumber: Joi.string().required(),
    dateOfInstrument: Joi.string().required(),
    dateOfRegistration: Joi.string().required(),
    consideration: Joi.string().required(),
    remarks: Joi.string().required(),
    submittedAt: Joi.date().optional(),
    submittedBy: Joi.string().optional(),
    approvedAt: Joi.date().optional(),
    approvedBy: Joi.string().optional(),
    rejectedAt: Joi.date().optional(),
    rejectedBy: Joi.string().optional(),
  }),
  incumbrance: Joi.object({
    memorialNumber: Joi.string().required(),
    dateOfInstrument: Joi.string().required(),
    dateOfRegistration: Joi.string().required(),
    natureOfIncumbrances: Joi.string().required(),
    inFavourOf: ownerSchema,
    consideration: Joi.string().required(),
    remarks: Joi.string().required(),

    submittedAt: Joi.date().optional(),
    submittedBy: Joi.string().optional(),
    approvedAt: Joi.date().optional(),
    approvedBy: Joi.string().optional(),
    rejectedAt: Joi.date().optional(),
    rejectedBy: Joi.string().optional(),
  }),
  heldInfo: Joi.object({
    locationNumber: Joi.string().required(),
    heldUnder: Joi.string().required(),
    leaseTerm: Joi.string().required(),
    commencementOfLeaseTerm: Joi.string().required(),
    rentPerAnnum: Joi.string().required(),
  }),
};

const schema = {
  createAsset: Joi.object({
    ID: Joi.string().required(),
    propertyStatus: Joi.string().valid('Develop', 'InMarket', 'Recycled').required(),
    propertyReferenceNumber: Joi.string().required(),
    propertyHeldInfos: Joi.array().items(infoSchema.heldInfo).required(),
    propertyAddress: Joi.string().required(),
    propertyChineseAddress: Joi.string().required(),
    propertyShareOfTheLocation: Joi.string().required(),
    propertyRemarks: Joi.array().items(Joi.string()).required(),
    transactionHistory: Joi.array().items(infoSchema.transaction).required(),
    deedsPendingRegistration: Joi.array().items(infoSchema.transaction).required(),
    deedsPendingRegistrationRejected: Joi.array().items(infoSchema.transaction).required(),
    incumbranceHistory: Joi.array().items(infoSchema.incumbrance).required(),
    incumbrancePendingRegistration: Joi.array().items(infoSchema.incumbrance).required(),
    incumbrancePendingRegistrationRejected: Joi.array().items(infoSchema.incumbrance).required(),
  }),
  updateAsset: Joi.object({
    ID: Joi.string().required(),
    propertyStatus: Joi.string().valid('Develop', 'InMarket', 'Recycled').required(),
    propertyReferenceNumber: Joi.string().required(),
    propertyHeldInfos: Joi.array().items(infoSchema.heldInfo).required(),
    propertyAddress: Joi.string().required(),
    propertyChineseAddress: Joi.string().required(),
    propertyShareOfTheLocation: Joi.string().required(),
    propertyRemarks: Joi.array().items(Joi.string()).required(),
    transactionHistory: Joi.array().items(infoSchema.transaction).required(),
    deedsPendingRegistration: Joi.array().items(infoSchema.transaction).required(),
    deedsPendingRegistrationRejected: Joi.array().items(infoSchema.transaction).required(),
    incumbranceHistory: Joi.array().items(infoSchema.incumbrance).required(),
    incumbrancePendingRegistration: Joi.array().items(infoSchema.incumbrance).required(),
    incumbrancePendingRegistrationRejected: Joi.array().items(infoSchema.incumbrance).required(),
  }),
};

export const landAssetsRouter = express.Router();
function requireMSPPermission(mspId: string) {
  if (mspId === 'Org1MSP') {
    return true;
  }
  return false;
}
function patchAssetIfItemIsNotArray(asset: any) {
  if (!asset) {
    throw new Error('Asset is not an object');
  }

  if (!_.isArray(asset.incumbrancePendingRegistration)) {
    asset.incumbrancePendingRegistration = [];
  }
  if (!_.isArray(asset.incumbranceHistory)) {
    asset.incumbranceHistory = [];
  }
  if (!_.isArray(asset.incumbrancePendingRegistrationRejected)) {
    asset.incumbrancePendingRegistrationRejected = [];
  }
  if (!_.isArray(asset.deedsPendingRegistration)) {
    asset.deedsPendingRegistration = [];
  }
  if (!_.isArray(asset.deedsPendingRegistrationRejected)) {
    asset.deedsPendingRegistrationRejected = [];
  }
  if (!_.isArray(asset.transactionHistory)) {
    asset.transactionHistory = [];
  }
}

landAssetsRouter.post('/getSummary', async (req: Request, res: Response) => {
  logger.debug('getSummary request received');
  try {
    const response = {
      totalAssets: 0,
      propertyStatus: {
        Develop: 0,
        InMarket: 0,
        Recycled: 0,
      },
      pendingEvents: {
        deeds: 0,
        incumbrance: 0,
      },
    };

    const mspId = req.user as string;
    const contract = req.app.locals[mspId]?.assetContract as Contract;
    if (!requireMSPPermission(mspId)) {
      return res.status(BAD_REQUEST).json({
        message: 'Permission denied',
        timestamp: new Date().toISOString(),
      });
    }
    const data = await evatuateTransaction(contract, 'GetAllAssets');
    let assets = [];
    if (data.length > 0) {
      assets = JSON.parse(data.toString());
    }

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      if (asset.propertyStatus === 'Develop') {
        response.propertyStatus['Develop'] += 1;
      } else if (asset.propertyStatus === 'InMarket') {
        response.propertyStatus['InMarket'] += 1;
      } else if (asset.propertyStatus === 'Recycled') {
        response.propertyStatus['Recycled'] += 1;
      }
      if (asset.deedsPendingRegistration.length > 0) {
        response.pendingEvents['deeds'] += 1;
      }
      if (asset.incumbrancePendingRegistration.length > 0) {
        response.pendingEvents['incumbrance'] += 1;
      }
    }
    response.totalAssets = assets.length;
    return res.status(OK).json(response);
  } catch (err) {
    logger.error({ err }, 'Error processing get all assets request');
    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});

landAssetsRouter.post('/list', async (req: Request, res: Response) => {
  logger.debug('Get all assets request received');
  try {
    const limit = parseInt(req.query.limit || req.body.limit);
    const offset = parseInt(req.query.offset || req.body.offset);
    const mspId = req.user as string;
    const contract = req.app.locals[mspId]?.assetContract as Contract;
    if (!requireMSPPermission(mspId)) {
      return res.status(BAD_REQUEST).json({
        message: 'Permission denied',
        timestamp: new Date().toISOString(),
      });
    }
    const data = await evatuateTransaction(contract, 'GetAllAssets');
    let assets = [];
    if (data.length > 0) {
      assets = JSON.parse(data.toString());
    }
    const rows = assets.slice(offset, offset + limit);
    const response = {
      rows: rows,
      count: assets.length,
    };
    return res.status(OK).json(response);
  } catch (err) {
    logger.error({ err }, 'Error processing get all assets request');
    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});

landAssetsRouter.post('/find', async (req: Request, res: Response) => {
  logger.debug('Get all assets request received');

  try {
    const limit = parseInt(req.query.limit || req.body.limit);
    const offset = parseInt(req.query.offset || req.body.offset);
    const propertyReferenceNumber = req.query.propertyReferenceNumber || req.body.propertyReferenceNumber || '';
    const addressFilter = req.query.address || req.body.address || '';
    logger.debug('/find', propertyReferenceNumber, addressFilter, limit, offset);
    const mspId = req.user as string;
    const contract = req.app.locals[mspId]?.assetContract as Contract;
    if (!requireMSPPermission(mspId)) {
      return res.status(BAD_REQUEST).json({
        message: 'Permission denied',
        timestamp: new Date().toISOString(),
      });
    }
    const data = await evatuateTransaction(contract, 'GetAllAssets');

    let assets = [];
    if (data.length > 0) {
      assets = JSON.parse(data.toString());
    }

    if (propertyReferenceNumber !== '') {
      assets = assets.filter((asset: any) => asset.propertyReferenceNumber.includes(propertyReferenceNumber));
    }
    if (addressFilter !== '') {
      assets = assets.filter((asset: any) => asset.propertyAddress.includes(addressFilter) || asset.propertyChineseAddress.includes(addressFilter));
    }

    const rows = assets.slice(offset, offset + limit);
    const response = {
      rows: rows,
      count: assets.length,
    };
    return res.status(OK).json(response);
  } catch (err) {
    logger.error({ err }, 'Error processing get all assets request');
    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});

landAssetsRouter.post('/get/:assetId', async (req: Request, res: Response) => {
  const assetId = req.params.assetId;
  logger.debug('Read asset request received for asset ID %s', assetId);

  try {
    const mspId = req.user as string;
    const contract = req.app.locals[mspId]?.assetContract as Contract;
    if (!requireMSPPermission(mspId)) {
      return res.status(BAD_REQUEST).json({
        message: 'Permission denied',
        timestamp: new Date().toISOString(),
      });
    }
    const data = await evatuateTransaction(contract, 'ReadAsset', assetId);
    const asset = JSON.parse(data.toString());

    return res.status(OK).json(asset);
  } catch (err) {
    logger.error({ err }, 'Error processing read asset request for asset ID %s', assetId);

    if (err instanceof AssetNotFoundError) {
      return res.status(NOT_FOUND).json({
        status: getReasonPhrase(NOT_FOUND),
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});

landAssetsRouter.post('/create', async (req: Request, res: Response) => {
  logger.debug(req.body, 'Create asset request received');

  const { error } = schema.createAsset.validate(req.body);
  if (error) {
    return res.status(BAD_REQUEST).json({
      error: error,
    });
  }

  const mspId = req.user as string;
  const assetId = req.body.ID;
  if (!requireMSPPermission(mspId)) {
    return res.status(BAD_REQUEST).json({
      message: 'Permission denied',
      timestamp: new Date().toISOString(),
    });
  }
  const asset: Asset = {
    ID: assetId,
    version: 1,

    createdMethod: 'Add',
    propertyStatus: req.body.propertyStatus,
    propertyReferenceNumber: req.body.propertyReferenceNumber,
    propertyHeldInfos: req.body.propertyHeldInfos,
    propertyAddress: req.body.propertyAddress,
    propertyChineseAddress: req.body.propertyChineseAddress,
    propertyShareOfTheLocation: req.body.propertyShareOfTheLocation,
    propertyRemarks: req.body.propertyRemarks,
    transactionHistory: req.body.transactionHistory,
    deedsPendingRegistration: req.body.deedsPendingRegistration,
    deedsPendingRegistrationRejected: req.body.deedsPendingRegistrationRejected,
    incumbranceHistory: req.body.incumbranceHistory,
    incumbrancePendingRegistration: req.body.incumbrancePendingRegistration,
    incumbrancePendingRegistrationRejected: req.body.incumbrancePendingRegistrationRejected,
  };
  try {
    const submitQueue = req.app.locals.jobq as Queue;
    const jobId = await addSubmitTransactionJob(submitQueue, mspId, 'CreateAsset', assetId, JSON.stringify(asset));

    return res.status(ACCEPTED).json({
      status: getReasonPhrase(ACCEPTED),
      jobId: jobId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error processing create asset request for asset ID %s', assetId);

    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});

landAssetsRouter.post('/update/:assetId', async (req: Request, res: Response) => {
  logger.debug(req.body, 'Update asset request received');

  const { error } = schema.updateAsset.validate(req.body);
  if (error) {
    return res.status(BAD_REQUEST).json({
      error: error,
    });
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(BAD_REQUEST).json({
      status: getReasonPhrase(BAD_REQUEST),
      reason: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      timestamp: new Date().toISOString(),
      errors: errors.array(),
    });
  }

  if (req.params.assetId != req.body.ID) {
    return res.status(BAD_REQUEST).json({
      status: getReasonPhrase(BAD_REQUEST),
      reason: 'ASSET_ID_MISMATCH',
      message: 'Asset IDs must match',
      timestamp: new Date().toISOString(),
    });
  }

  const mspId = req.user as string;
  const assetId = req.params.assetId;
  if (!requireMSPPermission(mspId)) {
    return res.status(BAD_REQUEST).json({
      message: 'Permission denied',
      timestamp: new Date().toISOString(),
    });
  }
  const contract = req.app.locals[mspId]?.assetContract as Contract;
  const data = await evatuateTransaction(contract, 'ReadAsset', assetId);
  const asset = JSON.parse(data.toString());
  const updateFields = {
    propertyStatus: req.body.propertyStatus,
    propertyReferenceNumber: req.body.propertyReferenceNumber,
    propertyHeldInfos: req.body.propertyHeldInfos,
    propertyAddress: req.body.propertyAddress,
    propertyChineseAddress: req.body.propertyChineseAddress,
    propertyShareOfTheLocation: req.body.propertyShareOfTheLocation,
    propertyRemarks: req.body.propertyRemarks,
  };
  const updateAsset = {
    ...asset,
    version: asset.version + 1,
    ...updateFields,
    updatedAt: new Date().toISOString(),
  };

  try {
    const submitQueue = req.app.locals.jobq as Queue;
    const jobId = await addSubmitTransactionJob(submitQueue, mspId, 'UpdateAsset', assetId, JSON.stringify(updateAsset));

    return res.status(ACCEPTED).json({
      status: getReasonPhrase(ACCEPTED),
      jobId: jobId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error processing update asset request for asset ID %s', assetId);

    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});

landAssetsRouter.post('/delete/:assetId', async (req: Request, res: Response) => {
  logger.debug(req.body, 'Delete asset request received');

  const mspId = req.user as string;
  const assetId = req.params.assetId;

  try {
    if (!requireMSPPermission(mspId)) {
      return res.status(BAD_REQUEST).json({
        message: 'Permission denied',
        timestamp: new Date().toISOString(),
      });
    }
    const submitQueue = req.app.locals.jobq as Queue;
    const jobId = await addSubmitTransactionJob(submitQueue, mspId, 'DeleteAsset', assetId);

    return res.status(ACCEPTED).json({
      status: getReasonPhrase(ACCEPTED),
      jobId: jobId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error processing delete asset request for asset ID %s', assetId);

    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});

landAssetsRouter.post('/transaction/approve/:assetId/:recordIndex', async (req: Request, res: Response) => {
  logger.debug(req.body, 'Update asset request received');

  const mspId = req.user as string;
  const assetId = req.params.assetId;
  const recordIndex = req.params.recordIndex;
  try {
    if (!requireMSPPermission(mspId)) {
      return res.status(BAD_REQUEST).json({
        message: 'Permission denied',
        timestamp: new Date().toISOString(),
      });
    }
    const contract = req.app.locals[mspId]?.assetContract as Contract;
    const data = await evatuateTransaction(contract, 'ReadAsset', assetId);
    const asset = JSON.parse(data.toString());
    patchAssetIfItemIsNotArray(asset);
    if (asset.deedsPendingRegistration.length <= recordIndex) {
      return res.status(BAD_REQUEST).json({
        message: 'Record index out of range',
        timestamp: new Date().toISOString(),
      });
    }
    const transaction = asset.deedsPendingRegistration[recordIndex];
    transaction.approvedAt = new Date().toISOString();
    transaction.approvedBy = mspId;
    asset.deedsPendingRegistration.splice(recordIndex, 1);
    asset.transactionHistory.push(transaction);

    const updateAsset = {
      ...asset,
      version: asset.version + 1,
      transactionHistory: asset.transactionHistory,
      deedsPendingRegistration: asset.deedsPendingRegistration,
      updatedAt: new Date().toISOString(),
    };

    const submitQueue = req.app.locals.jobq as Queue;
    const jobId = await addSubmitTransactionJob(submitQueue, mspId, 'UpdateAsset', assetId, JSON.stringify(updateAsset));

    return res.status(ACCEPTED).json({
      status: getReasonPhrase(ACCEPTED),
      jobId: jobId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error processing update asset request for asset ID %s', assetId);

    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});

landAssetsRouter.post('/transaction/reject/:assetId/:recordIndex', async (req: Request, res: Response) => {
  logger.debug(req.body, 'Update asset request received');

  const mspId = req.user as string;
  const assetId = req.params.assetId;
  const recordIndex = req.params.recordIndex;
  try {
    if (!requireMSPPermission(mspId)) {
      return res.status(BAD_REQUEST).json({
        message: 'Permission denied',
        timestamp: new Date().toISOString(),
      });
    }
    const contract = req.app.locals[mspId]?.assetContract as Contract;
    const data = await evatuateTransaction(contract, 'ReadAsset', assetId);
    const asset = JSON.parse(data.toString());
    patchAssetIfItemIsNotArray(asset);
    if (asset.deedsPendingRegistration.length <= recordIndex) {
      return res.status(BAD_REQUEST).json({
        message: 'Record index out of range',
        timestamp: new Date().toISOString(),
      });
    }
    const transaction = asset.deedsPendingRegistration[recordIndex];
    transaction.rejectedAt = new Date().toISOString();
    transaction.rejectedBy = mspId;
    asset.deedsPendingRegistration.splice(recordIndex, 1);
    asset.deedsPendingRegistrationRejected.push(transaction);

    const updateAsset = {
      ...asset,
      version: asset.version + 1,
      deedsPendingRegistrationRejected: asset.deedsPendingRegistrationRejected,
      deedsPendingRegistration: asset.deedsPendingRegistration,
      updatedAt: new Date().toISOString(),
    };

    const submitQueue = req.app.locals.jobq as Queue;
    const jobId = await addSubmitTransactionJob(submitQueue, mspId, 'UpdateAsset', assetId, JSON.stringify(updateAsset));

    return res.status(ACCEPTED).json({
      status: getReasonPhrase(ACCEPTED),
      jobId: jobId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error processing update asset request for asset ID %s', assetId);

    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});
landAssetsRouter.post('/incumbrance/approve/:assetId/:recordIndex', async (req: Request, res: Response) => {
  logger.debug(req.body, 'Update asset request received');

  const mspId = req.user as string;
  const assetId = req.params.assetId;
  const recordIndex = req.params.recordIndex;
  try {
    if (!requireMSPPermission(mspId)) {
      return res.status(BAD_REQUEST).json({
        message: 'Permission denied',
        timestamp: new Date().toISOString(),
      });
    }
    const contract = req.app.locals[mspId]?.assetContract as Contract;
    const data = await evatuateTransaction(contract, 'ReadAsset', assetId);
    const asset = JSON.parse(data.toString());
    patchAssetIfItemIsNotArray(asset);
    if (asset.incumbrancePendingRegistration.length <= recordIndex) {
      return res.status(BAD_REQUEST).json({
        message: 'Record index out of range',
        timestamp: new Date().toISOString(),
      });
    }

    const incumbrance = asset.incumbrancePendingRegistration[recordIndex];

    incumbrance.approvedAt = new Date().toISOString();
    incumbrance.approvedBy = mspId;
    asset.incumbrancePendingRegistration.splice(recordIndex, 1);
    asset.incumbranceHistory.push(incumbrance);

    const updateAsset = {
      ...asset,
      version: asset.version + 1,
      incumbranceHistory: asset.incumbranceHistory,
      incumbrancePendingRegistration: asset.incumbrancePendingRegistration,
      updatedAt: new Date().toISOString(),
    };

    const submitQueue = req.app.locals.jobq as Queue;
    const jobId = await addSubmitTransactionJob(submitQueue, mspId, 'UpdateAsset', assetId, JSON.stringify(updateAsset));

    return res.status(ACCEPTED).json({
      status: getReasonPhrase(ACCEPTED),
      jobId: jobId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error processing update asset request for asset ID %s', assetId);

    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});

landAssetsRouter.post('/incumbrance/reject/:assetId/:recordIndex', async (req: Request, res: Response) => {
  logger.debug(req.body, 'Update asset request received');

  const mspId = req.user as string;
  const assetId = req.params.assetId;
  const recordIndex = req.params.recordIndex;
  try {
    if (!requireMSPPermission(mspId)) {
      return res.status(BAD_REQUEST).json({
        message: 'Permission denied',
        timestamp: new Date().toISOString(),
      });
    }
    const contract = req.app.locals[mspId]?.assetContract as Contract;
    const data = await evatuateTransaction(contract, 'ReadAsset', assetId);
    const asset = JSON.parse(data.toString());
    patchAssetIfItemIsNotArray(asset);

    if (asset.incumbrancePendingRegistration.length <= recordIndex) {
      return res.status(BAD_REQUEST).json({
        message: 'Record index out of range',
        timestamp: new Date().toISOString(),
      });
    }
    const incumbrance = asset.incumbrancePendingRegistration[recordIndex];

    incumbrance.rejectedAt = new Date().toISOString();
    incumbrance.rejectedBy = mspId;
    asset.incumbrancePendingRegistration.splice(recordIndex, 1);
    asset.incumbrancePendingRegistrationRejected.push(incumbrance);

    const updateAsset = {
      ...asset,
      version: asset.version + 1,
      incumbrancePendingRegistrationRejected: asset.incumbrancePendingRegistrationRejected,
      incumbrancePendingRegistration: asset.incumbrancePendingRegistration,
      updatedAt: new Date().toISOString(),
    };

    const submitQueue = req.app.locals.jobq as Queue;
    const jobId = await addSubmitTransactionJob(submitQueue, mspId, 'UpdateAsset', assetId, JSON.stringify(updateAsset));

    return res.status(ACCEPTED).json({
      status: getReasonPhrase(ACCEPTED),
      jobId: jobId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error processing update asset request for asset ID %s', assetId);

    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});
