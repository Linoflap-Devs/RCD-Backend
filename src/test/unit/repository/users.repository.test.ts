import { db } from "../../../db/db"
import { editAgentGovIds, getAgentGovIds } from "../../../repository/users.repository"
import { truncateAllTables } from "../../helpers/db.helpers"
import { createUM } from "../../helpers/users.helpers"
describe('Users Repository Test', () => {
    describe('editAgentGovId', () => {
        it('should create a unit manager', async () => {
            const result = await createUM(1)

            expect(result.success).toBe(true)
        })

        it('should edit known ID columns', async () => {
            const updateData: {IdType: string, IdNumber: string}[] = [
                {
                    IdType: 'SSSNumber',
                    IdNumber: 'SSS123456789'
                },
                {
                    IdType: 'PhilhealthNumber',
                    IdNumber: 'PH123456789'
                },
                {
                    IdType: 'PagIbigNumber',
                    IdNumber: 'PI123456789'
                },
                {
                    IdType: 'TINNumber',
                    IdNumber: 'TIN123456789'
                },
                {
                    IdType: 'EmployeeIDNumber',
                    IdNumber: 'EID123456789'
                },
                {
                    IdType: 'PRCNumber',
                    IdNumber: 'PRC123456789'
                },
                {
                    IdType: 'DSHUDNumber',
                    IdNumber: 'DSHUD123456789'
                },
            ]

            const result = await editAgentGovIds(1, updateData)

            expect(result.success).toBe(true)

            const verifyResult = await getAgentGovIds(1)

            expect(verifyResult.success).toBe(true)
            const sortByIdType = (a: { IdType: string, IdNumber: string | null }, b: { IdType: string, IdNumber: string | null }) => a.IdType.localeCompare(b.IdType);

            expect(verifyResult.data.sort(sortByIdType)).toEqual(updateData.sort(sortByIdType));
        })
    })  

    afterAll(async () => {
        const cleanupDb = truncateAllTables()
        await db.destroy()
    })
})