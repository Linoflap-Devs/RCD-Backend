import express from 'express'
import { createAdmin, createSD, createSP, createUM } from '../helpers/users.helpers'
import { seedDivisions, seedPositions } from '../helpers/seed.helpers'
import request from 'supertest'
import { db } from '../../db/db'
import { truncateAllTables, truncateTables } from '../helpers/db.helpers'

// Import your actual routes
import authRouter from '../../routes/auth.routes'
import agentRouter from '../../routes/agents.routes'
import { IAgentRegistrationListItem, ITblAgentUser, ITblUsersWeb } from '../../types/auth.types'
import cookieParser from 'cookie-parser'

const app = express()

// Add necessary middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Mount your routes
app.use('/api/auth', authRouter)
app.use('/api/agents', agentRouter)

describe('Agents E2E Test', () => {
    describe('PATCH /new/agent/:agentId/promote', () => {
        const agent = request.agent(app)
        let umUser: ITblAgentUser = {} as ITblAgentUser
        let spUser: ITblAgentUser = {} as ITblAgentUser
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

        it('should create an admin user', async () => {
            const admin = await createAdmin()
            adminUser = admin.data
            expect(admin.success).toBe(true)
        })

        it('should login the admin', async () => {
            const login = await agent
                .post('/api/auth/login-employee')
                .send({
                    username: adminUser.UserName,
                    password: process.env.TESTING_PW || 'password'
                })

            expect(login.statusCode).toBe(200)
        })

        it('should promote an SP', async () => {
            const result = await agent
                .patch('/api/agents/new/' + spUser.AgentID + '/promote')
                .send({ positionID: 86 })

            console.log(result)
            console.log(result.body)
            console.log(result.statusCode)
            expect(result.statusCode).toBe(200)
        })

        it('should remove the referred by and id from the SP', async () => {
            const result = await agent
                .get('/api/agents/' + spUser.AgentID)
            
            expect(result.statusCode).toBe(200)
            expect(result.body.data.ReferredByID).toBeFalsy()
            expect(result.body.data.ReferredCode).toBeFalsy()
        })

        afterAll(async() => {
            const cleanupDb = await truncateAllTables()
            await db.destroy()
        })
    })
})