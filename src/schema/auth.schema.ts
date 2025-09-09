import z from 'zod'

export const loginAgentSchema = z.object({
    email: z.email(),
    password: z.string()
})

export const loginEmployeeSchema = z.object({
    username: z.string(),
    password: z.string()
})

export const approveRegistrationSchema = z.object({
    agentRegistrationId: z.coerce.number(),
    agentId: z.coerce.number().optional()
})

export const verifyOTPSchema = z.object({
    email: z.email(),
    otp: z.string()
})

export const changePasswordSchema = z.object({
    email: z.email(),
    resetToken: z.string(),
    oldPassword: z.string(),
    newPassword: z.string(),
})