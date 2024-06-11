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

const { ACCEPTED, BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } = StatusCodes;

export const landAssetsRouter = express.Router();

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

    const data = await evatuateTransaction(contract, 'GetAllAssets');
    let assets = [];
    if (data.length > 0) {
      assets = JSON.parse(data.toString());
    }

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      if (asset.status === 'Develop') {
        response.propertyStatus['Develop'] += 1;
      } else if (asset.status === 'InMarket') {
        response.propertyStatus['InMarket'] += 1;
      } else if (asset.status === 'Recycled') {
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
    const propertyReferenceNumber = req.query.propertyReferenceNumber || '';
    const addressFilter = req.query.address || '';

    console.log('/find', propertyReferenceNumber, addressFilter, limit, offset);
    const mspId = req.user as string;
    const contract = req.app.locals[mspId]?.assetContract as Contract;

    const data = await evatuateTransaction(contract, 'GetAllAssets');
    let assets = [];
    if (data.length > 0) {
      assets = JSON.parse(data.toString());
    }

    if (propertyReferenceNumber !== '') {
      assets = assets.filter((asset: any) => asset.propertyReferenceNumber === propertyReferenceNumber);
    }
    if (addressFilter !== '') {
      assets = assets.filter((asset: any) => asset.propertyAddress.includes(addressFilter));
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
  console.log('get asset request received');
  const assetId = req.params.assetId;
  logger.debug('Read asset request received for asset ID %s', assetId);

  try {
    const mspId = req.user as string;
    const contract = req.app.locals[mspId]?.assetContract as Contract;

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

landAssetsRouter.post(
  '/create',
  // body().isObject().withMessage('body must contain an asset object'),
  // body('ID', 'must be a string').notEmpty(),
  // body('Color', 'must be a string').notEmpty(),
  // body('Size', 'must be a number').isNumeric(),
  // body('Owner', 'must be a string').notEmpty(),
  // body('AppraisedValue', 'must be a number').isNumeric(),
  async (req: Request, res: Response) => {
    logger.debug(req.body, 'Create asset request received');

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

    const mspId = req.user as string;
    const assetId = req.body.ID;
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
  }
);

landAssetsRouter.put(
  '/:assetId',
  // body().isObject().withMessage('body must contain an asset object'),
  // body('ID', 'must be a string').notEmpty(),
  // body('Color', 'must be a string').notEmpty(),
  // body('Size', 'must be a number').isNumeric(),
  // body('Owner', 'must be a string').notEmpty(),
  // body('AppraisedValue', 'must be a number').isNumeric(),
  async (req: Request, res: Response) => {
    logger.debug(req.body, 'Update asset request received');

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

    try {
      const submitQueue = req.app.locals.jobq as Queue;
      const jobId = await addSubmitTransactionJob(submitQueue, mspId, 'UpdateAsset', assetId, req.body.color, req.body.size, req.body.owner, req.body.appraisedValue);

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
  }
);

landAssetsRouter.patch(
  '/:assetId',
  body()
    .isArray({
      min: 1,
      max: 1,
    })
    .withMessage('body must contain an array with a single patch operation'),
  body('*.op', "operation must be 'replace'").equals('replace'),
  body('*.path', "path must be '/Owner'").equals('/Owner'),
  body('*.value', 'must be a string').isString(),
  async (req: Request, res: Response) => {
    logger.debug(req.body, 'Transfer asset request received');

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

    const mspId = req.user as string;
    const assetId = req.params.assetId;
    const newOwner = req.body[0].value;

    try {
      const submitQueue = req.app.locals.jobq as Queue;
      const jobId = await addSubmitTransactionJob(submitQueue, mspId, 'TransferAsset', assetId, newOwner);

      return res.status(ACCEPTED).json({
        status: getReasonPhrase(ACCEPTED),
        jobId: jobId,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error({ err }, 'Error processing update asset request for asset ID %s', req.params.assetId);

      return res.status(INTERNAL_SERVER_ERROR).json({
        status: getReasonPhrase(INTERNAL_SERVER_ERROR),
        timestamp: new Date().toISOString(),
      });
    }
  }
);

landAssetsRouter.delete('/:assetId', async (req: Request, res: Response) => {
  logger.debug(req.body, 'Delete asset request received');

  const mspId = req.user as string;
  const assetId = req.params.assetId;

  try {
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
