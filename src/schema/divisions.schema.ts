import { z } from 'zod'

export const addDivisionRequestSchema = z.object({
    divisionId: z.coerce.number().optional(),
    unitManagerId: z.coerce.number(),
})