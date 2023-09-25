import mongoose from 'mongoose'
import * as dotenv from 'dotenv'

dotenv.config()

const conectarDB = async () => {
  try {
    await mongoose.connect(process.env.DB_MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    console.log('DB Conectada')
  } catch (error) {
    console.log('Hubo un error')
    console.log(error)
    process.exit(1) // detener la app
  }
}

export default conectarDB
