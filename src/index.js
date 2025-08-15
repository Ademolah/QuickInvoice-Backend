require('dotenv').config()
const express = require('express')
const connectDb = require('./db/db')
const authRoutes = require('./routes/auths')
const invoiceRoutes = require('./routes/invoices')
const userRoutes = require('./routes/users');
const clientRoutes = require('./routes/clientsRoute')

const cors = require('cors')



const app = express()

connectDb()

app.use(cors({
    origin: "http://localhost:3000",
    Credential: true
}))

app.use(express.json())

// app.get('/', async(req, res)={
//     res.('Welcome to QuickInvoice NG API')
// })



app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use("/api/clients", clientRoutes);



app.listen(4000, ()=>{
    console.log('listening on port 4000');
})