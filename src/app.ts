import express from 'express'
import { db } from './db/db'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from "cookie-parser";

import usersRoutes from './routes/users.routes'

const app = express()
const port = process.env.PORT || 3000
app.set('port', port)

app.use(helmet())
app.use(cors({
    origin: '*',
    credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/users', usersRoutes)


app.listen(3000, () => {
    console.log('Server running on http://localhost:3000')
})
