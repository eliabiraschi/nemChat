const nem = require('nem-sdk').default

// TODO: use env variables
const isDevelopment = true

let CONFIG
if (isDevelopment) {
  CONFIG = {
    netId: nem.model.network.data.testnet.id,
    wsEndpoint: nem.model.objects.create('endpoint')(nem.model.nodes.defaultTestnet, nem.model.nodes.websocketPort),
    apiEndpoint: nem.model.objects.create('endpoint')(nem.model.nodes.defaultTestnet, nem.model.nodes.defaultPort)
  }
} else {
  CONFIG = {
    netId: nem.model.network.data.mainnet.id,
    wsEndpoint: nem.model.objects.create('endpoint')(nem.model.nodes.defaultMainnet, nem.model.nodes.websocketPort),
    apiEndpoint: nem.model.objects.create('endpoint')(nem.model.nodes.defaultMainnet, nem.model.nodes.defaultPort)
  }
}

module.exports = {
  CONFIG
}
