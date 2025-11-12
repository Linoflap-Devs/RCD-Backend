import z from 'zod'

export const addProjectSchema = z.object({
    projectCode: z.string().max(20),
    projectName: z.string().min(1).max(255),
    developerId: z.coerce.number(),
    sectorId: z.coerce.number(),
    projectTypeId: z.coerce.number(),
    address: z.string().max(255),
    contactNumber: z.string().max(20),
    isLeadProject: z.coerce.boolean()
})