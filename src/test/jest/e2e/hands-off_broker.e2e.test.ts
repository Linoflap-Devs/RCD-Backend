import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import divisionsRouter from '../../../routes/division.routes'
import * as divisionService from '../../../service/division.service'

// Mock the service to avoid database dependencies in this specific check
jest.mock('../../../service/division.service', () => ({
    ...jest.requireActual('../../../service/division.service'),
    getDivisionsService: jest.fn()
}))

const app = express()
app.use(express.json())
app.use(cookieParser())

// Mock middleware to bypass auth
app.use((req, res, next) => {
    (req as any).session = { userID: 1, role: 'SALES ADMIN' }
    next()
})

app.use('/api/divisions', divisionsRouter)

describe('Hands-Off Broker Division E2E', () => {
    const mockDivisions = [
        { DivisionID: 1, DivisionName: 'Division 1', DivisionCode: 'D1', IsActive: 1 }
    ]

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should NOT return Broker Transaction by default', async () => {
        (divisionService.getDivisionsService as jest.Mock).mockResolvedValue({
            success: true,
            data: mockDivisions
        })

        const res = await request(app).get('/api/divisions/')
        
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toHaveLength(1)
        expect(res.body.data.find((d: any) => d.DivisionID === 0)).toBeUndefined()
        expect(divisionService.getDivisionsService).toHaveBeenCalledWith(false)
    })

    it('should return Broker Transaction when showBrokerTransaction=true', async () => {
        (divisionService.getDivisionsService as jest.Mock).mockResolvedValue({
            success: true,
            data: [...mockDivisions, { DivisionID: 0, DivisionName: 'Broker Transaction', DivisionCode: 'BT', IsActive: 1 }]
        })

        const res = await request(app).get('/api/divisions/?showBrokerTransaction=true')
        
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.find((d: any) => d.DivisionID === 0)).toBeDefined()
        expect(divisionService.getDivisionsService).toHaveBeenCalledWith(true)
    })
})
