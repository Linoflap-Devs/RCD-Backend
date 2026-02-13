import express from 'express'
import { createAdmin, createHandsOffBroker, createSD, createUM } from '../helpers/users.helpers'
import { seedDivisions, seedPositions } from '../helpers/seed.helpers'
import request from 'supertest'
import { db } from '../../db/db'
import { truncateAllTables } from '../helpers/db.helpers'

// Import your actual routes
import authRouter from '../../routes/auth.routes'
import usersRouter from '../../routes/users.routes'
import cookieParser from 'cookie-parser'
import { ITblAgentUser, ITblBrokerUser } from '../../types/auth.types'

const app = express()

// Add necessary middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Mount your routes
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)

describe('Users E2E Test', () => {
    describe('PATCH /user-ids', () => {

        const updateData: {IdType: string, IdNumber: string}[] = [
            {
                IdType: 'SSSNumber',
                IdNumber: 'SSS123456789'
            },
            {
                IdType: 'PhilhealthNumber',
                IdNumber: 'PH123456789'
            },
            {
                IdType: 'PagIbigNumber',
                IdNumber: 'PI123456789'
            },
            {
                IdType: 'TINNumber',
                IdNumber: 'TIN123456789'
            }
        ]

        const agent = request.agent(app)
        let umUser: ITblAgentUser = {} as ITblAgentUser

        it('should seed divisions', async () => {
            const divisions = await seedDivisions()
            expect(divisions.success).toBe(true)
        })

        it('should seed positions', async () => {
            const positions = await seedPositions()
            expect(positions.success).toBe(true)
        })

        it('should create a UM user', async () => {
            const um = await createUM(1)
            umUser = um.data
            expect(um.success).toBe(true)
        })

        it('should login the UM user', async () => {
            const login = await agent
                .post('/api/auth/login-agent')
                .send({
                    email: umUser.Email,
                    password: process.env.TESTING_PW || 'password'
                })

            console.log(login.body)

            expect(login.statusCode).toBe(200)
        })

        it('should edit gov ids', async () => {

            const result = await agent
                .patch('/api/users/user-ids')
                .send(updateData)

            expect(result.statusCode).toBe(200)
        })

        it('should reject unauthorized calls', async () => {
            const result = await request(app)
                .patch('/api/users/user-ids')
                .send(updateData)

            expect(result.statusCode).toBe(401)
        })

        it('should reject unknown ID types', async () => {
            const result = await agent
                .patch('/api/users/user-ids')
                .send([
                    {
                        IdType: 'PRCID',
                        IdNumber: '123'
                    }
                ])

            expect(result.statusCode).toBe(400)
        })

        it('should reject non-arrays', async () => {
            const result = await agent
                .patch('/api/users/user-ids')
                .send({
                    IdType: 'PRCID',
                    IdNumber: '123'
                })

            expect(result.statusCode).toBe(400)
        })

        it('should reject different data formats', async () => {
            const result = await agent
                .patch('/api/users/user-ids')
                .send([
                    {
                        IdName: 'PRCID',
                        IdValue: '123'
                    }
                ])

            expect(result.statusCode).toBe(400)
        })

        afterAll(async() => {
            const cleanupDb = await truncateAllTables()
            await db.destroy()
        })
    })

    describe.only('PATCH /broker-ids', () => {

        const updateData: {IdType: string, IdNumber: string}[] = [
            {
                IdType: 'SSSNumber',
                IdNumber: 'SSS123456789'
            },
            {
                IdType: 'PhilhealthNumber',
                IdNumber: 'PH123456789'
            },
            {
                IdType: 'PagIbigNumber',
                IdNumber: 'PI123456789'
            },
            {
                IdType: 'TINNumber',
                IdNumber: 'TIN123456789'
            }
        ]

        const agent = request.agent(app)
        let brokerUser: ITblBrokerUser = {} as ITblBrokerUser

        it('should seed divisions', async () => {
            const divisions = await seedDivisions()
            expect(divisions.success).toBe(true)
        })

        it('should seed positions', async () => {
            const positions = await seedPositions()
            expect(positions.success).toBe(true)
        })

        it('should create a Hands-Off Broker user', async () => {
            const broker = await createHandsOffBroker()
            brokerUser = broker.data
            expect(broker.success).toBe(true)
        })

        it('should login the Broker user', async () => {
            const login = await agent
                .post('/api/auth/login-broker')
                .send({
                    email: brokerUser.Email,
                    password: process.env.TESTING_PW || 'password'
                })

            console.log(login.body)

            expect(login.statusCode).toBe(200)
            // Add this to debug - check if cookies are being set
            console.log('Login cookies:', login.headers['set-cookie'])
        })

        it('should edit gov ids', async () => {

            const result = await agent
                .patch('/api/users/broker-ids')
                .send(updateData)

            console.log(result.body)

            expect(result.statusCode).toBe(200)
        })

        it('should reject unauthorized calls', async () => {
            const result = await request(app)
                .patch('/api/users/broker-ids')
                .send(updateData)

            expect(result.statusCode).toBe(401)
        })

        it('should reject unknown ID types', async () => {
            const result = await agent
                .patch('/api/users/broker-ids')
                .send([
                    {
                        IdType: 'PRCID',
                        IdNumber: '123'
                    }
                ])

            expect(result.statusCode).toBe(400)
        })

        it('should reject non-arrays', async () => {
            const result = await agent
                .patch('/api/users/broker-ids')
                .send({
                    IdType: 'PRCID',
                    IdNumber: '123'
                })

            expect(result.statusCode).toBe(400)
        })

        it('should reject different data formats', async () => {
            const result = await agent
                .patch('/api/users/broker-ids')
                .send([
                    {
                        IdName: 'PRCID',
                        IdValue: '123'
                    }
                ])

            expect(result.statusCode).toBe(400)
        })

        afterAll(async() => {
            const cleanupDb = await truncateAllTables()
            await db.destroy()
        })
    })
})