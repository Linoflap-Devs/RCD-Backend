import { DB } from './db-types' // this is the Database interface we defined earlier
import * as tedious from 'tedious'
import * as tarn from 'tarn'
import { Kysely, MssqlDialect } from 'kysely'

const dialect = new MssqlDialect({
  tarn: {
    ...tarn,
    options: {
      min: 0,
      max: 10,
    },
  },
  tedious: {
    ...tedious,
    connectionFactory: () => new tedious.Connection({
      authentication: {
        options: {
          password: process.env.DATABASE_PASSWORD,
          userName: process.env.DATABASE_USER,
        },
        type: 'default',
      },
      options: {
        database: 'RCDR2Stage',
        port: 1433, 
        trustServerCertificate: true,
      },
      server: process.env.DATABASE_SERVER || 'localhost',
    }),
  },
})

// Database interface is passed to Kysely's constructor, and from now on, Kysely 
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how 
// to communicate with your database.
export const db = new Kysely<DB>({
  dialect,
})