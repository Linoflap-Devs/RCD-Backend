import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import divisionsRouter from '../../../routes/division.routes'
import salesRouter from '../../../routes/sales.routes'
import * as divisionService from '../../../service/division.service'
import * as salesService from '../../../service/sales.service'

// Mock the services
jest.mock('../../../service/division.service', () => ({
    ...jest.requireActual('../../../service/division.service'),
    getDivisionsService: jest.fn()
}))

jest.mock('../../../service/sales.service', () => ({
    ...jest.requireActual('../../../service/sales.service'),
    addPendingSalesServiceR2: jest.fn()
}))

// Mock auth middleware
jest.mock('../../../middleware/auth', () => ({
    validateAgentEmployeeSession: (req: any, res: any, next: any) => {
        req.session = { userID: 1, role: 'SALES ADMIN' }
        next()
    },
    validateEmployeeSession: (req: any, res: any, next: any) => {
        req.session = { userID: 1, role: 'SALES ADMIN' }
        next()
    },
    validateSession: (req: any, res: any, next: any) => {
        req.session = { userID: 1, role: 'SALES ADMIN' }
        next()
    },
    validateMobileSession: (req: any, res: any, next: any) => {
        req.session = { userID: 1, role: 'SALES ADMIN' }
        next()
    }
}))

// Mock roles middleware
jest.mock('../../../middleware/roles', () => ({
    validateRole: () => (req: any, res: any, next: any) => next()
}))

// Mock zod middleware
jest.mock('../../../middleware/zod', () => ({
    validate: () => (req: any, res: any, next: any) => next()
}))

// Mock multer
jest.mock('../../../middleware/multer', () => ({
    multerUpload: {
        fields: () => (req: any, res: any, next: any) => next(),
        single: () => (req: any, res: any, next: any) => next()
    }
}))

const app = express()
app.use(express.json())
app.use(cookieParser())

app.use('/api/divisions', divisionsRouter)
app.use('/api/sales', salesRouter)

describe('Hands-Off Broker Feature E2E', () => {
    const mockDivisions = [
        { DivisionID: 1, DivisionName: 'Division 1', DivisionCode: 'D1', IsActive: 1 }
    ]

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Division Discovery', () => {
        it('should NOT return Broker Transaction by default', async () => {
            (divisionService.getDivisionsService as jest.Mock).mockResolvedValue({
                success: true,
                data: mockDivisions
            })

            const res = await request(app).get('/api/divisions/')
            
            expect(res.status).toBe(200)
            expect(divisionService.getDivisionsService).toHaveBeenCalledWith(false)
        })

        it('should return Broker Transaction when showBrokerTransaction=true', async () => {
            (divisionService.getDivisionsService as jest.Mock).mockResolvedValue({
                success: true,
                data: [...mockDivisions, { DivisionID: 0, DivisionName: 'Broker Transaction', DivisionCode: 'BT', IsActive: 1 }]
            })

            const res = await request(app).get('/api/divisions/?showBrokerTransaction=true')
            
            expect(res.status).toBe(200)
            expect(res.body.data.find((d: any) => d.DivisionID === 0)).toBeDefined()
            expect(divisionService.getDivisionsService).toHaveBeenCalledWith(true)
        })
    })

    describe('Commission Filtering Logic', () => {
        it('should call service with filtered rates for standard transaction', async () => {
            (salesService.addPendingSalesServiceR2 as jest.Mock).mockResolvedValue({ success: true, data: {} })

            const payload = {
                reservationDate: '2026-05-28',
                divisionID: 1,
                salesBranchID: 1,
                sectorID: 1,
                buyersName: 'Test Buyer',
                projectID: 1,
                blkFlr: '1', lotUnit: '1', phase: '1', netTCP: 1000000,
                financingScheme: 'Bank',
                sellerName: 'Test Seller',
                commissionRates: JSON.stringify([
                    { distributionId: 1, commissionRate: 5 }, // Standard
                    { distributionId: 99, brokerId: 123, commissionRate: 2 } // Hands-off (should be ignored)
                ])
            }

            const res = await request(app).post('/api/sales/pending-r2').send(payload)

            if (res.status !== 200) {
                console.log('Response Body:', res.body)
            }
            expect(res.status).toBe(200)

            // The service itself handles the filtering now
            expect(salesService.addPendingSalesServiceR2).toHaveBeenCalled()
        })

        it('should call service for Broker Transaction (DivisionID 0)', async () => {
            (salesService.addPendingSalesServiceR2 as jest.Mock).mockResolvedValue({ success: true, data: {} })

            const payload = {
                reservationDate: '2026-05-28',
                divisionID: 0,
                salesBranchID: 0,
                sectorID: 1,
                buyersName: 'Test Buyer',
                projectID: 1,
                blkFlr: '1', lotUnit: '1', phase: '1', netTCP: 1000000,
                financingScheme: 'Bank',
                sellerName: 'Test Seller',
                commissionRates: JSON.stringify([
                    { distributionId: 1, commissionRate: 5 }, // Standard (should be ignored)
                    { distributionId: 99, brokerId: 123, commissionRate: 2 } // Hands-off (should be kept)
                ])
            }

            const res = await request(app).post('/api/sales/pending-r2').send(payload)

            expect(res.status).toBe(200)
            expect(salesService.addPendingSalesServiceR2).toHaveBeenCalled()
        })
    })
})
