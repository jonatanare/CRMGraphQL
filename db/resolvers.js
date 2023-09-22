import { Usuario } from '../models/usuarios.model.js'
import { Producto } from '../models/productos.model.js'
import { Cliente } from '../models/clientes.model.js'
import bcriptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import * as dotenv from 'dotenv'

dotenv.config()

const crearToken = (usuario, secreta, expiresIn) => {
    const { id, email, nombre, apellido } = usuario
    return jwt.sign({id,email, nombre, apellido}, secreta, { expiresIn })
}


// Resolvers
const resolvers = {
    Query: {
        obtenerUsuario: async(_, { token }) => {
            const usuarioId = await jwt.verify(token, process.env.JWT_SECRET)

            return usuarioId
        },
        obtenerProductos: async () => {
            try {
                const productos = await Producto.find({})
                return productos
            } catch (error) {
                console.log(error)
            }
        },
        obtenerProducto: async (_, { id }) => {
            try {
                // revisar si el producto existe o no
            const producto = await Producto.findById(id)

            if(!producto) {
                throw new Error('Producto no encontrado')
            }

            return producto
            } catch (error) {
                console.log(error)
            }
        },
        obtenerClientes: async () => {
            try {
                const clientes = await Cliente.find({})
                return clientes
            } catch (error) {
                console.log(error)
            }
        },
        obtenerClientesVendedor: async (_, {}, ctx) => {
            try {
                const clientes = await Cliente.find({ vendedor: ctx.usuario.id.toString()})
                return clientes
            } catch (error) {
                console.log(error);
            }
        },
        obtenerCliente: async(_, { id }, ctx) => {
            try {
                // Revisar si el cliente existe o no
                const existeCliente = await Cliente.findById(id)

                if(!existeCliente) {
                    throw new Error('El cliente no existe')
                }

                // Quien lo creo puede verlo
                if(existeCliente.vendedor.toString() !== ctx.usuario.id) {
                    throw new Error('No tienes autorización para esta acción')
                }

                return existeCliente

            } catch (error) {
                console.log(error)
            }
        }
    },
    Mutation: {
        nuevoUsuario: async (_, { input }, ctx) => {
            const { email, password } = input

            //TODO Revisar si el usuario ya esta registrado
            const existeUsuario = await Usuario.findOne({ email })
            if(existeUsuario) {
                throw new Error('El usuario ya esta registrado')
            }

            //TODO Hashear su password
            const salt = bcriptjs.genSaltSync(10)
            input.password = bcriptjs.hashSync(password, salt)


           try {
            //TODO Guardarlo en la base de datos
            const usuario = new Usuario(input)
            usuario.save()
            return usuario
           } catch (error) {
            console.log(error)
           }
        },
        autenticarUsuario: async (_, { input}) => {

            const { email, password } = input
            //TODO Verificar si el usuario existe
            const existeUsuario = await Usuario.findOne({email})
            if(!existeUsuario) {
                throw new Error('El usuario no existe')
            }

            //TODO Revisar si el password es correcto
            const passwordCorrecto = bcriptjs.compareSync(password, existeUsuario.password)

            if(!passwordCorrecto) {
                throw new Error('Credenciales inválidas')
            }

            //TODO Crear el token
            return {
                token: crearToken(existeUsuario, process.env.JWT_SECRET, '24h')
            }
        },
        nuevoProducto: async (_, { input }) => {
            try {
                const producto = new Producto(input)

                // Almacenar en la bd
                const nuevoProducto = await producto.save()

                return nuevoProducto
            } catch (error) {
                console.log(error)
            }
        },
        actualizarProducto: async (_, {id, input}) => {
            try {
                const existeProducto = await Producto.findById(id)

                if(!existeProducto) {
                    throw new Error('Producto no encontrado')
                }

                const productoActualizado = await Producto.findByIdAndUpdate(id, input, {new : true})

                return productoActualizado
            } catch (error) {
                console.log(error);
            }
        },
        eliminarProducto: async (_, { id }) => {
            try {
                const existeProducto = await Producto.findById(id)

                if(!existeProducto) {
                    throw new Error('Producto no encontrado')
                }

                await Producto.findByIdAndDelete(id)

                return "Producto eliminado"
            } catch (error) {
                console.log(error);
            }
        },
        nuevoCliente: async (_, { input }, ctx) => {
            try {
                const { email } = input
                // Verificar si el cliente ya esta registrado
                const existeCliente = await Cliente.findOne({email})

                if(existeCliente) {
                    throw new Error('Este cliente ya existe')
                }

                //TODO Asignar al vendedor
                const nuevoCliente = new Cliente(input)
                nuevoCliente.vendedor = ctx.usuario.id


                // TODO Guardarlo en la base de datos
                const clienteGuardado = await nuevoCliente.save()
                return clienteGuardado
            } catch (error) {
                console.log(error)
            }
        }
    }
}

export default resolvers