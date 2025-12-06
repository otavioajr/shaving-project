import { buildApp } from './app.js'

const PORT = parseInt(process.env.PORT || '3000', 10)
const HOST = process.env.HOST || '0.0.0.0'

async function start() {
  const app = await buildApp({ logger: true })

  try {
    await app.listen({ port: PORT, host: HOST })
    app.log.info(`Server running at http://${HOST}:${PORT}`)
    app.log.info(`API Documentation at http://${HOST}:${PORT}/docs`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
