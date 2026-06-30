import { z } from 'zod'

export const demoteUMSchema = z.object({
    replacementUmId: z.coerce.number().optional(),
}).optional()