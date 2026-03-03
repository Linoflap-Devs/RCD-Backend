import express from 'express'
import { createAdmin, createSD, createSP, createSPs, createUM } from '../../helpers/users.helpers'
import { seedDivisions, seedPositions } from '../../helpers/seed.helpers'
import request from 'supertest'
import { db } from '../../../db/db'
import { truncateAllTables, truncateTables } from '../../helpers/db.helpers'

// Import your actual routes
import authRouter from '../../../routes/auth.routes'
import agentRouter from '../../../routes/agents.routes'
import salesRouter from '../../../routes/sales.routes'
import { IAgentRegistrationListItem, ITblAgentUser, ITblUsersWeb } from '../../../types/auth.types'
import cookieParser from 'cookie-parser'
import { ITblAgent } from '../../../types/agent.types'
import { after } from 'node:test'
import { createPendingSale } from '../../helpers/sales.helpers'
import { ITblAgentPendingSales } from '../../../types/sales.types'

const app = express()

// Add necessary middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Mount your routes
app.use('/api/auth', authRouter)
app.use('/api/agents', agentRouter)
app.use('/api/sales', salesRouter)

describe('Sales E2E Test', () => {
    describe('DELETE /api/sales/pending/web/archive/:pendingSalesId', () => {

        let saUserAccount: ITblUsersWeb = {} as ITblUsersWeb  
        const agent = request.agent(app)

        let pendingSale: ITblAgentPendingSales = {} as ITblAgentPendingSales

        it('should create divisions', async () => {
            const divisions = await seedDivisions()

            expect(divisions.success).toBe(true)
        })

        it('should create positions', async () =>{
            const positions = await seedPositions()

            expect(positions.success).toBe(true)
        })

        it('should create an SA user', async () => {
            const saUser = await createAdmin()

            saUserAccount = saUser.data
            expect(saUser.success).toBe(true)
        })

        it('should create a pending sale with approval status of 4', async () => {
            const pendingSaleData = await createPendingSale({
                SalesStatus: 'PENDING APPROVAL - BRANCH HEAD',
                ApprovalStatus: 4
            })

            pendingSale = pendingSaleData.data
            expect(pendingSaleData.success).toBe(true)
        })

        it('should login the SA user', async () => {
            const result = await agent
                .post('/api/auth/login-employee')
                .send({
                    username: saUserAccount.UserName,
                    password: process.env.TESTING_PW || ''
                })

            expect(result.status).toBe(200)
            expect(result.body.success).toBe(true)
        })

        it('should see the pending sale', async () => {
            const result = await agent
                .get('/api/sales/web/pending')

            console.log(result.body)
            
            expect(result.status).toBe(200)
            expect(result.body.success).toBe(true)
            expect(result.body.data.length).toBeGreaterThan(0)
            expect(result.body.data.some((sale: ITblAgentPendingSales) => sale.AgentPendingSalesID === pendingSale.AgentPendingSalesID)).toBe(true)
        }, 20000)

        it('should archive the pending sale', async () => {
            const result = await agent
                .delete(`/api/sales/pending/web/archive/${pendingSale.AgentPendingSalesID}`)

            console.log(result.body)

            expect(result.status).toBe(200)
        })

        it('should not see the archived pending sale in the pending sales list', async () => {
            const result = await agent
                .get('/api/sales/web/pending')

            console.log(result.body)

            expect(result.status).toBe(200)
            expect(result.body.success).toBe(true)
            expect(result.body.data.length).toBe(0)
        }, 20000)


        afterAll( async () => {
            await truncateAllTables()
        })
    })

    afterAll(async () => {
        await db.destroy()
    })
})