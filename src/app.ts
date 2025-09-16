import express from 'express'
import { db } from './db/db'
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

const app = express()
const port = process.env.PORT || 3000
app.set('port', port)

app.use(helmet())
app.use(cors({
    origin: '*',
    credentials: true
}))
app.use(morgan('dev'))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
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

app.get('/', (async (req, res) => {
    res.send('Hello World!')
}))

app.listen(port, () => {
    console.log(`Server running on PORT ${port}`)
})
