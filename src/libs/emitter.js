const { EventEmitter } = require('eventemitter3')

class Emitter extends EventEmitter {
  constructor (id = '') {
    super()
    this.id = id
    this._ = {}
    this.active = true
  }
  emit (name, ...args) {
    if (!this.active) return
    args.unshift(name)
    super.emit.apply(this, args)
  }
  destroy () {
    this.emit('destroy')
    this.active = false
  }
}

module.exports = {
  Emitter
}
