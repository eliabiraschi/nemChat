const nem = require('nem-sdk').default
const { Emitter } = require('./emitter')
const {
  concat,
  dissoc
} = require('ramda')
const {
  getAddress,
  hasValidConfig,
  descendingTransactions,
  getByteLen
} = require('./helpers')

const { CONFIG } = require('../config')

class nemClient extends Emitter {
  constructor(id, auth) {
    super(id, auth)

    if (hasValidConfig(auth)) {
      this._.auth = auth
      this.isConnected = false
  
      this.EVENTS = {
        NETWORK_ERROR: 'NETWORK_ERROR',
        BLOCK: 'BLOCK',
        RECENT_TRANSACTIONS: 'RECENT_TRANSACTIONS',
        ACCOUNT_INFO: 'ACCOUNT_INFO',
        UNCONFIRMED_TRANSACTION: 'UNCONFIRMED_TRANSACTION',
        CONFIRMED_TRANSACTION: 'CONFIRMED_TRANSACTION',
        ERROR: 'ERROR',
        CONNECTED: 'CONNECTED',
        DISCONNECTED: 'DISCONNECTED'
      }
    
      this.connector = nem.com.websockets.connector.create(CONFIG.wsEndpoint, this._.auth.address || getAddress(this._.auth.publicKey))
      this.connector.connect()
        .then(() => {
          this.emit(this.EVENTS.CONNECTED, null)
          this.isConnected = true
          nem.com.websockets.subscribe.errors(this.connector, res => this.emit(this.EVENTS.NETWORK_ERROR, res))
          nem.com.websockets.subscribe.chain.blocks(this.connector, res => this.emit(this.EVENTS.BLOCK, res))
          nem.com.websockets.subscribe.account.data(this.connector, res => {
            this._.accountData = res
            this.emit(this.EVENTS.ACCOUNT_INFO, res)
          })
          nem.com.websockets.subscribe.account.transactions.unconfirmed(this.connector, res => this.emit(this.EVENTS.UNCONFIRMED_TRANSACTION, res))
          nem.com.websockets.subscribe.account.transactions.confirmed(this.connector, res => this.emit(this.EVENTS.CONFIRMED_TRANSACTION, res))
          nem.com.websockets.subscribe.account.transactions.recent(this.connector, res => this.emit(this.EVENTS.RECENT_TRANSACTIONS, res.data))
          
          nem.com.websockets.requests.account.data(this.connector)
        })
        .catch(error => this.emit(this.EVENTS.ERROR, error))
    } else {
      this.emit(this.EVENTS.ERROR, 'auth invalid')
      this.destroy()
    }
    
  }
  
  _requestRecentTransactions () {
    return nem.com.websockets.requests.account.transactions.recent(this.connector)
  }
  _requestOutGoingTransactions (txHash) {
    return nem.com.requests.account.transactions.outgoing(CONFIG.apiEndpoint, this._.auth.address, txHash)
  }
  _requestIncomingTransactions (txHash) {
    return nem.com.requests.account.transactions.incoming(CONFIG.apiEndpoint, this._.auth.address, txHash)
  }
  _requestAllTransactions (txHash) {
    return nem.com.requests.account.transactions.all(CONFIG.apiEndpoint, this._.auth.address, txHash)
  }

  getAccountInfo () {
    return nem.com.requests.account.data(CONFIG.apiEndpoint, this._.auth.address)
  }

  prepareTransaction (props) {
    if (getByteLen(props.message.payload) > 512) {
      const error = new Error('FAILURE_MESSAGE_TOO_LARGE') 
      this.emit(this.EVENTS.ERROR, error)
      throw error
    } else {
      const common = nem.model.objects.create('common')('', this._.auth.privateKey)
      let transferTransaction = nem.model.objects.create('transferTransaction')(props.recipient, props.amount, props.message.payload)
      const transactionEntity = nem.model.transactions.prepare('transferTransaction')(common, transferTransaction, CONFIG.netId)
      transactionEntity.message = props.message
      return transactionEntity
    }
  }
  
  sendTransaction (transactionEntity) {
    const common = nem.model.objects.create('common')('', this._.auth.privateKey)
    return nem.model.transactions.send(common, transactionEntity, CONFIG.apiEndpoint)
  }

  prepareAndSendTransaction (props) {
    return this.sendTransaction(this.prepareTransaction(props))
  }

  async getAllTransactions (history = [], oldest = undefined) {
    try {
      let { data } = await this._requestAllTransactions(oldest)
      data = data.sort(descendingTransactions)
      if (!data[0] || oldest === data[0].meta.hash.data) return history
      return this.getAllTransactions(concat(data, history), data[0].meta.hash.data)
    } catch (error) {
      this.emit(this.EVENTS.ERROR, error)
      return history
    }
  }

  closeConnetion () {
    this.connector.close()
    this.emit(this.EVENTS.DISCONNECTED, null)
    this.isConnected = false
  }
}

module.exports = {
  nemClient,
}
