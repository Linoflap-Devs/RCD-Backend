import express from 'express'
import { createAdmin, createSD, createSP, createSPs, createUM, createUMs } from '../../helpers/users.helpers'
import { seedDivisions, seedPositions } from '../../helpers/seed.helpers'
import request from 'supertest'
import { db } from '../../../db/db'
import { truncateAllTables, truncateTables } from '../../helpers/db.helpers'

// Import your actual routes
import authRouter from '../../../routes/auth.routes'
import agentRouter from '../../../routes/agents.routes'
import { IAgentRegistrationListItem, ITblAgentUser, ITblUsersWeb } from '../../../types/auth.types'
import cookieParser from 'cookie-parser'
import { ITblAgent } from '../../../types/agent.types'
import { TblAgents } from '../../../db/db-types'
import { Selectable } from 'kysely'

const app = express()

// Add necessary middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Mount your routes
app.use('/api/auth', authRouter)
app.use('/api/agents', agentRouter)

describe('Agents E2E Test', () => {

    describe('POST /new/agent (add agent with UM)', () => {

        const agent = request.agent(app)
        let spUsers: ITblAgentUser[] = [] as ITblAgentUser[]
        let umUser: ITblAgentUser = {} as ITblAgentUser
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

        it('should add a new agent with referredby', async () => {
            const result = await agent
                .post('/api/agents/new')
                .send({
                    agentCode: 'AGENT-TEST',
                    lastName: 'De La Cruz',
                    middleName: '',
                    firstName: 'Juan',
                    contactNumber: '09123456789',
                    divisionId: '1',
                    agentTaxRate: '5',
                    civilStatus: 'Single',
                    sex: 'Male',
                    address: '#81 New Street',
                    birthdate: '2001-01-01',
                    referredByID: umUser.AgentID!.toString()
                })
                // .field({  })
                // .field({ })
                // .field({ firstName: 'Juan'})
                // .field({ contactNumber: '09123456789'})
                // .field({ divisionId: '1'})
                // .field({ agentTaxRate: '5'})
                // .field({ civilStatus: 'Single'})
                // .field({ sex: 'Male'})
                // .field({ address: '#81 New Street'})
                // .field({ birthdate: '2001-01-01'})
                // .field({ referredByID: umUser.AgentID!.toString()})

            console.log(result.body)

            const umUserDetails = await db.selectFrom('Tbl_Agents')
                .where('Tbl_Agents.AgentID', '=', umUser.AgentID)
                .selectAll()
                .executeTakeFirstOrThrow()

            expect(result.statusCode).toBe(200)
            expect(result.body.data.ReferredByID).toEqual(umUser.AgentID)
            expect(result.body.data.ReferredCode).toEqual(umUserDetails.AgentCode)

        })


        afterAll(async () => {
            await truncateAllTables()
        })
    })

    describe('POST /new/agent (add agent with email and pass)', () => {

        const agent = request.agent(app)
        let adminUser: ITblUsersWeb = {} as ITblUsersWeb

         it('should seed divisions', async () => {
            const divisions = await seedDivisions()
            expect(divisions.success).toBe(true)
        })

        it('should seed positions', async () => {
            const positions = await seedPositions()
            expect(positions.success).toBe(true)
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

        it('should reject a new agent with missing credentials', async () => {
            const result = await agent
                .post('/api/agents/new')
                .send({
                    agentCode: 'AGENT-TEST',
                    lastName: 'De La Cruz',
                    middleName: '',
                    firstName: 'Juan',
                    contactNumber: '09123456789',
                    divisionId: '1',
                    agentTaxRate: '5',
                    civilStatus: 'Single',
                    sex: 'Male',
                    address: '#81 New Street',
                    birthdate: '2001-01-01',
                    email: 'sample@email.com',
                })

            console.log(result.body)
            expect(result.statusCode).toBe(400)
        })

        it('should add a new agent with email and password', async () => {
            const result = await agent
                .post('/api/agents/new')
                .send({
                    agentCode: 'AGENT-TEST',
                    lastName: 'De La Cruz',
                    middleName: '',
                    firstName: 'Juan',
                    contactNumber: '09123456789',
                    divisionId: '1',
                    agentTaxRate: '5',
                    civilStatus: 'Single',
                    sex: 'Male',
                    address: '#81 New Street',
                    birthdate: '2001-01-01',
                    email: 'sample@email.com',
                    password: 'password'
                })

            console.log(result.body)
            expect(result.statusCode).toBe(200)
        })

        it('should login the new agent', async () => {
            const login = await agent
                .post('/api/auth/login-agent')
                .send({
                    email: 'sample@email.com',
                    password: 'password'
                })

            console.log(login.body)
            expect(login.statusCode).toBe(200)
        })

        afterAll(async () => {
            await truncateAllTables()
        })
    })

    describe('POST /new/agent (add UM with SPs)', () => {

        const agent = request.agent(app)
        let spUsers: ITblAgentUser[] = [] as ITblAgentUser[]
        let umUser: ITblAgentUser = {} as ITblAgentUser
        let adminUser: ITblUsersWeb = {} as ITblUsersWeb

        let umId = 0

         it('should seed divisions', async () => {
            const divisions = await seedDivisions()
            expect(divisions.success).toBe(true)
        })

        it('should seed positions', async () => {
            const positions = await seedPositions()
            expect(positions.success).toBe(true)
        })

        it('should create 3 SP users', async () => {
            const sps = await createSPs(3, 1)

            spUsers = sps.data
            expect(sps.success).toBe(true)
            expect(spUsers.length).toBe(3)
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

        it('should add a new agent with salespersonIds', async () => {
            const result = await agent
                .post('/api/agents/new')
                .send({
                    agentCode: 'AGENT-TEST',
                    lastName: 'De La Cruz',
                    middleName: '',
                    firstName: 'Juan',
                    contactNumber: '09123456789',
                    divisionID: '1',
                    agentTaxRate: '5',
                    civilStatus: 'Single',
                    positionID: '86',
                    sex: 'Male',
                    address: '#81 New Street',
                    birthdate: '2001-01-01',
                    salespersonIds: spUsers.map((sp) => sp.AgentID)
                })

            console.log(result.body)

            umUser = result.body.data
            umId = result.body.data.AgentID
            expect(result.statusCode).toBe(200)
        })

        it('should check the referred by and id on the SPs', async () => {
            const um = await db.selectFrom('Tbl_Agents')
                .where('Tbl_Agents.AgentID', '=', umId)
                .select(['Tbl_Agents.AgentID', 'Tbl_Agents.AgentCode'])
                .executeTakeFirstOrThrow()

            const [sp1, sp2, sp3] = await Promise.all([
                agent
                    .get('/api/agents/' + spUsers[0].AgentID),
                agent
                    .get('/api/agents/' + spUsers[1].AgentID),
                agent
                    .get('/api/agents/' + spUsers[2].AgentID)
            ])

            expect(sp1.body.data.agent.ReferredByID).toBe(um.AgentID)
            expect(sp1.body.data.agent.ReferredCode).toBe(um.AgentCode)
            expect(sp2.body.data.agent.ReferredByID).toBe(um.AgentID)
            expect(sp2.body.data.agent.ReferredCode).toBe(um.AgentCode)
            expect(sp3.body.data.agent.ReferredByID).toBe(um.AgentID)
            expect(sp3.body.data.agent.ReferredCode).toBe(um.AgentCode)
        })

        afterAll(async () => {
            await truncateAllTables()
        })
    })
       
    describe('PATCH /new/agent/:agentId/promote', () => {
        const agent = request.agent(app)
        let spUser: ITblAgentUser = {} as ITblAgentUser
        let umUser: ITblAgentUser = {} as ITblAgentUser
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

            expect(result.statusCode).toBe(200)
        })

        it('should remove the referred by and id from the SP', async () => {
            const result = await agent
                .get('/api/agents/' + spUser.AgentID)
            
            expect(result.statusCode).toBe(200)
            expect(result.body.data.ReferredByID).toBeFalsy()
            expect(result.body.data.ReferredCode).toBeFalsy()
        })

        afterAll(async () => {
            await truncateAllTables()
        })
    })

    describe('PATCH /api/agents/new/:agentId (assign to UM)', () => {
        const agent = request.agent(app)
        let spUsers: ITblAgentUser[] = [] as ITblAgentUser[]
        let umUser: ITblAgentUser = {} as ITblAgentUser
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

        it('should create 3 SP users', async () => {
            const sps = await createSPs(3, 1)

            spUsers = sps.data
            expect(sps.success).toBe(true)
            expect(spUsers.length).toBe(3)
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

        it('should reject assigning SPs to other SPs', async () => {
            const result = await agent
                .patch('/api/agents/new/' + spUsers[0].AgentID)
                .send({ salespersonIds: spUsers.map((user) => user.AgentID) })
            
            expect(result.statusCode).toBe(400)
        })

        it('should assign the SPs to the UM', async () => {
            const salespersonIds = spUsers.map((user) => user.AgentID)
            const result = await agent
                .patch('/api/agents/new/' + umUser.AgentID)
                .send({ salespersonIds: spUsers.map((user) => user.AgentID)})
            
            expect(result.statusCode).toBe(200)
        })

        it('should check the referred by and id on the SPs', async () => {
            const um = await db.selectFrom('Tbl_Agents')
                .where('Tbl_Agents.AgentID', '=', umUser.AgentID)
                .select(['Tbl_Agents.AgentID', 'Tbl_Agents.AgentCode'])
                .executeTakeFirstOrThrow()

            const [sp1, sp2, sp3] = await Promise.all([
                agent
                    .get('/api/agents/' + spUsers[0].AgentID),
                agent
                    .get('/api/agents/' + spUsers[1].AgentID),
                agent
                    .get('/api/agents/' + spUsers[2].AgentID)
            ])

            expect(sp1.body.data.agent.ReferredByID).toBe(um.AgentID)
            expect(sp1.body.data.agent.ReferredCode).toBe(um.AgentCode)
            expect(sp2.body.data.agent.ReferredByID).toBe(um.AgentID)
            expect(sp2.body.data.agent.ReferredCode).toBe(um.AgentCode)
            expect(sp3.body.data.agent.ReferredByID).toBe(um.AgentID)
            expect(sp3.body.data.agent.ReferredCode).toBe(um.AgentCode)
        })

        it('should check the salespersons array from the UM', async () => {
            const result = await agent
                .get('/api/agents/' + umUser.AgentID)

            expect(result.body.data.salespersons).toBeDefined()
            expect(result.body.data.salespersons.length).toBe(3)
        })

        it('should assign a new array of SPs to the UM', async () => {
            const result = await agent
                .patch('/api/agents/new/' + umUser.AgentID)
                .send({ salespersonIds: [spUsers[0].AgentID, spUsers[1].AgentID] })
            
            expect(result.statusCode).toBe(200)
        })

        it('should check the salespersons array from the UM after update', async () => {
            const result = await agent
                .get('/api/agents/' + umUser.AgentID)

            expect(result.body.data.salespersons).toBeDefined()
            expect(result.body.data.salespersons.length).toBe(2)
            expect(result.body.data.salespersons).toContainEqual(expect.objectContaining({ AgentID: spUsers[0].AgentID }))
            expect(result.body.data.salespersons).toContainEqual(expect.objectContaining({ AgentID: spUsers[1].AgentID }))
        })
            

        afterAll(async () => {
            await truncateAllTables()
        })
    })

    describe('PATCH /api/agents/new/:agentId (assign to SP)', () => {
        const agent = request.agent(app)
        let spUser: ITblAgentUser = {} as ITblAgentUser
        let umUser: ITblAgentUser = {} as ITblAgentUser
        let adminUser: ITblUsersWeb = {} as ITblUsersWeb
        let umData: ITblAgent = {} as ITblAgent

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

        it('should create 3 SP users', async () => {
            const sps = await createSP(1)

            spUser = sps.data
            expect(sps.success).toBe(true)
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

        it('should reject assigning UMs to other UMs', async () => {

            const um = await db.selectFrom('Tbl_Agents')
                .where('Tbl_Agents.AgentID', '=', umUser.AgentID)
                .selectAll()
                .executeTakeFirstOrThrow()

            umData = um

            const result = await agent
                .patch('/api/agents/new/' + umUser.AgentID)
                .send({ referredById: umUser.AgentID, referredCode: um.AgentCode })

            
            expect(result.statusCode).toBe(400)
        })

        it('should assign the UM to the SP', async () => {
            const result = await agent
                .patch('/api/agents/new/' + spUser.AgentID)
                .send({ referredByID: umData.AgentID, referredCode: umData.AgentCode })

            console.log(result.body)
            
            expect(result.statusCode).toBe(200)
        })

        it('should check the referred by and id on the SP', async () => {
            const result = await agent
                .get('/api/agents/' + spUser.AgentID)

            expect(result.body.data.agent.ReferredByID).toBe(umData.AgentID)
            expect(result.body.data.agent.ReferredCode).toBe(umData.AgentCode)
        })

        afterAll(async () => {
            await truncateAllTables()
        })
    })

    describe.only('PATCH /api/agents/new/:agentId/demote-um (With replacement)', () => {
        const agent = request.agent(app)
        let spUser: ITblAgentUser[] = [] as ITblAgentUser[]
        let umUser: ITblAgentUser = {} as ITblAgentUser
        let umUser2: ITblAgentUser = {} as ITblAgentUser
        let umUser3: ITblAgentUser = {} as ITblAgentUser
        let umData: ITblAgent = {} as ITblAgent
        let umData2: ITblAgent = {} as ITblAgent
        let adminUser: ITblUsersWeb = {} as ITblUsersWeb

        it('should seed divisions', async () => {
            const divisions = await seedDivisions()
            expect(divisions.success).toBe(true)
        })

        it('should seed positions', async () => {
            const positions = await seedPositions()
            expect(positions.success).toBe(true)
        })

        it('should create 2 UM user', async () => {
            const um = await createUMs(2, 1)
            umUser = um.data[0]
            umUser2 = um.data[1]

            const data: Selectable<TblAgents>[] = await db.selectFrom('Tbl_Agents')
                .where('AgentID', 'in', um.data.map(um => um.AgentID))
                .selectAll()
                .execute()

            umData = data.find(d => d.AgentID === umUser.AgentID)!
            umData2 = data.find(d => d.AgentID === umUser2.AgentID)!

            expect(um.success).toBe(true)
        })

        it('should create a UM user from another division', async () => {
            const um = await createUM(2)

            umUser3 = um.data
            expect(um.success).toBe(true)
        })

        it('should create 3 SP users', async () => {
            const sps = await createSPs(3, 1, umUser.AgentID!)

            spUser = sps.data.map(sp => sp as ITblAgentUser)
            expect(sps.success).toBe(true)
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

        // negative tests

        it('should reject demoting a SP', async () => {
            const result = await agent
                .patch('/api/agents/new/' + spUser[0].AgentID + '/demote-um')

            expect(result.statusCode).toBe(404)
        })

        it('should reject demoting a non-existent UM', async () => {
            const result = await agent
                .patch('/api/agents/new/1000/demote-um')

            expect(result.statusCode).toBe(404)
        })

        it('should reject demoting if there is no replacement', async () => {
            const result = await agent
                .patch('/api/agents/new/' + umUser.AgentID + '/demote-um')

            expect(result.statusCode).toBe(404)
        })

        it('should reject demoting if replacement is non-existing', async () => {
            const result = await agent
                .patch('/api/agents/new/' + umUser.AgentID + '/demote-um')
                .send({ replacementUmId: 1000 })

            expect(result.statusCode).toBe(404)
        })

        it('should reject demoting if replacement is not a UM', async () => {
            const result = await agent
                .patch('/api/agents/new/' + umUser.AgentID + '/demote-um')
                .send({ replacementUmId: spUser[0].AgentID })

            expect(result.statusCode).toBe(404)
        })

        it('should reject demoting if replacement is not from the same division', async () => {
            const result = await agent
                .patch('/api/agents/new/' + umUser.AgentID + '/demote-um')
                .send({ replacementUmId: umUser3.AgentID })

            expect(result.statusCode).toBe(404)
        })

        // positive tests

        it('should demote a UM', async () => {
            const result = await agent
                .patch('/api/agents/new/' + umUser.AgentID + '/demote-um')
                .send({ replacementUmId: umUser2.AgentID })

            console.log(umUser, umUser2)
            console.log(result.body)

            expect(result.statusCode).toBe(200)
        })

        it('should transfer the SPs to the new UM', async () => {
            const result = await db.selectFrom('Tbl_Agents')
                .where('AgentID', 'in', spUser.map(sp => sp.AgentID))
                .selectAll()
                .execute()

            expect(result[0].ReferredByID).toBe(umUser2.AgentID)
            expect(result[1].ReferredByID).toBe(umUser2.AgentID)
            expect(result[2].ReferredByID).toBe(umUser2.AgentID)

            expect(result[0].ReferredCode).toBe(umData2.AgentCode)
            expect(result[1].ReferredCode).toBe(umData2.AgentCode)
            expect(result[2].ReferredCode).toBe(umData2.AgentCode)
        })

        afterAll(async () => {
            await truncateAllTables()
        })
    })
    afterAll(async () => {
        console.log('afterAll')
        await db.destroy()
    })
})