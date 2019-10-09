const nem = require('nem-sdk').default
const {
  merge,
  has
} = require('ramda')

const { CONFIG } = require('../config')

const convertDate = timeStamp => nem.utils.format.nemDate(timeStamp)

const descendingTransactions = (a, b) => (a.transaction.timeStamp - b.transaction.timeStamp)

const formatValue = (value = '0.0') => {
  const fmt = nem.utils.format.nemValue(value)
  const decimals = parseInt(fmt[1]) > 0 ? `.${fmt[1]}` : ''
  return `${fmt[0]}${decimals}`
}

const encode = (privateKey, publicKey, payload) => nem.crypto.helpers.encode(privateKey, publicKey, payload)
const decode = (privateKey, publicKey, input) => {
  const { payload } = nem.utils.format.hexMessage({ payload: nem.crypto.helpers.decode(privateKey, publicKey, input), type: 1 })
  return payload
}

const decodeMessage = (privateKey, publicKey, message = {}) => {
  if (message.type === 2) {
    message.payload = nem.crypto.helpers.decode(privateKey, publicKey, message.payload)
    message.type = 1
  }
  return nem.utils.format.hexMessage(message)
}
const encodeMessage = (privateKey, publicKey, payload) => encode(privateKey, publicKey, payload)

const parseData = (privateKey, publicKey, input) => {
  function parse(data) {
    const result = Boolean(data.transaction) ? merge(data.meta, data.transaction) : data
    result.message = decodeMessage(privateKey, publicKey || result.signer, result.message)
    result.timeStamp = convertDate(result.timeStamp)
    result.isIncoming = result.signer === publicKey
    return result
  }
  if (input) return parse(input)
  else return parse
}

const getCredentials = password => {
  return new Promise(async (resolve, reject) => {
    try {
      const wallet = nem.model.wallet.createBrain('chatAccount', password, CONFIG.netId)
      let common = nem.model.objects.create('common')(password, '')
      nem.crypto.helpers.passwordToPrivatekey(common, wallet.accounts[0], wallet.accounts[0].algo)
      const { meta, account } = await getAccountData(wallet.accounts[0].address)
      resolve({
        address: wallet.accounts[0].address,
        publickKey: account.publicKey,
        privateKey: common.privateKey
      })
    } catch (error) {
      reject(error)
    }
  })
}

const getAddress = publicKey => nem.model.address.toAddress(publicKey, CONFIG.netId)

const getAccountData = address => {
  return nem.com.requests.account.data(CONFIG.apiEndpoint, address)
}

const hasValidConfig = config => (has('publicKey', config) || has('privateKey', config)) && (has('address', config) || has('password', config))

/**
 * Count bytes in a string's UTF-8 representation.
 * Credit: https://codereview.stackexchange.com/questions/37512/count-byte-length-of-string
 *
 * @param   string
 * @return  int
 */
const getByteLen = normal_val => {
  normal_val = String(normal_val)
  let byteLen = 0
  for (let i = 0; i < normal_val.length; i++) {
      const c = normal_val.charCodeAt(i)
      byteLen += c < (1 <<  7) ? 1 :
                 c < (1 << 11) ? 2 :
                 c < (1 << 16) ? 3 :
                 c < (1 << 21) ? 4 :
                 c < (1 << 26) ? 5 :
                 c < (1 << 31) ? 6 : Number.NaN
  }
  return byteLen
}

module.exports = {
  convertDate,
  descendingTransactions,
  formatValue,
  encode,
  decode,
  decodeMessage,
  encodeMessage,
  parseData,
  getCredentials,
  getAddress,
  getAccountData,
  hasValidConfig,
  getByteLen
}
