const mongoose = require('mongoose')


const connectDb = async()=>{
    await mongoose.connect(process.env.MONGO_URI)
    .then(()=>console.log('Database connected successfully')
    ).catch((error)=>console.error('Something went wrong ',error)
    )
    
    
}

module.exports= connectDb