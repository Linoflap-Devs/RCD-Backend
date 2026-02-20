import { z } from 'zod'

export const addDivisionRequestSchema = z.object({
    divisionId: z.coerce.number(),
    unitManagerId: z.coerce.number(),
})