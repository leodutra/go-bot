const qrcode = require('qrcode-terminal')
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js')

const Chatbot = require('./Chatbot')

const SERVICE_HOSTNAME = process.env.SERVICE_HOSTNAME ?? 'http://127.0.0.1:8081'

const onQRReceived = qr => {
  console.log('QR received:')
  qrcode.generate(qr, { small: true })
}
const onAuthenticate = () => {
  console.log('Authenticated')
}

const onReady = () => console.log('Client is ready!')

const reply =
  ({ chatId, client }) =>
  async reply => {
    console.log('Reply', reply)
    if (reply.skipped) {
      return
    }
    if (reply.error) {
      await client.sendMessage(chatId, reply.text)
      return
    }
    if (reply.text) {
      console.log(`Replying to "${chatId}" with:\n${reply.text}\n`)
      await client.sendMessage(chatId, reply.text)
    }
    if (reply.images) {
      let fileCount = 1
      for (const replyImage of reply.images) {
        if (replyImage.imageData) {
          const { mimeType, content, name, extension } = replyImage.imageData
          await client.sendMessage(chatId, new MessageMedia(mimeType, content, `${fileCount++}-${name}.${extension}`))
        } else {
          await client.sendMessage(chatId, replyImage.url)
        }
      }
    }
  }

const handleMessage = (chatbot, client) => async message => {
  console.log(`Handling message\n`, message)

  if (message.type === 'chat') {
    const chatId = message.fromMe ? message.to : message.from
    try {
      await chatbot.invoke({ message: message.body, groupId: message.to }, reply({ chatId, client }))
    } catch (err) {
      console.error(err)
    }
  }
}

async function main() {
  const chatbot = new Chatbot({ platform: 'WhatsApp', serviceHost: SERVICE_HOSTNAME })
  const client = new Client({
    allowMsgFromMe: true,
    authStrategy: new LocalAuth({ clientId: 'chatbot' }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  })
  client.on('qr', onQRReceived)
  client.on('authenticated', onAuthenticate)
  client.on('ready', onReady)
  // client.on('message', handleMessage(chatbot, client))
  client.on('message_create', handleMessage(chatbot, client))
  client.initialize()
}

main().catch(error => {
  console.error(error)
  process.exit(error.code || error.statusCode || 1)
})
