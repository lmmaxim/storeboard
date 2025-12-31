import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY is not set')
  }

  const buffer = Buffer.from(key, 'hex')
  if (buffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 32-byte hex string')
  }

  return buffer
}

export function encryptCredentials(payload: object): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)

  const json = JSON.stringify(payload)
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptCredentials<T>(encrypted: string): T {
  const [ivHex, authTagHex, dataHex] = encrypted.split(':')

  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error('Invalid encrypted credential format')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)

  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ])

  return JSON.parse(decrypted.toString('utf8')) as T
}

