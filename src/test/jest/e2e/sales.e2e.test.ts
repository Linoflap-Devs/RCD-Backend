import express from 'express'
import { createAdmin, createBranchHead, createSD, createSP, createSPs, createUM } from '../../helpers/users.helpers'
import { seedDistributionList, seedDivisions, seedPositions, seedProjectsDevProjType } from '../../helpers/seed.helpers'
import request from 'supertest'
import { db } from '../../../db/db'
import { truncateAllTables, truncateTables } from '../../helpers/db.helpers'
import fs from 'fs'

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
import { TblDistribution } from '../../../db/db-types'
import { Selectable } from 'kysely'
import { CommissionRateInput } from '../../../types/commission.types'
import path from 'path'

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

    describe('POST /api/sales/distribution', () => {
        let saUserAccount: ITblUsersWeb = {} as ITblUsersWeb  
        const agent = request.agent(app)

        let salesDistribution: Selectable<TblDistribution> = {} as Selectable<TblDistribution>

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

        it('should create a sales distribution entry', async () => {
            const result = await agent
                .post('/api/sales/distribution')
                .send({
                    distributionCode: 'TEST_DIST_CODE',
                    distributionName: 'Test Distribution',
                    level: 1,
                    positionID: 1
                })

            salesDistribution = result.body.data

            console.log(result.body)

            expect(result.status).toBe(200)
            expect(result.body.success).toBe(true)
        })

        it('should see the sales distribution in the list', async () => {
            const result = await agent
                .get('/api/sales/distribution')

            expect(result.status).toBe(200)
            expect(result.body.success).toBe(true)
            expect(result.body.data.length).toBeGreaterThan(0)
            expect(result.body.data.some((dist: TblDistribution) => Number(dist.DistributionID) == salesDistribution.DistributionID)).toBe(true)
        })

        afterAll( async () => {
            await truncateAllTables()
        })
    })

    describe.only('New Sales Flow', () => {
        let saUserAccount: ITblUsersWeb = {} as ITblUsersWeb
        let saAgent: ReturnType<typeof request.agent> = request.agent(app)

        let bhUserAccount: ITblUsersWeb = {} as ITblUsersWeb
        let bhAgent: ReturnType<typeof request.agent> = request.agent(app)

        let spUserAccount: ITblAgentUser = {} as ITblAgentUser
        let spAgent: ReturnType<typeof request.agent> = request.agent(app)

        let umUserAccount: ITblAgentUser = {} as ITblAgentUser
        let umAgent: ReturnType<typeof request.agent> = request.agent(app)

        let sdUserAccount: ITblAgentUser = {} as ITblAgentUser
        let sdAgent: ReturnType<typeof request.agent> = request.agent(app)

        let salesDistribution: Selectable<TblDistribution>[] = [] as Selectable<TblDistribution>[]

        let pendingSaleId = -1
        let pendingSaleIdReject = -1
        let umPendingSaleId = -1
        let sdPendingSaleId = -1
        let bhPendingSaleId = -1

        it('should create divisions', async () => {
            const divisions = await seedDivisions()

            expect(divisions.success).toBe(true)
        })

        it('should create positions', async () =>{
            const positions = await seedPositions()

            expect(positions.success).toBe(true)
        })

        it('should seed distribution list', async () => {
            const distributions = await seedDistributionList()

            expect(distributions.success).toBe(true)
        })

        it('should seed projects, developers, and project types', async () => {
            const result = await seedProjectsDevProjType()

            expect(result.success).toBe(true)   
        })

        it('should create an SA user', async () => {
            const saUser = await createAdmin()

            saUserAccount = saUser.data
            expect(saUser.success).toBe(true)
        })

        it('should create a BH user', async () => {
            const bhUser = await createBranchHead()

            bhUserAccount = bhUser.data

            expect(bhUser.success).toBe(true)
        })

        it('should create a UM agent', async () => {
            const umUser = await createUM(1)

            umUserAccount = umUser.data

            expect(umUser.success).toBe(true)
        })

        it('should create an SP agent', async () => {
            const spUser = await createSP(1, umUserAccount.AgentID!)

            spUserAccount = spUser.data

            expect(spUser.success).toBe(true)
        })

        it('should create an SD agent', async () => {
            const sdUser = await createSD(1)

            sdUserAccount = sdUser.data

            expect(sdUser.success).toBe(true)
        })

        // SALES PERSON

        describe('it should create a new pending sale', () => {

            it('should login the SP', async () => {

                const loginSp = await spAgent
                    .post('/api/auth/login-agent')
                    .send({
                        email: spUserAccount.Email,
                        password: process.env.TESTING_PW || ''
                    })

                expect(loginSp.status).toBe(200)
                expect(loginSp.body.success).toBe(true)
            })

            it('should add a pending sale', async () => {

                const addSale = await spAgent
                    .post('/api/sales/pending')
                    .send({
                        reservationDate: '2026-05-21',
                        salesBranchID: 1,
                        sectorID: 1,
                        buyersName: 'Sales Distribution Test',
                        address: '#18 Aguinaldo Highway',
                        phoneNumber: '091235678',
                        occupation: 'Employee',
                        projectID: 1,
                        blkFlr: "1",
                        lotUnit: "1",
                        phase: "1",
                        lotArea: 100,
                        flrArea: 100,
                        netTCP: 100,
                        miscFee: 100,
                        financingScheme: 'IN-HOUSE LOAN',
                        downpayment: 12000,
                        dpTerms: 12,
                        monthlyPayment: 1000,
                        dpStartDate: "2026-01-01",
                        sellerName: "Juan Luna",
                    })

                expect(addSale.status).toBe(200)
                expect(addSale.body.success).toBe(true)

                pendingSaleId = addSale.body.data.AgentPendingSalesID
            })

            it('should add a pending sale for rejection', async () => {

                const addSale = await spAgent
                    .post('/api/sales/pending')
                    .send({
                        reservationDate: '2026-05-21',
                        salesBranchID: 1,
                        sectorID: 1,
                        buyersName: 'Sales Distribution Test Rejection',
                        address: '#18 Aguinaldo Highway',
                        phoneNumber: '091235678',
                        occupation: 'Employee',
                        projectID: 1,
                        blkFlr: "1",
                        lotUnit: "1",
                        phase: "1",
                        lotArea: 100,
                        flrArea: 100,
                        netTCP: 100,
                        miscFee: 100,
                        financingScheme: 'IN-HOUSE LOAN',
                        downpayment: 12000,
                        dpTerms: 12,
                        monthlyPayment: 1000,
                        dpStartDate: "2026-01-01",
                        sellerName: "Juan Luna",
                    })

                expect(addSale.status).toBe(200)
                expect(addSale.body.success).toBe(true)

                pendingSaleIdReject = addSale.body.data.AgentPendingSalesID
            })


            it('should edit a pending sale', async () => {

                const editValue = 'edit by sp'

                const result = await spAgent
                    .patch(`/api/sales/pending/edit/${pendingSaleId}`)
                    .send({
                        buyersName: editValue
                    })

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
                expect(result.body.data.BuyersName).toBe(editValue)
            })
        })

        // UNIT MANAGER

        describe('it should approve the pending sale ', () => {

            it('should login the UM', async () => {
                const loginUm = await umAgent
                    .post('/api/auth/login-agent')
                    .send({
                        email: umUserAccount.Email,
                        password: process.env.TESTING_PW || ''
                    })

                expect(loginUm.status).toBe(200)
                expect(loginUm.body.success).toBe(true)
            })

            it('should fetch the sales distribution list', async () => {
                const result = await umAgent
                    .get('/api/sales/distribution')

                salesDistribution = result.body.data

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
            })

            it('should see the pending sale', async () => {
                const result = await umAgent
                    .get('/api/sales/pending')

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
                expect(result.body.data.length).toBeGreaterThan(0)
            })

            it('should edit a pending sale', async () => {

                const editValue = 'edit by um'

                const result = await spAgent
                    .patch(`/api/sales/pending/edit/${pendingSaleId}`)
                    .send({
                        buyersName: editValue
                    })

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
                expect(result.body.data.BuyersName).toBe(editValue)
            })

            it('should approve the pending sale', async () => {

                const commissionRates: CommissionRateInput[] = [
                    {
                        // UM
                        distributionId: salesDistribution.find((dist: Selectable<TblDistribution>) => dist.DistributionCode == 'UM')?.DistributionID!,
                        commissionRate: 1,
                        agentId: 3,
                    },
                    {
                        // SP
                        distributionId: salesDistribution.find((dist: Selectable<TblDistribution>) => dist.DistributionCode == 'SP')?.DistributionID!,
                        commissionRate: 1,
                        agentId: 1
                    }
                ]

                const result = await umAgent
                    .patch(`/api/sales/pending/${pendingSaleId}`)
                    .send({
                        commissionRates: commissionRates
                    })

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
            })
        })

        describe('it should create a pending sale as a UM', () => {

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

            it('should add a pending sale', async () => {

                const commissionRates = [
                    {
                        distributionId: 2,
                        agentId: 1,
                        commissionRate: 1
                    },
                    {
                        distributionId: 3,
                        agentId: 2,
                        commissionRate: 1
                    }
                ]

                const addSale = await umAgent
                    .post('/api/sales/pending')
                    .field('reservationDate', '2026-05-21')
                    .field('salesBranchID', 1)
                    .field('sectorID', 1)
                    .field('buyersName', 'UM Sample Sale')
                    .field('address', '#18 Aguinaldo Highway')
                    .field('phoneNumber', '091235678')
                    .field('occupation', 'Employee')
                    .field('projectID', 1)
                    .field('blkFlr', '1')
                    .field('lotUnit', '1')
                    .field('phase', '1')
                    .field('lotArea', 100)
                    .field('flrArea', 100)
                    .field('netTCP', 100)
                    .field('miscFee', 100)
                    .field('financingScheme', 'IN-HOUSE LOAN')
                    .field('downpayment', 12000)
                    .field('dpTerms', 12)
                    .field('monthlyPayment', 1000)
                    .field('dpStartDate', '2026-01-01')
                    .field('sellerName', 'Test UM')
                    .field('commissionRates', JSON.stringify(commissionRates)) // serialize array as JSON string
                    .attach('receipt', fs.createReadStream('src/test/fixtures/govid.jpg'))
                    .attach('agreement', fs.createReadStream('src/test/fixtures/selfie.jpg'))

                expect(addSale.status).toBe(200)
                expect(addSale.body.success).toBe(true)

                umPendingSaleId = addSale.body.data.AgentPendingSalesID
            })

            it('should see the approval status as 2', async () => {
                const result = await db.selectFrom('Tbl_AgentPendingSales')
                    .selectAll()
                    .where('AgentPendingSalesID', '=', umPendingSaleId)
                    .execute()
                
                expect(result[0].ApprovalStatus).toBe(2)
            })
        })

        describe('it should reject a sale with approval status less than 2', () => {
            it('should reject the sale', async () => {
                const result = await umAgent    
                    .patch(`/api/sales/pending/reject/${pendingSaleIdReject}`)
                    .send({
                        remarks: 'return to sp'
                    })

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
            })
        })

        // SALES DIRECTOR

        describe('should approve the sale through SD', () => {
            it('should login the SD', async () => {
                const loginSD = await sdAgent
                    .post('/api/auth/login-agent')
                    .send({
                        email: sdUserAccount.Email,
                        password: process.env.TESTING_PW || ''
                    })

                expect(loginSD.status).toBe(200)
                expect(loginSD.body.success).toBe(true)
            })

            it('should see the pending sale', async () => {
                const result = await sdAgent
                    .get('/api/sales/pending')

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
                expect(result.body.data.length).toBeGreaterThan(0)

                expect(result.body.data[0].ApprovalStatus).toBe(2)
            })

            it('should edit a pending sale', async () => {

                const editValue = 'edit by sd'

                const result = await spAgent
                    .patch(`/api/sales/pending/edit/${pendingSaleId}`)
                    .send({
                        buyersName: editValue
                    })

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
                expect(result.body.data.BuyersName).toBe(editValue)
            })

            it('should approve the pending sale', async () => {
                const result = await sdAgent
                    .patch(`/api/sales/pending/approve/${pendingSaleId}`)

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
            })

            it('should change the approval status to 3', async () => {
                const result = await db.selectFrom('Tbl_AgentPendingSales')
                    .selectAll()
                    .where('AgentPendingSalesID', '=', pendingSaleId)
                    .execute()

                expect(result[0].ApprovalStatus).toBe(3)
            })
        })

        describe('it should create a pending sale as an SD', () => {

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

            it('should add a pending sale', async () => {

                const commissionRates = [
                    {
                        distributionId: 2,
                        agentId: 1,
                        commissionRate: 1
                    },
                    {
                        distributionId: 3,
                        agentId: 2,
                        commissionRate: 1
                    }
                ]

                const addSale = await sdAgent
                    .post('/api/sales/pending')
                    .field('reservationDate', '2026-05-21')
                    .field('salesBranchID', 1)
                    .field('sectorID', 1)
                    .field('buyersName', 'UM Sample Sale')
                    .field('address', '#18 Aguinaldo Highway')
                    .field('phoneNumber', '091235678')
                    .field('occupation', 'Employee')
                    .field('projectID', 1)
                    .field('blkFlr', '1')
                    .field('lotUnit', '1')
                    .field('phase', '1')
                    .field('lotArea', 100)
                    .field('flrArea', 100)
                    .field('netTCP', 100)
                    .field('miscFee', 100)
                    .field('financingScheme', 'IN-HOUSE LOAN')
                    .field('downpayment', 12000)
                    .field('dpTerms', 12)
                    .field('monthlyPayment', 1000)
                    .field('dpStartDate', '2026-01-01')
                    .field('sellerName', 'Test UM')
                    .field('commissionRates', JSON.stringify(commissionRates)) // serialize array as JSON string
                    .attach('receipt', fs.createReadStream('src/test/fixtures/govid.jpg'))
                    .attach('agreement', fs.createReadStream('src/test/fixtures/selfie.jpg'))

                expect(addSale.status).toBe(200)
                expect(addSale.body.success).toBe(true)

                sdPendingSaleId = addSale.body.data.AgentPendingSalesID
            })

            it('should see the approval status as 2', async () => {
                const result = await db.selectFrom('Tbl_AgentPendingSales')
                    .selectAll()
                    .where('AgentPendingSalesID', '=', sdPendingSaleId)
                    .execute()
                
                expect(result[0].ApprovalStatus).toBe(3)
            })
        })

        describe('it should NOT reject a sale that is already rejected', () => {
            it('should not reject the sale', async () => {

                const dbCheck = await db.selectFrom('Tbl_AgentPendingSales')
                    .selectAll()
                    .where('AgentPendingSalesID', '=', pendingSaleIdReject)
                    .executeTakeFirstOrThrow()
                
                console.log('db check', dbCheck)

                const result = await sdAgent    
                    .patch(`/api/sales/pending/reject/${pendingSaleIdReject}`)
                    .send({
                        remarks: 'return to sp'
                    })

                expect(result.status).toBe(400)
                expect(result.body.success).toBe(false)
            })
        })

        describe('it should reject a sale with approval status equals 3', () => {
            it('should reject the sale', async () => {
                const result = await sdAgent    
                    .patch(`/api/sales/pending/reject/${umPendingSaleId}`)
                    .send({
                        remarks: 'return to sp'
                    })

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
            })
        })
    
        // BRANCH HEAD

        describe('should approve the sale through BH', () => {
            it('should login the BH', async () => {
                const loginBH = await bhAgent
                    .post('/api/auth/login-employee')
                    .send({
                        username: bhUserAccount.UserName,
                        password: process.env.TESTING_PW || ''
                    })

                expect(loginBH.status).toBe(200)
                expect(loginBH.body.success).toBe(true)
            })

            it('should see the pending sale', async () => {
                const result = await bhAgent
                    .get('/api/sales/web/pending')

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
                expect(result.body.data.length).toBeGreaterThan(0)

                const filtered = result.body.data.find((sale: ITblAgentPendingSales) => sale.AgentPendingSalesID == pendingSaleId)

                expect(filtered.ApprovalStatus).toBe(3)
                expect(filtered.AgentPendingSalesID).toBe(pendingSaleId)
            })

            it('should edit a pending sale', async () => {

                const editValue = 'edit by bh'

                const result = await bhAgent
                    .patch(`/api/sales/pending/web/edit/${pendingSaleId}`)
                    .send({
                        buyersName: editValue
                    })

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
                expect(result.body.data.BuyersName).toBe(editValue)
            })

            it('should approve the pending sale', async () => {
                const result = await bhAgent
                    .patch(`/api/sales/pending/approve/bh/${pendingSaleId}`)

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
            })

            it('should change the approval status to 4', async () => {
                const result = await db.selectFrom('Tbl_AgentPendingSales')
                    .selectAll()
                    .where('AgentPendingSalesID', '=', pendingSaleId)
                    .execute()

                expect(result[0].ApprovalStatus).toBe(4)
            })
        })

        describe('it should create a pending sale as an BH', () => {

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

            it('should add a pending sale', async () => {

                const commissionRates = [
                    {
                        distributionId: 2,
                        agentId: 1,
                        commissionRate: 1
                    },
                    {
                        distributionId: 3,
                        agentId: 2,
                        commissionRate: 1
                    }
                ]

                const addSale = await bhAgent
                    .post('/api/sales/web/pending')
                    .field('reservationDate', '2026-05-21')
                    .field('salesBranchID', 1)
                    .field('sectorID', 1)
                    .field('buyersName', 'UM Sample Sale')
                    .field('address', '#18 Aguinaldo Highway')
                    .field('phoneNumber', '091235678')
                    .field('occupation', 'Employee')
                    .field('projectID', 1)
                    .field('divisionID', 1)
                    .field('blkFlr', '1')
                    .field('lotUnit', '1')
                    .field('phase', '1')
                    .field('lotArea', 100)
                    .field('flrArea', 100)
                    .field('netTCP', 100)
                    .field('miscFee', 100)
                    .field('financingScheme', 'IN-HOUSE LOAN')
                    .field('downpayment', 12000)
                    .field('dpTerms', 12)
                    .field('monthlyPayment', 1000)
                    .field('dpStartDate', '2026-01-01')
                    .field('sellerName', 'Test UM')
                    .field('commissionRates', JSON.stringify(commissionRates)) // serialize array as JSON string
                    .attach('receipt', fs.createReadStream('src/test/fixtures/govid.jpg'))
                    .attach('agreement', fs.createReadStream('src/test/fixtures/selfie.jpg'))

                console.log("bh add sale", addSale.body)

                expect(addSale.status).toBe(200)
                expect(addSale.body.success).toBe(true)

                bhPendingSaleId = addSale.body.data.AgentPendingSalesID
            })

            it('should see the approval status as 4', async () => {
                const result = await db.selectFrom('Tbl_AgentPendingSales')
                    .selectAll()
                    .where('AgentPendingSalesID', '=', bhPendingSaleId)
                    .execute()
                
                expect(result[0].ApprovalStatus).toBe(4)
            })
        })

        describe('it should reject a sale with approval status equals 3', () => {
            it('should reject the sale', async () => {
                const result = await bhAgent    
                    .patch(`/api/sales/pending/web/reject/${sdPendingSaleId}`)
                    .send({
                        remarks: 'return to sp'
                    })

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
            })
        })

        // SALES ADMIN

        describe('should approve the sale through SA', () => {

            let tranCode = ''

            it('should login the SA', async () => {
                const loginSA = await saAgent
                    .post('/api/auth/login-employee')
                    .send({
                        username: saUserAccount.UserName,
                        password: process.env.TESTING_PW || ''
                    })

                expect(loginSA.status).toBe(200)
                expect(loginSA.body.success).toBe(true)
            })

            it('should see the pending sale', async () => {
                const result = await saAgent
                    .get('/api/sales/web/pending')

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
                expect(result.body.data.length).toBeGreaterThan(0)

                // filter
                console.log("pending sales sa", result.body.data)
                const filtered = result.body.data.find((sale: ITblAgentPendingSales) => sale.AgentPendingSalesID == pendingSaleId)

                expect(filtered.ApprovalStatus).toBe(4)
                expect(filtered.AgentPendingSalesID).toBe(pendingSaleId)

                tranCode = result.body.data[0].PendingSalesTranCode
            })

            it('should edit a pending sale', async () => {

                const editValue = 'edit by sa'

                const result = await saAgent
                    .patch(`/api/sales/pending/web/edit/${pendingSaleId}`)
                    .send({
                        buyersName: editValue
                    })

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
                expect(result.body.data.BuyersName).toBe(editValue)
            })

            it('should approve the pending sale', async () => {
                const result = await saAgent
                    .patch(`/api/sales/pending/approve/sa/${pendingSaleId}`)

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
            })

            it('should change the approval status to 5', async () => {
                const result = await db.selectFrom('Tbl_AgentPendingSales')
                    .selectAll()
                    .where('AgentPendingSalesID', '=', pendingSaleId)
                    .execute()

                expect(result[0].ApprovalStatus).toBe(5)
            })

            it('should copy the pending sale to the sales table', async () => {
                const result = await db.selectFrom('Tbl_SalesTrans')
                    .selectAll()
                    .execute()

                expect(result.length).toBeGreaterThan(0)

            })
        })

        describe('it should reject a sale with approval status equals 3', () => {
            it('should reject the sale', async () => {
                const result = await saAgent    
                    .patch(`/api/sales/pending/web/reject/${bhPendingSaleId}`)
                    .send({
                        remarks: 'return to sp'
                    })

                console.log("SA result", result.body)

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
            })
        })

        describe('it should archive a pending sale', () => {
            it('should archive the pending sale', async () => {
                const result = await bhAgent
                    .delete(`/api/sales/pending/web/archive/${bhPendingSaleId}`)

                expect(result.status).toBe(200)
                expect(result.body.success).toBe(true)
            })
        })

        afterAll( async () => {
            await truncateAllTables()
        })
    })

    afterAll(async () => {
        await db.destroy()
    })
})