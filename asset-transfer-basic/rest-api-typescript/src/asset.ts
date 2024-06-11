/*
  SPDX-License-Identifier: Apache-2.0
*/

import { Object, Property } from 'fabric-contract-api';

type PropertyHeldInfo = {
  locationNumber: string;
  heldUnder: string;
  leaseTerm: string;
  commencementOfLeaseTerm: string;
  rentPerAnnum: string;
};
type OwnerInfo = {
  nameOfOwner: string;
  capacity: string;
};
type OwnerTransactionInfo = {
  owners: OwnerInfo[];
  memorialNumber: string;
  dateOfInstrument: string;
  dateOfRegistration: string;
  consideration: string;
  remarks: string;
};
type IncumbrancesInfo = {
  memorialNumber: string;
  dateOfInstrument: string;
  dateOfRegistration: string;
  natureOfIncumbrances: string;
  inFavourOf: string | OwnerInfo[];
  consideration: string;
  remarks: string;
};

export class Asset {
  public docType?: string;
  public ID?: string; // PRN
  public version?: number;
  public createdAt?: Date | string;
  public updatedAt?: Date | string;
  public createdMethod?: 'Add' | 'Import';
  public propertyStatus?: 'Develop' | 'InMarket' | 'Recycled';
  // land dept
  public propertyReferenceNumber?: string; // PRN
  public propertyHeldInfos?: PropertyHeldInfo[]; // LOT No.
  public propertyAddress?: string;
  public propertyChineseAddress?: string;
  public propertyShareOfTheLocation?: string;
  public propertyRemarks?: string[];
  //   transaction
  public transactionHistory?: OwnerTransactionInfo[];
  public deedsPendingRegistration?: OwnerTransactionInfo[];
  public deedsPendingRegistrationRejected?: OwnerTransactionInfo[];
  // incumbrance
  public incumbranceHistory?: IncumbrancesInfo[];
  public incumbrancePendingRegistration?: IncumbrancesInfo[];
  public incumbrancePendingRegistrationRejected?: IncumbrancesInfo[];

  constructor() {}
}
