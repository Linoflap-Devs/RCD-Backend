import z from 'zod'

export const addPendingSaleSchema = z.object({
    reservationDate: z.coerce.date(),
    salesBranchID: z.coerce.number(),
    sectorID: z.coerce.number(),
    buyersName: z.string().max(255),
    address: z.string().max(255),
    phoneNumber: z.string().max(20),
    occupation: z.string().max(255),
    projectID: z.coerce.number(),
    blkFlr: z.string().max(10),
    lotUnit: z.string().max(10),
    phase: z.string().max(10),
    lotArea: z.coerce.number(),
    flrArea: z.coerce.number(),
    developerCommission: z.coerce.number().optional(),
    netTCP: z.coerce.number(),
    miscFee: z.coerce.number(),
    financingScheme: z.string().max(255),
    downpayment: z.coerce.number(),
    dpTerms: z.coerce.number(),
    monthlyPayment: z.coerce.number(),
    dpStartDate: z.coerce.date(),
    sellerName: z.string().max(255),
})

export const addSalesTargetSchema = z.object({
    entity: z.string().max(255),
    year: z.coerce.number(),
    divisionId: z.coerce.number(),
    amount: z.coerce.number(),
})

export const editSalesTargetSchema = z.object({
    entity: z.string().max(255).optional(),
    year: z.coerce.number().optional(),
    divisionId: z.coerce.number().optional(),
    amount: z.coerce.number().optional(),
})