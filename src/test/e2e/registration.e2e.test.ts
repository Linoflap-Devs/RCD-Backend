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
import { IAgentRegistrationListItem } from '../../types/auth.types'
import cookieParser from 'cookie-parser'

const app = express()

// Add necessary middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Mount your routes
app.use('/api/auth', authRouter)
app.use('/api/agents', agentRouter)
app.use('/api/users', usersRouter)

describe('Registration Flow Test', () => {
    
    describe('Mobile Registration test', () => {
    
        let agent: ReturnType<typeof request.agent> = request.agent(app)
        let agentRegistrationId = 0
    
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
    
            expect(result.success).toBe(true)
        })
    
        it('should create positions', async () => {
            const result = await seedPositions()
    
            expect(result.success).toBe(true)
        })
    
        it('should create an SA user', async () => {
            const saUser = await createAdmin()
    
            expect(saUser.success).toBe(true)
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
            
            expect(response.body.success).toBe(true)
            console.log(response.body)
        })
    
        it('should reject the unapproved agent login', async () => {
            const response = await request(app)
                .post('/api/auth/login-agent')
                .send({
                    email: 'sp@gmail.com',
                    password: process.env.TESTING_PW || 'password'
                })
            console.log("status code: ", response.statusCode)
            console.log("req body: ", response.body)
                
            expect(response.body.success).toBe(false)
        })
    
        it('should login an sales admin', async () => {
            const response = await agent
                .post('/api/auth/login-employee')
                .send({
                    username: 'admin',
                    password: process.env.TESTING_PW || 'password'
                })
            console.log("status code: ", response.statusCode)
            console.log("req body: ", response.body)
                
            expect(response.body.success).toBe(true)
        })
    
        it('should see the agent from the registration list', async () => {
    
            const response = await agent
                .get('/api/agents/registrations')
                .query({page: 1, pageSize: 5})
    
            console.log(response.statusCode)
            console.log(response.body.data)
    
            expect(response.body.success).toBe(true)
            expect(response.body.data.result.some((agent: IAgentRegistrationListItem) => agent.Email === 'sp@gmail.com')).toBe(true)
    
            agentRegistrationId = response.body.data.result[0].AgentRegistrationID
        })
    
        it('should approve the agent registration', async () => {
            const response = await agent
                .post('/api/auth/approve-registration')
                .send({agentRegistrationId: agentRegistrationId})
    
            expect(response.body.success).toBe(true)
            console.log(response.body)
        })
    
        it('should login the agent', async () => {
            const response = await request(app)
                .post('/api/auth/login-agent')
                .send({
                    email: 'sp@gmail.com',
                    password: process.env.TESTING_PW || 'password'
                })
            console.log("status code: ", response.statusCode)
            console.log("req body: ", response.body)
            console.log("cookies: ", response.headers['set-cookie'])
                
            expect(response.body.success).toBe(true)
        })
    })
    
    describe('Email Invitation test', () => {
    
        let agentUM: ReturnType<typeof request.agent> = request.agent(app)
        let agentSA: ReturnType<typeof request.agent> = request.agent(app)
        let agentRegistrationId = 0
        let inviteToken = ''
    
         it('should create divisions', async () => {
            const result = await seedDivisions()
    
            expect(result.success).toBe(true)
        })
    
        it('should create positions', async () => {
            const result = await seedPositions()
    
            expect(result.success).toBe(true)
        })
    
        it('should create an UM user', async () => {
            const umUser = await createUM(1)
    
            expect(umUser.success).toBe(true)
        })
    
        it('should create an SA user', async () => {
            const saUser = await createAdmin()
    
            expect(saUser.success).toBe(true)
        })
    
        it('should login the UM', async () => {
            const response = await agentUM
                .post('/api/auth/login-agent')
                .send({
                    email: 'um@gmail.com',
                    password: process.env.TESTING_PW || 'password'
                })
            console.log("status code: ", response.statusCode)
            console.log("req body: ", response.body)
            console.log("cookies: ", response.headers['set-cookie'])
                
            expect(response.body.success).toBe(true)
        })
    
        it('should send an invite to a new email', async () => {
            const response = await agentUM
                .post('/api/users/invite-user')
                .send({
                    email: 'sp@thisemaildoesnotexist.com'
                })
            
            expect(response.body.success).toBe(true)
    
            inviteToken = response.body.data.inviteToken
        }, 30000)

        it('should reject incomplete registration form', async () => {
            const response = await request(app)
                .post('/api/auth/register-invite')
                .field('firstName', 'John')
                .field('email', 'sp@thisemaildoesnotexist.com')
                .field('password', process.env.TESTING_PW || 'password')
                .field('inviteToken', inviteToken)
    
            expect(response.body.success).toBe(false)
            expect(response.statusCode).toBe(400)
        })
    
        it('should reject invalid invite token', async () => {
            const response = await request(app)
                .post('/api/auth/register-invite')
                .field('firstName', 'John')
                .field('middleName', 'Doe')
                .field('lastName', 'Doe')
                .field('gender', 'Male')
                .field('birthdate', '1990-01-01')
                .field('address', '123 Main St')
                .field('email', 'sp@thisemaildoesnotexist.com')
                .field('password', process.env.TESTING_PW || 'password')
                .field('inviteToken', 'invalid-token')
    
            expect(response.body.success).toBe(false)
            expect(response.statusCode).toBe(400)
        })

        it('should reject emails not matching with invited email', async () => {
            const response = await request(app)
                .post('/api/auth/register-invite')
                .field('firstName', 'John')
                .field('middleName', 'Doe')
                .field('lastName', 'Doe')
                .field('gender', 'Male')
                .field('birthdate', '1990-01-01')
                .field('address', '123 Main St')
                .field('email', 'wrongemail@thisemaildoesnotexist.com')
                .field('password', process.env.TESTING_PW || 'password')
                .field('inviteToken', inviteToken)
    
            expect(response.body.success).toBe(false)
            expect(response.statusCode).toBe(400)
        })
    
        it('should submit a new registration form with the token', async () => {
            const response = await request(app)
                .post('/api/auth/register-invite')
                .field('firstName', 'John')
                .field('middleName', 'Doe')
                .field('lastName', 'Doe')
                .field('gender', 'Male')
                .field('birthdate', '1990-01-01')
                .field('address', '123 Main St')
                .field('email', 'sp@thisemaildoesnotexist.com')
                .field('password', process.env.TESTING_PW || 'password')
                .field('inviteToken', inviteToken)
    
            expect(response.body.success).toBe(true)
        })
    
        it('should see the registration in the UM list', async () => {
            const response = await agentUM
                .get('/api/users/invited')
                .query({page: 1, pageSize: 5})
    
            expect(response.body.success).toBe(true)
            expect(response.body.data.some((agent: IAgentRegistrationListItem) => agent.Email === 'sp@thisemaildoesnotexist.com')).toBe(true)
        })
    
        it('should approve the registration (UM)', async () => {
            const response = await agentUM
                .post('/api/auth/approve-invite-um')
                .send({inviteToken: inviteToken})
            
            expect(response.body.success).toBe(true)
            console.log(response.body)
        })
    
        it('should reject the unapproved agent login', async () => {
            const response = await request(app)
                .post('/api/auth/login-agent')
                .send({
                    email: 'sp@thisemaildoesnotexist.com',
                    password: process.env.TESTING_PW || 'password'
                })
            console.log("status code: ", response.statusCode)
            console.log("req body: ", response.body)
                
            expect(response.body.success).toBe(false)
        })
    
        it('should login an sales admin', async () => {
            const response = await agentSA
                .post('/api/auth/login-employee')
                .send({
                    username: 'admin',
                    password: process.env.TESTING_PW || 'password'
                })
            console.log("status code: ", response.statusCode)
            console.log("req body: ", response.body)
                
            expect(response.body.success).toBe(true)
        })
    
        it('should see the agent from the registration list', async () => {
    
            const response = await agentSA
                .get('/api/agents/registrations')
                .query({page: 1, pageSize: 5})
    
            console.log(response.statusCode)
            console.log(response.body.data)
    
            expect(response.body.success).toBe(true)
            expect(response.body.data.result.some((agent: IAgentRegistrationListItem) => agent.Email === 'sp@thisemaildoesnotexist.com')).toBe(true)
    
            agentRegistrationId = response.body.data.result[0].AgentRegistrationID
        })
    
        it('should approve the agent registration', async () => {
            const response = await agentSA
                .post('/api/auth/approve-registration')
                .send({agentRegistrationId: agentRegistrationId})
    
            expect(response.body.success).toBe(true)
            console.log(response.body)
        })
    
        it('should login the agent', async () => {
            const response = await request(app)
                .post('/api/auth/login-agent')
                .send({
                    email: 'sp@thisemaildoesnotexist.com',
                    password: process.env.TESTING_PW || 'password'
                })
            console.log("status code: ", response.statusCode)
            console.log("req body: ", response.body)
            console.log("cookies: ", response.headers['set-cookie'])
                
            expect(response.body.success).toBe(true)
        })
    })

    afterAll( async () => {
        const cleanup = await truncateAllTables()
        await db.destroy()
    })
})
