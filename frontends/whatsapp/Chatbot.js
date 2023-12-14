const axios = require('axios')
const JSONStream = require('jsonstream')

const DEF_API = 'v1'
const DEF_RESOURCE = 'chatbot'
const DEF_COMMANDS_RESOURCE = 'commands'

const ERROR_MESSAGE = 'Ocorreu um erro, tente novamente mais tarde.'
const LOG_PREFIX = 'Chatbot:'

const logError = (...args) => console.error(LOG_PREFIX, ...args)
const hasCommand = str => str.match(/!\w/)
const hasSkip = str => str.match(/(?:^|\s)!skip(?:\s|$)/)
const log = (...args) => console.log(LOG_PREFIX, ...args)

class Chatbot {
  ERROR_MESSAGE = ERROR_MESSAGE

  constructor({ platform, serviceHost }) {
    if (!serviceHost) {
      throw new Error(`Missing serviceHost for ${Chatbot.name}`)
    }
    this.platform = platform
    this.serviceHost = serviceHost
  }

  async invoke({ message, groupId }, onReply) {
    const skip = async text => {
      log(text)
      await onReply([{ text, skipped: true }])
    }
    if (!hasCommand(message)) {
      return skip(`No command found on\n"${message}". Skipping.`)
    }
    if (hasSkip(message)) {
      return skip(`"!skip" found on\n"${message}". Skipping.`)
    }
    return this.#postInvocation({ message, groupId, onReply })
  }

  async #postInvocation({ message, groupId, onReply }) {
    const { platform, serviceHost } = this
    const endpoint = `${serviceHost}/${DEF_API}/${DEF_RESOURCE}`

    return new Promise(async (resolve, reject) => {
      const rejectWithError = error => {
        logError(error)
        reject(error)
      }

      let stream
      try {
        const response = await axios.post(endpoint, { message, groupId, platform }, { responseType: 'stream' })
        stream = response.data
      } catch (error) {
        rejectWithError(error)
        return
      }

      const jsonStream = JSONStream.parse()
      stream.pipe(jsonStream)

      const replyPromises = []

      jsonStream.on('data', data => {
        console.log('received data (stream)', data)
        replyPromises.push(onReply(data))
      })

      jsonStream.on('error', rejectWithError)

      jsonStream.on('close', () => {
        console.log('JSON stream was closed')
        Promise.all(replyPromises).then(resolve).catch(rejectWithError)
      })
    })
  }
}

module.exports = Chatbot
