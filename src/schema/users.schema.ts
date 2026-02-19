import z from 'zod'

export const registerAgentSchema = z.object({
    firstName: z.string().max(150),
    middleName: z.string().max(50).optional(),
    lastName: z.string().max(50),
    gender: z.enum(['Male', 'Female']),
    civilStatus: z.enum(['Single', 'Married']),
    religion: z.string().max(50).optional(),
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

export const registerInviteSchema = z.object({
    inviteToken: z.string().max(255),
    firstName: z.string().max(150),
    middleName: z.string().max(50).optional(),
    lastName: z.string().max(50),
    gender: z.enum(['Male', 'Female']),  
    birthdate: z.coerce.date(),
    address: z.string().max(255),
    email: z.email(),
    password: z.string(),
})


export const registerBrokerSchema = z.object({
    firstName: z.string().max(150),
    middleName: z.string().max(50).optional(),
    lastName: z.string().max(50),
    gender: z.enum(['Male', 'Female']),
    civilStatus: z.enum(['Single', 'Married']),
    religion: z.string().max(50).optional(),
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
    brokerType: z.enum(['hands-on', 'hands-off']),

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

export const addAgentSchema = z.object({
    agentCode: z.string().max(50),
    firstName: z.string().max(150),
    middleName: z.string().max(50).optional(),
    lastName: z.string().max(50),
    sex: z.enum(['Male', 'Female']),
    civilStatus: z.enum(['Single', 'Married']),
    divisionID: z.coerce.number().optional(),
    positionID: z.coerce.number().optional(),
    agentTaxRate: z.coerce.number().gt(0),
    birthdate: z.coerce.date(),
    address: z.string().max(255),
    contactNumber: z.string().max(20),
    telephoneNumber: z.coerce.string().max(20).optional(),
    referredByID: z.coerce.number().optional(),
    prcNumber: z.string().max(20).optional(),
    referredCode: z.string().max(50).optional(),
    personEmergency: z.string().max(255).optional(),
    contactEmergency: z.string().max(50).optional(),
    addressEmergency: z.string().max(255).optional(),
    religion: z.string().max(50).optional(),
    birthplace: z.string().max(50).optional(),
    sssNumber: z.string().max(20).optional(),
    philhealthNumber: z.string().max(20).optional(),
    pagibigNumber: z.string().max(20).optional(),
    tinNumber: z.string().max(20).optional(),
    dshudNumber: z.string().max(20).optional(),
    employeeIdNumber: z.string().max(20).optional(),
})

export const editAgentSchema = z.object({
    firstName: z.string().max(150).optional(),
    middleName: z.string().max(50).optional(),
    lastName: z.string().max(50).optional(),
    gender: z.enum(['Male', 'Female']).optional(),
    civilStatus: z.enum(['Single', 'Married']).optional(),
    religion: z.string().max(50).optional(),
    birthdate: z.coerce.date().optional(),
    birthplace: z.string().max(50).optional(),
    address: z.string().max(255).optional(),
    telephoneNumber: z.coerce.string().max(20).optional(),
    contactNumber: z.coerce.string().max(20).optional(), 
})


export const addBrokerSchema = z.object({
    brokerType: z.enum(['hands-on', 'hands-off']),
    brokerCode: z.string().max(50),
    firstName: z.string().max(150),
    middleName: z.string().max(50).optional(),
    lastName: z.string().max(50),
    sex: z.enum(['Male', 'Female']),
    civilStatus: z.enum(['Single', 'Married']),
    positionID: z.coerce.number().optional(),
    brokerTaxRate: z.coerce.number().gt(0),
    birthdate: z.coerce.date(),
    address: z.string().max(255),
    contactNumber: z.string().max(20),
    telephoneNumber: z.coerce.string().max(20).optional(),
    referredByID: z.coerce.number().optional(),
    prcNumber: z.string().max(20).optional(),
    referredCode: z.string().max(50).optional(),
    personEmergency: z.string().max(255).optional(),
    contactEmergency: z.string().max(50).optional(),
    addressEmergency: z.string().max(255).optional(),
    religion: z.string().max(50).optional(),
    birthplace: z.string().max(50).optional(),
    sssNumber: z.string().max(20).optional(),
    philhealthNumber: z.string().max(20).optional(),
    pagibigNumber: z.string().max(20).optional(),
    tinNumber: z.string().max(20).optional(),
    dshudNumber: z.string().max(20).optional(),
    employeeIdNumber: z.string().max(20).optional(),
})

export const editAgentGovIdsSchema = z.array(
    z.object({
        IdType: z.enum(['PRCNumber', 'DSHUDNumber', 'SSSNumber', 'PhilhealthNumber', 'PagIbigNumber', 'TINNumber', 'EmployeeIDNumber']),
        IdNumber: z.string()
    })
)