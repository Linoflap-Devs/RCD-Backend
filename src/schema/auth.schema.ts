import z from 'zod'

export const loginAgentSchema = z.object({
    email: z.string().email(),
    password: z.string()
})

export const approveRegistrationSchema = z.object({
    agentRegistrationId: z.coerce.number(),
    agentId: z.number().optional()
})