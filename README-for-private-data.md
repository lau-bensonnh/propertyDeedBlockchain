copy config , testnetwok
copy applicaion-gateway , chaincode

# Part 0: 1. setup TEST_NETWORK_HOME

cat ~/.zshrc

```
export PATH=/Users/hin/go/src/github.com/tszhin/fabric-samples/bin:$PATH
export TEST_NETWORK_HOME=/Users/hin/go/src/github.com/tszhin/propertyDeedBlockchain/test-network
export PATH=/Users/hin/go/bin:$PATH
```

## Part 0: 2. optional(log)

cd /Users/hin/go/src/github.com/tszhin/propertyDeedBlockchain/test-network
./monitordocker.sh fabric_test

## Part 1. start network and apply the chaincode

<!-- ccn = CC_NAME  , ccep = CC_END_POLICY , CCCG = CC_COLL_CONFIG  -->

cd /Users/hin/go/src/github.com/tszhin/propertyDeedBlockchain/test-network
./network.sh up
./network.sh up createChannel -c mychannel -ca
./network.sh deployCC -ccn private -ccp ../asset-transfer-private-data/chaincode-typescript/ -ccl typescript -ccep "OR('Org1MSP.peer','Org2MSP.peer')" -cccg ../asset-transfer-private-data/chaincode-typescript/collections_config.json

./network.sh down

## run in private data (part 2)

cd /Users/hin/go/src/github.com/tszhin/propertyDeedBlockchain/asset-transfer-private-data/application-gateway-typescript
npm start

## part 3 , run in rest api

cd /Users/hin/go/src/github.com/tszhin/propertyDeedBlockchain/asset-transfer-private-data/rest-api-typescript

<!-- a -->

npm install
npm run build
TEST_NETWORK_HOME=/Users/hin/go/src/github.com/tszhin/propertyDeedBlockchain/test-network npm run generateEnv
export REDIS_PASSWORD=$(uuidgen)
npm run start:redis

<!-- b -->

npm run start:dev

## part 4 test api call

cd /Users/hin/go/src/github.com/tszhin/propertyDeedBlockchain/asset-transfer-private-data/rest-api-typescript
SAMPLE_APIKEY=$(grep ORG1_APIKEY .env | cut -d '=' -f 2-)
curl --header "X-Api-Key: ${SAMPLE_APIKEY}" http://localhost:3000/api/assets
curl --include --header "X-Api-Key: ${SAMPLE_APIKEY}" --request OPTIONS http://localhost:3000/api/assets/asset7
curl --include --header "Content-Type: application/json" --header "X-Api-Key: ${SAMPLE_APIKEY}" --request POST --data '{"ID":"asset7","Color":"red","Size":42,"Owner":"Jean","AppraisedValue":101}' http://localhost:3000/api/assets

```

```
