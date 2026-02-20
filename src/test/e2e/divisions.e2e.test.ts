import express from 'express'
import { createAdmin, createSD, createSP, createSPs, createUM } from '../helpers/users.helpers'
import { seedDivisionRequests, seedDivisions, seedPositions } from '../helpers/seed.helpers'
import request from 'supertest'
import { db } from '../../db/db'
import { truncateAllTables, truncateTables } from '../helpers/db.helpers'

// Import your actual routes
import authRouter from '../../routes/auth.routes'
import agentRouter from '../../routes/agents.routes'
import divisionsRouter from '../../routes/division.routes'
import { IAgentRegistrationListItem, ITblAgentUser, ITblUsersWeb } from '../../types/auth.types'
import cookieParser from 'cookie-parser'
import { ITblAgent } from '../../types/agent.types'

const app = express()

// Add necessary middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Mount your routes
app.use('/api/auth', authRouter)
app.use('/api/agents', agentRouter)
app.use('/api/divisions', divisionsRouter)

describe('Divisions E2E Test', () => {
    
    describe('GET /requests', () => {
        const sdAgent = request.agent(app)
        const umAgent = request.agent(app)
        let spUser: ITblAgentUser = {} as ITblAgentUser
        let umUser: ITblAgentUser = {} as ITblAgentUser
        let sdUser: ITblAgentUser = {} as ITblAgentUser
        let adminUser: ITblUsersWeb = {} as ITblUsersWeb

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

        it('should create a SD user', async () => {
            const sd = await createSD(1)
            sdUser = sd.data
            expect(sd.success).toBe(true)
        })

        it('should create a SP user', async () => {

            const um = await db.selectFrom('Tbl_Agents')
                .where('Tbl_Agents.AgentID', '=', umUser.AgentID)
                .selectAll()
                .executeTakeFirstOrThrow()

            if(!um.AgentID || !um.AgentCode) {
                throw new Error('SD user not found')
            }

            const sp = await createSP(1, um.AgentID, um.AgentCode)
            spUser = sp.data

            const spAgent = await db.selectFrom('Tbl_Agents')
                .where('Tbl_Agents.AgentID', '=', spUser.AgentID)
                .selectAll()
                .executeTakeFirstOrThrow()

            
            expect(sp.success).toBe(true)
            expect(spAgent.ReferredByID === um.AgentID).toBe(true)
            expect(spAgent.ReferredCode === um.AgentCode).toBe(true)
        })

        it('should seed division requests', async () => {
            const result = await seedDivisionRequests({
                divisionId: 1,
                unitManagerId: umUser.AgentID || 1,
                agentId: spUser.AgentID || 1,
                amount: 10,
                isApproved: false
            })

            const result2 = await seedDivisionRequests({
                divisionId: 1,
                unitManagerId: 2,
                agentId: spUser.AgentID || 1,
                amount: 10,
                isApproved: false,
                idOffset: result.data.length
            })

            expect(result.success).toBe(true)
        })

        it('should login the UM', async () => {
            const login = await umAgent
                .post('/api/auth/login-agent')
                .send({
                    email: umUser.Email,
                    password: process.env.TESTING_PW || 'password'
                })

            expect(login.statusCode).toBe(200)
        })

        it('should see the list of UM requests for divisions', async () => {
            const result = await umAgent
                .get('/api/divisions/requests')
                .query({ page: 1, pageSize: 20 })

            expect(result.statusCode).toBe(200)
            expect(result.body.data.results.length).toBe(10)
        })

        it('should login the SD', async () => {
            const login = await sdAgent
                .post('/api/auth/login-agent')
                .send({
                    email: sdUser.Email,
                    password: process.env.TESTING_PW || 'password'
                })
        })

        it('should see all division requests', async () => {
            const result = await sdAgent
                .get('/api/divisions/requests')
                .query({ page: 1, pageSize: 20 })

            expect(result.statusCode).toBe(200)
            expect(result.body.data.results.length).toBe(20)
        })

        it('should limit the page size', async () => {
            const result = await sdAgent
                .get('/api/divisions/requests')
                .query({ page: 1, pageSize: 5 })

            expect(result.statusCode).toBe(200)
            expect(result.body.data.results.length).toBeLessThanOrEqual(5)
        })

        afterAll(async () => {
            await truncateAllTables()
        })
    })

    afterAll(async () => {
        await db.destroy()
    })
})