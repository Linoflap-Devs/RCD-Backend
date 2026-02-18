import { DB } from './db-types'
import * as tedious from 'tedious'
import * as tarn from 'tarn'
import { Kysely, MssqlDialect } from 'kysely'
import 'dotenv/config'

const isTesting = process.env.NODE_ENV === 'testing'

const getEnvVar = (key: string): string => {
  const prefix = isTesting ? 'TESTING_' : ''
  return process.env[`${prefix}${key}`] || (key === 'DATABASE_SERVER' ? 'localhost' : '')
}

const dialect = new MssqlDialect({
  tarn: {
    ...tarn,
    options: {
      min: 0,
      max: 10,
      propagateCreateError: true,
    },
  },
  tedious: {
    ...tedious,
    connectionFactory: () => new tedious.Connection({
      authentication: {
        options: {
          password: getEnvVar('DATABASE_PASSWORD'),
          userName: getEnvVar('DATABASE_USER'),
        },
        type: 'default',
      },
      options: {
        database: getEnvVar('DATABASE_NAME'),
        port: getEnvVar('DATABASE_PORT') ? Number(getEnvVar('DATABASE_PORT')) : 1433,
        trustServerCertificate: true,
      },
      server: getEnvVar('DATABASE_SERVER'),
    }),
  },
})

export const db = new Kysely<DB>({
  dialect,
  log: ['error'],
})