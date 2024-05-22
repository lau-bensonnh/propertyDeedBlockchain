import { Asset } from "./asset";

let sampleAssets: Asset[] = [{
    ID: 'asset1',
    propertyReferenceNumber: 'PRN0001',
    propertyHeldInfos: [

    ],
    version: 0,
    createdMethod: 'Add',
    createdAt: new Date(),
    updatedAt: new Date(),
    propertyStatus: 'Develop',
    propertyAddress: '',
    propertyChineseAddress: '',
    propertyShareOfTheLocation: '4/ 200',
    propertyRemarks: [],
    transactionHistory: [],
    deedsPendingRegistration: [],
    deedsPendingRegistrationRejected: [],
    incumbranceHistory: [],
    incumbrancePendingRegistration: [],
    incumbrancePendingRegistrationRejected: [],

},
{
    ID: 'asset2',
    propertyReferenceNumber: 'PRN0002',
    version: 0,
    createdMethod: 'Add',
    createdAt: new Date(),
    updatedAt: new Date(),
    propertyStatus: 'Develop',
    propertyHeldInfos: [
        {
            locationNumber: ' LOT NO. 412',
            heldUnder: 'GOVERNMENT LEASE',
            leaseTerm: '999 YEARS',
            commencementOfLeaseTerm: '15/05/1855',
            rentPerAnnum: 'N/A',
        },
    ],
    propertyAddress: '',
    propertyChineseAddress: '',
    propertyShareOfTheLocation: '',
    propertyRemarks: [],
    transactionHistory: [],
    deedsPendingRegistration: [],
    deedsPendingRegistrationRejected: [],
    incumbranceHistory: [],
    incumbrancePendingRegistration: [],
    incumbrancePendingRegistrationRejected: [],
},
{
    ID: 'asset3',
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdMethod: 'Add',
    propertyStatus: 'Develop',
    propertyReferenceNumber: 'PRN0003',
    propertyHeldInfos: [
        {
            locationNumber: ' LOT NO. 412',
            heldUnder: 'GOVERNMENT LEASE',
            leaseTerm: '999 YEARS',
            commencementOfLeaseTerm: '15/05/1855',
            rentPerAnnum: 'N/A',
        },
        {
            locationNumber: ' LOT NO. 412',
            heldUnder: 'GOVERNMENT LEASE',
            leaseTerm: '999 YEARS',
            commencementOfLeaseTerm: '15/05/1855',
            rentPerAnnum: '$1,000',
        },
    ],
    propertyAddress: '',
    propertyChineseAddress: '',
    propertyShareOfTheLocation: '',
    propertyRemarks: [
        "SEE RE-DEVELOPMENT NOTICES (MEM. NOS. 1693361 & 1693362)",
        "SEE RE-DEVELOPMENT ORDERS (MEM. NOS. 1726478 & 1726479) ",
        "SEE NOTICES OF FINAL AWARDS (MEM. NOS. 1823741 & 1823742) ",
        "SEE DEED POLL WITH PLAN (MEM. NO. 2150978)"
    ],
    transactionHistory: [],
    deedsPendingRegistration: [],
    deedsPendingRegistrationRejected: [],
    incumbranceHistory: [],
    incumbrancePendingRegistration: [],
    incumbrancePendingRegistrationRejected: []
},
{
    ID: 'asset4',
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdMethod: 'Add',
    propertyStatus: 'InMarket',
    propertyReferenceNumber: 'PRN0004',
    propertyHeldInfos: [{
        locationNumber: ' LOT NO. 412',
        heldUnder: 'GOVERNMENT LEASE',
        leaseTerm: '999 YEARS',
        commencementOfLeaseTerm: '15/05/1855',
        rentPerAnnum: 'N/A',
    },
    {
        locationNumber: ' LOT NO. 412',
        heldUnder: 'GOVERNMENT LEASE',
        leaseTerm: '999 YEARS',
        commencementOfLeaseTerm: '15/05/1855',
        rentPerAnnum: '$1,000',
    },],
    propertyAddress: '',
    propertyChineseAddress: '',
    propertyShareOfTheLocation: '',
    propertyRemarks: [
        "SEE RE-DEVELOPMENT NOTICES (MEM. NOS. 1693361 & 1693362)",
        "SEE RE-DEVELOPMENT ORDERS (MEM. NOS. 1726478 & 1726479) ",
        "SEE NOTICES OF FINAL AWARDS (MEM. NOS. 1823741 & 1823742) ",
        "SEE DEED POLL WITH PLAN (MEM. NO. 2150978)"
    ],
    transactionHistory: [{
        owners: [
            { nameOfOwner: "ABC Limited", capacity: "1/2" },
            { nameOfOwner: "Person Chan Tai Man", capacity: "1/2" }
        ],
        memorialNumber: 'UB2150977',
        dateOfInstrument: '1999/01/01',
        dateOfRegistration: '1999/02/01',
        consideration: '',
        remarks: 'DEED OF PARTITION AND MUTUAL GRANT RE-REGISTERED SEE MEM. NO. UB2440989'
    }],
    deedsPendingRegistration: [],
    deedsPendingRegistrationRejected: [],
    incumbranceHistory: [],
    incumbrancePendingRegistration: [],
    incumbrancePendingRegistrationRejected: []
},
{
    ID: 'asset5',
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdMethod: 'Add',
    propertyStatus: 'InMarket',
    propertyReferenceNumber: 'PRN0005',
    propertyHeldInfos: [
        {
            locationNumber: ' LOT NO. 412',
            heldUnder: 'GOVERNMENT LEASE',
            leaseTerm: '999 YEARS',
            commencementOfLeaseTerm: '15/05/1855',
            rentPerAnnum: 'N/A',
        },
        {
            locationNumber: ' LOT NO. 412',
            heldUnder: 'GOVERNMENT LEASE',
            leaseTerm: '999 YEARS',
            commencementOfLeaseTerm: '15/05/1855',
            rentPerAnnum: '$1,000',
        },
    ],
    propertyAddress: '',
    propertyChineseAddress: '',
    propertyShareOfTheLocation: '',
    propertyRemarks: [
        "SEE RE-DEVELOPMENT NOTICES (MEM. NOS. 1693361 & 1693362)",
        "SEE RE-DEVELOPMENT ORDERS (MEM. NOS. 1726478 & 1726479) ",
        "SEE NOTICES OF FINAL AWARDS (MEM. NOS. 1823741 & 1823742) ",
        "SEE DEED POLL WITH PLAN (MEM. NO. 2150978)"
    ],
    transactionHistory: [
        {
            owners: [
                { nameOfOwner: "ABC Limited", capacity: "1/2" },
                { nameOfOwner: "Person Chan Tai Man", capacity: "1/2" }
            ],
            memorialNumber: 'UB2150977',
            dateOfInstrument: '1999/01/01',
            dateOfRegistration: '1999/02/01',
            consideration: '',
            remarks: 'DEED OF PARTITION AND MUTUAL GRANT RE-REGISTERED SEE MEM. NO. UB2440989'
        },
        {
            owners: [
                { nameOfOwner: "ABC Limited", capacity: "1/2" },
                { nameOfOwner: "Person Chan Siu Man", capacity: "1/2" }
            ],
            memorialNumber: 'UB2150977',
            dateOfInstrument: '2000/01/01',
            dateOfRegistration: '2000/02/01',
            consideration: '$1,750,000.00',
            remarks: 'ASSIGNMENT WITH PLAN'
        }
    ],
    deedsPendingRegistration: [],
    deedsPendingRegistrationRejected: [],
    incumbranceHistory: [
        {
            memorialNumber: 'UB1951073',
            dateOfInstrument: '1999/05/01',
            dateOfRegistration: '1999/06/01',
            natureOfIncumbrances: 'AGREEMENT FOR JOINT REDEVELOPMENT WITH PLANS',
            inFavourOf: '',
            consideration: '',
            remarks: '(IL 412 S.A SS.1 & IL 412 S.A R.P.)'
        },
        {
            memorialNumber: 'UB2162776',
            dateOfInstrument: '2000/05/01',
            dateOfRegistration: '2000/06/01',
            natureOfIncumbrances: 'BUILDING MORTGAGE BY LEE TIN, LAM HING & LUM CHURK TUNG',
            inFavourOf: 'COMET REALTY COMPANY LIMITED',
            consideration: '$5,000,000.00 (PT.)',
            remarks: ''
        }
    ],
    incumbrancePendingRegistration: [
        {
            memorialNumber: 'UB2373315',
            dateOfInstrument: '2003/05/01',
            dateOfRegistration: '2003/05/01',
            natureOfIncumbrances: 'SUPPLEMENTAL AGREEMENT',
            inFavourOf: [
                { nameOfOwner: "Person AAA", capacity: "" },
                { nameOfOwner: "Person BBB", capacity: "" }
            ],
            consideration: '',
            remarks: 'SEE ASSIGNMENT MEM. NO.2373316'
        }
    ],
    incumbrancePendingRegistrationRejected: [
        {
            memorialNumber: '21022400170025',
            dateOfInstrument: '2005/05/01',
            dateOfRegistration: '2005/05/01',
            natureOfIncumbrances: 'MORTGAGE',
            inFavourOf: [
                { nameOfOwner: "STANDARD CHARTERED BANK (HONG KONG) LIMITED", capacity: "" },

            ],
            consideration: 'ALL MONEYS',
            remarks: ''
        }
    ]
}]

// let sampleData = [sampleAssets[0], sampleAssets[1], sampleAssets[2], sampleAssets[3], sampleAssets[4]]
// let sampleData = [sampleAssets[3]]
// let sampleData = [sampleAssets[0], sampleAssets[1]]
let sampleData: Asset[] = [sampleAssets[0]]
// let sampleData = [sampleAssets[1]]
// let sampleData = [sampleAssets[2]]
// let sampleData = [sampleAssets[3]]
// let sampleData = [sampleAssets[4]]
// let sampleData = [sampleAssets[0], sampleAssets[1], sampleAssets[3]]
export default { sampleData: sampleData }