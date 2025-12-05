import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from "cookie-parser";
import morgan from 'morgan'

import usersRoutes from './routes/users.routes'
import authRoutes from './routes/auth.routes'
import dashboardRoutes from './routes/dashboard.routes'
import salesRoutes from './routes/sales.routes'
import divisionRoutes from './routes/division.routes'
import agentRoutes from './routes/agents.routes'
import commissionRoutes from './routes/commission.routes'
import projectRoutes from './routes/projects.routes'
import branchRoutes from './routes/branches.routes'
import developerRoutes from './routes/developers.routes'
import sectorRoutes from './routes/sectors.routes'
import taxRoutes from './routes/tax.routes'
import { db } from './db/db';
import { sql } from 'kysely';
import { checkDatabaseHealth } from './repository/health.repository';

const app = express()
const port = Number(process.env.PORT) || 3000
app.set('port', port)

app.use(helmet())
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'https://rcd-web-staging.netlify.app'],
    credentials: true
}))
app.use(morgan('dev'))

app.use(express.json({limit: '50mb'}))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/division', divisionRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/commissions', commissionRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/branches', branchRoutes)
app.use('/api/developers', developerRoutes)
app.use('/api/sectors', sectorRoutes)
app.use('/api/tax-rates', taxRoutes)

app.get('/', (async (req, res) => {

    const dbCheck = await checkDatabaseHealth()

    return res.status(200).json({
        message: 'Welcome to RCD API',
        health: {
            database: dbCheck ? 'healthy' : 'unhealthy'
        }
    })
}))

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on PORT ${port}`)
})
