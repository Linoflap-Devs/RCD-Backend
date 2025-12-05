import z from 'zod'

export const addTaxRateSchema = z.object({
    taxCode: z.string().max(20),
    taxName: z.string().min(1).max(255),
    vatRate: z.coerce.number().min(0).max(100).default(0),
    wTaxRate: z.coerce.number().min(0).max(100).default(0)
})