const nem = require('nem-sdk').default
const inquirer = require('inquirer')
const readline = require('readline')
const prettyjson = require('prettyjson')
const chalk = require('chalk')
const { has } = require('ramda')

const { chatFactory } = require('../src/Chat')
const { accountFactory } = require('../src/Account')

const displayMessage = message => {
  if (has('error', message)) return console.error(prettyjson.render(message.error))

  const text = {
    recieved: chalk.blue,
    sent: chalk.yellow
  }
  
  const amount = {
    recieved: chalk.green,
    sent: chalk.red
  }

  const recivedVsSent = message.isIncoming ? 'recieved' : 'sent'
  const arrow = message.isIncoming ? '>>>>>>>' : '<<<<<<<'
  const extra = amount[recivedVsSent](message.amount > 0 ? ` (${recivedVsSent} ${nem.utils.format.nemValue(message.amount)} XEM)` : '')
  console.log(text[recivedVsSent](`${arrow} ${message.timeStamp}`))
  console.log(text[recivedVsSent].bold(`${arrow} ${message.message}`) + extra)
}

const displayJSON = message => {
  console.log('-------------------')
  console.log(prettyjson.render(message))
}

async function displayChat (chat) {
  const res = await chat.getHistory()
  res.forEach(displayMessage)
}

function sendMessage (chat, message, amount = 0, isEncripted = true) {
  chat.sendMessage(message, amount, isEncripted)
    .then(res => {
      if (res.code !== 1) {
        console.error(res.message)
      }
    })
    .catch(error => {
      console.error(error)
    })
}

function displayPrompt (chat) {
  inquirer.prompt([{
    type: 'input',
    name: 'message',
    message: 'Message: '
  },
  {
    type: 'input',
    name: 'amount',
    message: 'Amount in XEM: ',
    default: 0
  },
  {
    type: 'input',
    name: 'isEncripted',
    message: 'Encript: ',
    default: 'y'
  }])
  .then(answers => {
    const fee = chat.getMessageFee(answers.message, answers.amount, answers.isEncripted === 'y')
    const confirmSending = [{
      type: 'input',
      name: 'confirm',
      message: `Message fee ${fee}XEM - send?`,
      default: 'y'
    }]
    inquirer.prompt(confirmSending)
      .then(res => {
        if (res.confirm === 'y') sendMessage(chat, answers.message, answers.amount, answers.isEncripted === 'y')
        else console.log('Aborted.')
      })
  })
  .catch(error => console.error(error))
}

function init(Chat) {

  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)

  process.stdin.on('keypress', (ch, key) => {
    if (key.ctrl && key.name === 'c') {
      process.exit()
    } else if (key.ctrl && key.name === 'n') {
      displayPrompt(Chat)
    } else if (key.ctrl && key.name === 'r') {
      displayChat(Chat)
    } else if (key.ctrl && key.name === 'a') {
      console.log(prettyjson.render(Chat.getAccountData()))
    }
  })

  Chat.on(Chat.EVENTS.MESSAGE, displayMessage)
  Chat.on(Chat.EVENTS.MESSAGE_INCOMING, data => {
    console.log('(incoming message)')
  })
  Chat.on(Chat.EVENTS.MESSAGE_SENDING, data => {
    console.log('(sending message)')
  })
  Chat.on(Chat.EVENTS.CONNECTED, () => {
    displayChat(Chat)
  })

}

chatFactory('serveunafrasetantolungaetantoinutile1234', 'TCKQF4APDJA3SS4S3627RZYAW6KD2KTH7EGDFPTF')
  .then(init)
  .catch(error => console.error(error))

/*accountFactory('serveunafrasetantolungaetantoinutile1234')
  .then(Account => {
    Account.on(Account.EVENTS.CONNECTED, async () => {
      const res = await Account.getPayments()
      console.log(prettyjson.render(Account.getAccountData()))
      res.forEach(displayJSON)
    })
  })
  .catch(error => console.error(error))
*/