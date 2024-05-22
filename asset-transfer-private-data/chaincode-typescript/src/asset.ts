/*
  SPDX-License-Identifier: Apache-2.0
*/

import { Object, Property } from 'fabric-contract-api';

type PropertyHeldInfo = {
  locationNumber: string
  heldUnder: string
  leaseTerm: string
  commencementOfLeaseTerm: string
  rentPerAnnum: string
}
type OwnerInfo = {
  nameOfOwner: string
  capacity: string
}
type OwnerTransactionInfo = {
  owners: OwnerInfo[]
  memorialNumber: string
  dateOfInstrument: string
  dateOfRegistration: string
  consideration: string
  remarks: string
}
type IncumbrancesInfo = {
  memorialNumber: string
  dateOfInstrument: string
  dateOfRegistration: string
  natureOfIncumbrances: string
  inFavourOf: string | OwnerInfo[]
  consideration: string
  remarks: string
}

@Object()
export class Asset {
  @Property() public docType?: string;
  @Property() public ID: string; // PRN 
  @Property() public version: number
  @Property() public createdAt: Date | string
  @Property() public updatedAt: Date | string
  @Property() public createdMethod: "Add" | "Import"
  @Property() public propertyStatus: "Develop" | "InMarket" | "Recycled"
  // land dept 
  @Property() public propertyReferenceNumber: string  // PRN 
  @Property() public propertyHeldInfos: PropertyHeldInfo[]  // LOT No.
  @Property() public propertyAddress: string
  @Property() public propertyChineseAddress: string
  @Property() public propertyShareOfTheLocation: string
  @Property() public propertyRemarks: string[]
  //   transaction
  @Property() public transactionHistory: OwnerTransactionInfo[]
  @Property() public deedsPendingRegistration: OwnerTransactionInfo[]
  @Property() public deedsPendingRegistrationRejected: OwnerTransactionInfo[]
  // incumbrance
  @Property() public incumbranceHistory: IncumbrancesInfo[]
  @Property() public incumbrancePendingRegistration: IncumbrancesInfo[]
  @Property() public incumbrancePendingRegistrationRejected: IncumbrancesInfo[]



}
