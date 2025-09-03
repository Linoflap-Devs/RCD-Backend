import z from 'zod'

export const registerAgentSchema = z.object({
    firstName: z.string().max(150),
    middleName: z.string().max(50).optional(),
    lastName: z.string().max(50),
    gender: z.enum(['Male', 'Female']),
    civilStatus: z.enum(['Single', 'Married']),
    religion: z.string().max(50),
    birthdate: z.coerce.date(),
    birthplace: z.string().max(50),
    address: z.string().max(255),
    telephoneNumber: z.coerce.string().max(20).optional(),
    contactNumber: z.coerce.string().max(20).optional(),
    sssNumber: z.string().max(20).optional(),
    philhealthNumber: z.string().max(20).optional(),
    pagibigNumber: z.string().max(20).optional(),
    tinNumber: z.string().max(20).optional(),
    prcNumber: z.string().max(20).optional(),
    dshudNumber: z.string().max(20).optional(),
    employeeIdNumber: z.string().max(20).optional(),
    email: z.email(),
    password: z.string(),

    profileImage: z.instanceof(File).optional(),

    education: z.array(
        z.object({
            school: z.string().max(100),
            degree: z.string().max(100),
            startDate: z.coerce.date(),
            endDate: z.coerce.date().optional(),
        })
    ).optional(),
    experience: z.array(
        z.object({
            jobTitle: z.string().max(100),
            company: z.string().max(100),
            startDate: z.coerce.date(),
            endDate: z.coerce.date().optional(),
        })
    ).optional(),
})