import z from 'zod'

export const addTaxRateSchema = z.object({
    taxCode: z.string().max(20),
    taxName: z.string().min(1).max(255),
    vatRate: z.coerce.number().min(0).max(100).default(0),
    wTaxRate: z.coerce.number().min(0).max(100).default(0)
})

export const editTaxRateSchema = z.object({
    taxCode: z.string().max(20).optional(),
    taxName: z.string().min(1).max(255).optional(),
    vatRate: z.coerce.number().min(0).max(100).default(0).optional(),
    wTaxRate: z.coerce.number().min(0).max(100).default(0).optional()
})