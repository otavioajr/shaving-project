import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

beforeAll(async () => {
  // Global setup before all tests
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long'
})

afterAll(async () => {
  // Global cleanup after all tests
})

beforeEach(async () => {
  // Setup before each test
})

afterEach(async () => {
  // Cleanup after each test
})
