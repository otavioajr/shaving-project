import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildApp } from '../src/app.js'

let app: Awaited<ReturnType<typeof buildApp>> | null = null

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Initialize Fastify app once (reused across invocations in same container)
  if (!app) {
    app = await buildApp({ logger: false })
    await app.ready()
  }

  // Use Fastify's raw request/response handling
  await app.ready()
  app.server.emit('request', req, res)
}
