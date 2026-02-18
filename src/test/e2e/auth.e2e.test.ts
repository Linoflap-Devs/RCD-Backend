import express from 'express'
import { createAdmin, createSD, createUM } from '../helpers/users.helpers'
import { seedDivisions, seedPositions } from '../helpers/seed.helpers'
import request from 'supertest'
import { db } from '../../db/db'
import { truncateAllTables, truncateTables } from '../helpers/db.helpers'

// Import your actual routes
import authRouter from '../../routes/auth.routes'
import agentRouter from '../../routes/agents.routes'
import usersRouter from '../../routes/users.routes'
import path from 'path'
import fs from 'fs'
import { IAgentRegistrationListItem, ITblAgentUser, ITblUsersWeb } from '../../types/auth.types'
import cookieParser from 'cookie-parser'
import { ITblDivision } from '../../types/division.types'

const app = express()

// Add necessary middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Mount your routes
app.use('/api/auth', authRouter)
app.use('/api/agents', agentRouter)
app.use('/api/users', usersRouter)

describe('Auth E2E Tests', () => {
    
    describe('POST /auth/approve-registration', () => {
        let agent: ReturnType<typeof request.agent> = request.agent(app)
        let agentRegistrationId = 0
        let umUser: ITblAgentUser = {} as ITblAgentUser
        let saUser: ITblUsersWeb = {} as ITblUsersWeb
        let agentUser: ITblAgentUser = {} as ITblAgentUser
        let division: ITblDivision = {} as ITblDivision

        beforeAll(() => {
            const fixtures = [
                'src/test/fixtures/profile.webp',
                'src/test/fixtures/govid.jpg',
                'src/test/fixtures/selfie.jpg'
            ]
            
            fixtures.forEach(file => {
                const fullPath = path.join(process.cwd(), file)
                if (!fs.existsSync(fullPath)) {
                    console.warn(`Warning: Test fixture not found: ${fullPath}`)
                }
            })
        })
    
        it('should create divisions', async () => {
            const result = await seedDivisions()
            
            division = result.data[0]
            expect(result.success).toBe(true)
        })
    
        it('should create positions', async () => {
            const result = await seedPositions()
    
            expect(result.success).toBe(true)
        })

        it('should create a UM user', async () => {
            const result = await createUM(1)

            umUser = result.data
            expect(result.success).toBe(true)
        })
    
        it('should create an SA user', async () => {
            const result = await createAdmin()
            saUser = result.data
            expect(result.success).toBe(true)
        })
    
        it('should register an agent', async () => {
            const response = await request(app)
                .post('/api/auth/register-agent')
                .field('firstName', 'John')
                .field('lastName', 'Doe')
                .field('gender', 'Male')
                .field('civilStatus', 'Single')
                .field('religion', 'Catholic')
                .field('birthdate', '2001-01-03')
                .field('birthplace', 'Manila')
                .field('address', 'Munoz St.')
                .field('telephoneNumber', '091232561')
                .field('contactNumber', '099234563')
                .field('sssNumber', 'SS123456281')
                .field('philhealthNumber', 'PH123426784')
                .field('pagibigNumber', 'PI123456721')
                .field('tinNumber', 'TN12345675')
                .field('prcNumber', 'PR123456781')
                .field('dshudNumber', 'DS123456784')
                .field('employeeIdNumber', 'EI123446785')
                .field('password', process.env.TESTING_PW || 'password')
                .field('email', 'sp@gmail.com')
                // Nested arrays - education
                .field('education[0][school]', 'KSU')
                .field('education[0][degree]', 'BSIT')
                .field('education[0][startDate]', '2020-04-05')
                .field('education[0][endDate]', '2024-01-03')
                // Nested arrays - experience
                .field('experience[0][company]', 'Company Inc.')
                .field('experience[0][jobTitle]', 'Software Engineer')
                .field('experience[0][startDate]', '2024-10-02')
                .field('experience[0][endDate]', '2025-05-04')
                // File attachments
                .attach('profileImage', 'src/test/fixtures/profile.webp')
                .attach('govId', 'src/test/fixtures/govid.jpg')
                .attach('selfie', 'src/test/fixtures/selfie.jpg')

            console.log('response', response.body.data)
                        
            agentRegistrationId = response.body.data.AgentRegistrationID
            expect(response.body.success).toBe(true)
        })

        it('should login the SA', async () => {
            const login = await agent
                .post('/api/auth/login-employee')
                .send({
                    username: saUser.UserName,
                    password: process.env.TESTING_PW || 'password'
                })

            expect(login.body.success).toBe(true)
        })

        it('should see the new registration', async () => {
            const result = await agent
                .get('/api/agents/registrations')

            console.log('agentRegistrationId', agentRegistrationId)
            console.log('agentRegistrationId', result.body.data.result[0])

            expect(result.statusCode).toBe(200)
            expect(result.body.success).toBe(true)
            expect(result.body.data.result[0].AgentRegistrationID == agentRegistrationId).toBe(true)
        })

        it('should approve the registration and assign the UM', async () => {
            const result = await agent
                .post('/api/auth/approve-registration')
                .send({
                    agentRegistrationId: agentRegistrationId,
                    unitManagerId: umUser.AgentID
                })

            expect(result.statusCode).toBe(200)
            expect(result.body.success).toBe(true)
        })
        
        it('should verify if the agent is assigned to the UM and Division', async () => {
            const newAgent = await db.selectFrom('Tbl_AgentUser')
                .where('Tbl_AgentUser.AgentRegistrationID', '=', agentRegistrationId)
                .selectAll()
                .executeTakeFirstOrThrow()

            const result = await agent
                .get('/api/agents/' + newAgent.AgentID)

            
            console.log(result.body.data)
            console.log(division.Division)
            console.log(umUser.AgentID)
            
            
            expect(result.statusCode).toBe(200)
            expect(result.body.data.agent.Division == division.Division).toBe(true)
            expect(result.body.data.agent.ReferredByID == umUser.AgentID).toBe(true)
        })
    })

    afterAll( async () => {
        const cleanup = await truncateAllTables()
        await db.destroy()
    })
})
