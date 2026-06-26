import { z } from 'zod'

export const demoteUMSchema = z.object({
    unitManagerId: z.coerce.number().optional(),
}).optional()