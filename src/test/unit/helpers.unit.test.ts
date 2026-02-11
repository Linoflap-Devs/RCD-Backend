import { after } from "node:test"
import { seedDivisions, seedPositions } from "../helpers/seed.helpers"
import { DB } from "../../db/db-types"
import { createSD, createSP, createUM } from "../helpers/users.helpers"
import { db } from "../../db/db"
import { truncateAllTables, truncateTables } from "../helpers/db.helpers"
import 'dotenv/config'
import { sql } from "kysely"

describe('Helpers test', () => {

    const usedTables = ['Tbl_Division', 'Tbl_Position', 'Tbl_AgentUser', 'Tbl_Agents', 'Tbl_AgentUser']

    it('should create divisions', async() => {
        const result = await seedDivisions()

        expect(result.success).toBe(true)

        expect(result.data[0].DivisionID).toBe(1)
        expect(result.data[0].Division).toBe('DIVISION A')
        expect(result.data[0].DivisionCode).toBe('DIV-A')
        expect(result.data[0].IsActive).toBe(1)
        expect(result.data[0].LastUpdate).toBeInstanceOf(Date)
        expect(result.data[0].UpdateBy).toBe(1)
        expect(result.data[0].DirectorID).toBe(0)

        expect(result.data[1].DivisionID).toBe(2)
        expect(result.data[1].Division).toBe('DIVISION B')
        expect(result.data[1].DivisionCode).toBe('DIV-B')
        expect(result.data[1].IsActive).toBe(1)
        expect(result.data[1].LastUpdate).toBeInstanceOf(Date)
        expect(result.data[1].UpdateBy).toBe(1)
        expect(result.data[1].DirectorID).toBe(0)
    })

    it('should create positions', async() => {
        const result = await seedPositions()

        expect(result.success).toBe(true)

        expect(result.data[0].PositionID).toBe(5)
        expect(result.data[0].Position).toBe('SALES PERSON')
        expect(result.data[0].PositionCode).toBe('S')
        expect(result.data[0].IsActive).toBe(1)

        expect(result.data[1].PositionID).toBe(76)
        expect(result.data[1].Position).toBe('BROKER')
        expect(result.data[1].PositionCode).toBe('BR')
        expect(result.data[1].IsActive).toBe(1)

        expect(result.data[2].PositionID).toBe(85)
        expect(result.data[2].Position).toBe('SALES DIRECTOR')
        expect(result.data[2].PositionCode).toBe('SD')
        expect(result.data[2].IsActive).toBe(1)

        expect(result.data[3].PositionID).toBe(86)
        expect(result.data[3].Position).toBe('UNIT MANAGER')
        expect(result.data[3].PositionCode).toBe('UM')
        expect(result.data[3].IsActive).toBe(1)
    })

    it('should create an SD user', async() => {
        const result = await createSD(1)
        expect(result.success).toBe(true)
    })

    it('should create a UM user', async() => {
        const result = await createUM(1)
        expect(result.success).toBe(true)
    })

    it('should create an SP user', async() => {
        const result = await createSP(1)
        expect(result.success).toBe(true)
    })

    afterAll(async() => {
        const cleanupDb = await truncateTables(usedTables)
        await db.destroy()
    })
})