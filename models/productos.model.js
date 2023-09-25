import mongoose from 'mongoose'

const productosSchema = mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  existencia: {
    type: Number,
    required: true,
    trim: true
  },
  precio: {
    type: Number,
    required: true,
    trim: true
  }
}, {
  timestamps: true
})

productosSchema.index({ nombre: 'text' })

export const Producto = mongoose.model('Producto', productosSchema)
