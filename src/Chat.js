const {
  dissoc,
  concat,
  merge,
  has
} = require('ramda')

const { nemClient } = require('./libs/nemClient')

const {
  descendingTransactions,
  formatValue,
  encodeMessage,
  parseData,
  getCredentials,
  getAccountData
} = require('./libs/helpers')

class Chat extends nemClient {
  constructor(auth, counterpart) {
    super('chatClient', auth)

    if (counterpart) {
      this._.counterpart = counterpart
  
      this.EVENTS.MESSAGE = 'MESSAGE'
      this.EVENTS.MESSAGE_INCOMING = 'MESSAGE_INCOMING'
      this.EVENTS.RECENT_MESSAGES = 'RECENT_MESSAGES'
      this.EVENTS.MESSAGE_SENDING = 'MESSAGE_SENDING'
  
      const parseCurried = parseData(this._.auth.privateKey, this._.counterpart.publicKey)
      
      this.on(this.EVENTS.CONFIRMED_TRANSACTION, data => {
        this.emit(this.EVENTS.MESSAGE, parseCurried(data.transaction))
      })
  
      this.on(this.EVENTS.UNCONFIRMED_TRANSACTION, data => {
        if (data.transaction.signer === this._.counterpart.publicKey) this.emit(this.EVENTS.MESSAGE_INCOMING, parseCurried(data))
        else if (data.transaction.recipient === this._.counterpart.address) this.emit(this.EVENTS.MESSAGE_SENDING, parseCurried(data))
      })
  
      this.on(this.EVENTS.RECENT_TRANSACTIONS, data => {
        data
          .filter(entry => entry.transaction.signer === this._.counterpart.publicKey)
          .sort(descendingTransactions)
          .forEach(entry => {
            this.emit(this.EVENTS.RECENT_MESSAGES, parseCurried(entry))
          })
      })

    } else {
      this.emit(this.EVENTS.ERROR, 'invalid recipient address')
      this.destroy()
    }
    
  }

  _prepareMessage (payload, amount = 0, isEncrypted = true) {
    const toEncode = (isEncrypted && this._.counterpart.publicKey)
    const message = {
      payload: toEncode ? encodeMessage(this._.auth.privateKey, this._.counterpart.publicKey, payload) : payload,
      type: toEncode ? 2 : 1
    }
    return {
      recipient: this._.counterpart.address,
      amount,
      message
    }
  }
  
  async getHistory (history = [], oldest = undefined) {
    const parseCurried = parseData(this._.auth.privateKey, this._.counterpart.publicKey)
    const res = await this.getAllTransactions()
    return res.filter(entry => (entry.transaction.recipient === this._.counterpart.address || entry.transaction.signer === this._.counterpart.publicKey)).map(parseCurried)
  }

  sendMessage (payload, amount = 0, isEncrypted = true) {
    return this.prepareAndSendTransaction(this._prepareMessage(payload, amount, isEncrypted))
  }

  getMessageFee (payload, amount = 0, isEncrypted = true) {
    const { fee } = this.prepareTransaction(this._prepareMessage(payload, amount, isEncrypted))
    return formatValue(fee)
  }
}

const chatFactory = (walletPassword, counterpartAddress) => {
  return new Promise(async (resolve, reject) => {
    try {
      const wallet = await getCredentials(walletPassword)
      const { meta, account } = await getAccountData(counterpartAddress)
      const counterpart = merge(meta, account)
      if(counterpart.publicKey === null) reject('invalidRecipientAddress')
      else resolve(new Chat(wallet, counterpart))
    } catch (error) {
      reject(error)
    }
  })
}

module.exports = {
  Chat,
  chatFactory
}
