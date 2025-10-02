import z from 'zod'

export const loginAgentSchema = z.object({
    email: z.email(),
    password: z.string()
})

export const registerEmployeeSchema = z.object({
    branchID: z.coerce.number(),
    empName: z.string(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    role: z.enum(['ADMIN', 'SALES ADMIN', 'ACCOUNTING STAFF', 'MANAGEMENT LEVEL', 'BRANCH SALES STAFF', 'HO SALES STAFF']),
    userCode: z.string(),
    userName: z.string(),
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

export const changeForgottonPasswordSchema = z.object({
    email: z.email(),
    resetToken: z.string(),
    newPassword: z.string(),
})