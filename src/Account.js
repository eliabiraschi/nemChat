const { nemClient } = require('./libs/nemClient')
const {
  getCredentials,
  parseData
} = require('./libs/helpers')

class Account extends nemClient {
  constructor(auth) {
    super('Account', auth)
  }
  getPayments (history = [], oldest = undefined) {
    return new Promise(async (resolve, reject) => {
      try {
        const parseCurried = parseData(this._.auth.privateKey)
        const res = await this.getAllTransactions()
        const output = res.filter(entry => (entry.transaction.amount > 0)).map(parseCurried).map(entry => {
          entry.isIncoming = entry.recipient === this._.auth.address
          return entry
        })
        resolve(output)
       } catch (error) {
        reject(error)
      }
    })
  }
}

const accountFactory = walletPassword => {
  return new Promise((resolve, reject) => {
    getCredentials(walletPassword)
      .then(res => resolve(new Account(res)))
      .catch(reject)
  })
}

module.exports = {
  Account,
  accountFactory
}
