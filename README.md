# Testing

## Reference

https://github.com/hyperledger/fabric-samples

## Aim

The source code contains the folder propertyDeedBlockchain which contains the source code and some build folder & logs.
It is based on the fabric sample from https://github.com/hyperledger/fabric-samples
The project use the fabric sample code to build the test network.
The modified code mainly covered in asset-transfer-basic/chaincode-typescript/src & asset-transfer-basic/rest-api-typescript/src folder

## folder structure

- tree

```console
tree -d -L 3
.
├── propertyDeedBlockchain
│   ├── asset-transfer-basic
│   │   ├── application-gateway-typescript
│   │   ├── application-typescript
│   │   ├── chaincode-typescript
│   │   └── rest-api-typescript
│   ├── asset-transfer-private-data
│   │   ├── application-gateway-typescript
│   │   ├── chaincode-typescript
│   │   └── rest-api-typescript
│   ├── config
│   ├── doc
│   └── test-network
│       ├── addOrg3
│       ├── bft-config
│       ├── channel-artifacts
│       ├── compose
│       ├── configtx
│       ├── organizations
│       ├── prometheus-grafana
│       ├── scripts
│       └── system-genesis-block
└── workspace
```

## source code

### test-network folder with config

- test-network/
  - contain the sample code fabric sample network source code which is using to build the fabric testing network
- config/
  - custom config related to the fabric sample network source code , which include the port number ,peer name , order name

### testing folder for different method and application

- asset-transfer-private-data/
- asset-transfer-basic/application-gateway-typescript/
- asset-transfer-basic/application-typescript/

### doc folder

- doc
  - contains some swagger.yaml & postman json & readme file for presentation used

### custom code for the project

- asset-transfer-basic/chaincode-typescript
  - the modifided code for the chaincode - event in stored in blockchain
    - asset.ts contains the asset structure
    - assetTransfer.ts - to handle the function for the SmartContract
    - sampleData.ts - to store the example asset for init testing
- asset-transfer-basic/rest-api-typescript
  - the web server to received the api request and send to fabric blockchain via fabric client
    - asset.ts contains the asset structure
    - health.router.ts - to handle health routing (eg /live)
    - land.router.ts - to handle land routing
    - thirdPartyAssets.router.ts - to handle 3rdParty routing
    - server.ts - to connect the api routing with the router
    - asset.router.ts - (optional) default asset routing
    - jobs.router.ts - (optional) since all request is in job base, it is used to tracking the job
    - fabric.ts - to connect the fabric network with smart contract
    - config.ts - to store the global variable used in the rest api server

## installation menu / operator menu

### install go/fabric/nodejs

<!-- TODO -->
<!-- install fabric,go,nodejs 22 -->

- install Go (prerequisite)

```
brew install go@1.22.5
```

- download fabric sample, Docker images and binaries

```
mkdir -p $HOME/go/src/github.com/lau-bensonnh
cd $HOME/go/src/github.com/lau-bensonnh
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh
./install-fabric.sh docker samples binary
```

- install Node.js v22

```
brew install node@22
```

### setup global variable

- setup .zshrc , modify the path for the location of the fabric sample path & test network path

```
cat ~/.zshrc
export PATH=~/go/src/github.com/lau-bensonnh/fabric-samples/bin:$PATH
export TEST_NETWORK_HOME=~/go/src/github.com/lau-bensonnh/propertyDeedBlockchain/test-network
export PATH=~/go/bin:$PATH
```

### setup & run fabric test network

- start the testing network & create channel

```
cd ~/go/src/github.com/lau-bensonnh/propertyDeedBlockchain/test-network
./network.sh up
./network.sh up createChannel -c mychannel -ca
```

- deploy the chaincode

<!-- ccn = CC_NAME  , ccep = CC_END_POLICY , CCCG = CC_COLL_CONFIG  -->

```
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-typescript/ -ccl typescript
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-typescript/ -ccl typescript -ccep "OR('Org1MSP.peer','Org2MSP.peer')"
```

### clean up the fabric test network

- to reset network, run the following command to stop the network , this will remove all data.

```
./network.sh down
```

### set up rest api server

- setup the global variable (TEST_NETWORK_HOME & REDIS_PASSWORD)

```
export TEST_NETWORK_HOME=~/go/src/github.com/lau-bensonnh/propertyDeedBlockchain/test-network
export REDIS_PASSWORD=$(uuidgen)
```

### install & start the rest api

- install the library & generate the API Key from CA cert & restart the redis server & start the rest api server

```
cd ~/go/src/github.com/lau-bensonnh/propertyDeedBlockchain/asset-transfer-basic/rest-api-typescript
npm install
npm run build
npm run generateEnv
npm run stop:redis
npm run start:redis
npm run start:dev
```

### test api

- prepare the API_KEY

```console
cd ~/go/src/github.com/lau-bensonnh/propertyDeedBlockchain/asset-transfer-basic/rest-api-typescript
SAMPLE_APIKEY=$(grep ORG1_APIKEY .env | cut -d '=' -f 2-)
echo $SAMPLE_APIKEY
```

- test rest api

```
curl --header "X-Api-Key: ${SAMPLE_APIKEY}" -X POST http://localhost:3000/api/land/assets/getSummary
curl --header "X-Api-Key: ${SAMPLE_APIKEY}" -X POST http://localhost:3000/api/land/assets/get/asset1000001
```
