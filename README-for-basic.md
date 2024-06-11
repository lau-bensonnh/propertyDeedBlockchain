copy config , testnetwok
copy applicaion-gateway , chaincode

# Part 0: 1. setup TEST_NETWORK_HOME

cat ~/.zshrc

```
export PATH=~/go/src/github.com/tszhin/fabric-samples/bin:$PATH
export TEST_NETWORK_HOME=~/go/src/github.com/lau-bensonnh/propertyDeedBlockchain/test-network
export PATH=~/go/bin:$PATH
```

## Part 0: 2. optional(log)

cd ~/go/src/github.com/lau-bensonnh/propertyDeedBlockchain/test-network
./monitordocker.sh fabric_test

## Part 1. start network and apply the chaincode

<!-- ccn = CC_NAME  , ccep = CC_END_POLICY , CCCG = CC_COLL_CONFIG  -->

cd ~/go/src/github.com/lau-bensonnh/propertyDeedBlockchain/test-network
./network.sh up
./network.sh up createChannel -c mychannel -ca
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-typescript/ -ccl typescript
./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-typescript/ -ccl typescript -ccep "OR('Org1MSP.peer','Org2MSP.peer')"
./network.sh down

## run in basic data (part 2)

cd ~/go/src/github.com/lau-bensonnh/propertyDeedBlockchain/asset-transfer-basic/application-gateway-typescript
npm start

## part 3 , run in rest api

export TEST_NETWORK_HOME=~/go/src/github.com/lau-bensonnh/propertyDeedBlockchain/test-network
export REDIS_PASSWORD=$(uuidgen)
cd ~/go/src/github.com/lau-bensonnh/propertyDeedBlockchain/asset-transfer-basic/rest-api-typescript

<!-- install -->

npm install
npm run build
npm run generateEnv
npm run stop:redis
npm run start:redis
npm run start:dev

## part 4 test api call

cd ~/go/src/github.com/lau-bensonnh/propertyDeedBlockchain/asset-transfer-basic/rest-api-typescript
SAMPLE_APIKEY=$(grep ORG1_APIKEY .env | cut -d '=' -f 2-)
echo $SAMPLE_APIKEY
curl --header "X-Api-Key: ${SAMPLE_APIKEY}" -X POST http://localhost:3000/api/land/assets/getSummary
curl --header "X-Api-Key: ${SAMPLE_APIKEY}" -X POST http://localhost:3000/api/land/assets/get/asset1000001

curl --header "X-Api-Key: ${SAMPLE_APIKEY}" http://localhost:3000/api/assets
curl --include --header "X-Api-Key: ${SAMPLE_APIKEY}" --request OPTIONS http://localhost:3000/api/assets/asset7
curl --include --header "Content-Type: application/json" --header "X-Api-Key: ${SAMPLE_APIKEY}" --request POST --data '{"ID":"asset7","Color":"red","Size":42,"Owner":"Jean","AppraisedValue":101}' http://localhost:3000/api/assets

```

```
