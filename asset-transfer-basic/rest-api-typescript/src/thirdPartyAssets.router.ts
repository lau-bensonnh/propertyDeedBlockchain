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
import Joi from 'joi';
import _ from 'lodash';
import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Contract } from 'fabric-network';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { Queue } from 'bullmq';
import { AssetNotFoundError } from './errors';
import { evatuateTransaction } from './fabric';
import { addSubmitTransactionJob } from './jobs';
import { logger } from './logger';

const { ACCEPTED, BAD_REQUEST, INTERNAL_SERVER_ERROR, NOT_FOUND, OK } = StatusCodes;

const schema = {
  submitTransaction: Joi.object({
    owners: Joi.array()
      .items(Joi.alternatives().try(Joi.string(), Joi.object({ nameOfOwner: Joi.string(), capacity: Joi.string() })))
      .required(),
    memorialNumber: Joi.string().required(),
    dateOfInstrument: Joi.string().required(),
    dateOfRegistration: Joi.string().required(),
    consideration: Joi.string().required(),
    remarks: Joi.string().required(),
  }),
  submitIncumbrance: Joi.object({
    memorialNumber: Joi.string().required(),
    dateOfInstrument: Joi.string().required(),
    dateOfRegistration: Joi.string().required(),
    natureOfIncumbrances: Joi.string().required(),
    inFavourOf: Joi.alternatives()
      .try(Joi.string(), Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.object({ nameOfOwner: Joi.string(), capacity: Joi.string() }))))
      .required(),
    consideration: Joi.string().required(),
    remarks: Joi.string().required(),
  }),
};
export const thirdPartyAssetsRouter = express.Router();

thirdPartyAssetsRouter.post('/find', async (req: Request, res: Response) => {
  logger.debug('Get all assets request received');

  try {
    const limit = parseInt(req.query.limit || req.body.limit);
    const offset = parseInt(req.query.offset || req.body.offset);
    const propertyReferenceNumber = req.query.propertyReferenceNumber || req.body.propertyReferenceNumber || '';
    const addressFilter = req.query.address || req.body.address || '';

    console.log('/find', propertyReferenceNumber, addressFilter, limit, offset);
    const mspId = req.user as string;
    console.log('mspId', mspId);
    const contract = req.app.locals[mspId]?.assetContract as Contract;

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

thirdPartyAssetsRouter.post('/get/:assetId', async (req: Request, res: Response) => {
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
thirdPartyAssetsRouter.post('/transaction/submit/:assetId', async (req: Request, res: Response) => {
  console.log('/assets/transaction/submit/:assetId received');
  const assetId = req.params.assetId;
  logger.debug('Read asset request received for asset ID %s', assetId);

  try {
    const { error } = schema.submitTransaction.validate(req.body);
    if (error) {
      return res.status(BAD_REQUEST).json({
        error: error,
      });
    }

    const mspId = req.user as string;
    const contract = req.app.locals[mspId]?.assetContract as Contract;

    const data = await evatuateTransaction(contract, 'ReadAsset', assetId);
    const asset = JSON.parse(data.toString());

    const transaction: object = {
      owners: req.body.owners,
      memorialNumber: req.body.memorialNumber,
      dateOfInstrument: req.body.dateOfInstrument,
      dateOfRegistration: req.body.dateOfRegistration,
      consideration: req.body.consideration,
      remarks: req.body.remarks,

      submittedAt: new Date().getTime(),
      submittedBy: mspId,
    };
    console.log('asset', asset);
    const transcations: object[] = _.isArray(asset.deedsPendingRegistration) ? asset.deedsPendingRegistration || [] : [];
    transcations.push(transaction);
    const updateAsset = { ...asset, version: asset.version + 1, deedsPendingRegistration: transcations };

    const submitQueue = req.app.locals.jobq as Queue;
    const jobId = await addSubmitTransactionJob(submitQueue, mspId, 'UpdateAsset', assetId, JSON.stringify(updateAsset));

    return res.status(ACCEPTED).json({
      status: getReasonPhrase(ACCEPTED),
      jobId: jobId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.log(err);
    logger.error({ err }, 'Error processing create asset transaction request for asset ID %s', assetId);
    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});

thirdPartyAssetsRouter.post('/incumbrance/submit/:assetId', async (req: Request, res: Response) => {
  console.log('get asset request received');
  const assetId = req.params.assetId;
  logger.debug('Read asset request received for asset ID %s', assetId);

  const { error } = schema.submitIncumbrance.validate(req.body);
  if (error) {
    return res.status(BAD_REQUEST).json({
      error: error,
    });
  }
  try {
    const mspId = req.user as string;
    const contract = req.app.locals[mspId]?.assetContract as Contract;

    const data = await evatuateTransaction(contract, 'ReadAsset', assetId);
    const asset = JSON.parse(data.toString());

    const incumbrance: object = {
      memorialNumber: req.body.memorialNumber,
      dateOfInstrument: req.body.dateOfInstrument,
      dateOfRegistration: req.body.dateOfRegistration,
      natureOfIncumbrances: req.body.natureOfIncumbrances,
      inFavourOf: req.body.inFavourOf,
      consideration: req.body.consideration,
      remarks: req.body.remarks,

      submittedAt: new Date(),
      submittedBy: mspId,
    };
    const incumbrances: object[] = _.isArray(asset.incumbrancePendingRegistration) ? asset.incumbrancePendingRegistration : [];
    incumbrances.push(incumbrance);
    const updateAsset = { ...asset, version: asset.version + 1, incumbrancePendingRegistration: incumbrances };

    const submitQueue = req.app.locals.jobq as Queue;
    const jobId = await addSubmitTransactionJob(submitQueue, mspId, 'UpdateAsset', assetId, JSON.stringify(updateAsset));

    return res.status(ACCEPTED).json({
      status: getReasonPhrase(ACCEPTED),
      jobId: jobId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Error processing create asset incumbrance request for asset ID %s', assetId);
    return res.status(INTERNAL_SERVER_ERROR).json({
      status: getReasonPhrase(INTERNAL_SERVER_ERROR),
      timestamp: new Date().toISOString(),
    });
  }
});
