import { Usuario } from '../models/usuarios.model.js'
import { Producto } from '../models/productos.model.js'
import { Cliente } from '../models/clientes.model.js'
import { Pedido } from '../models/pedidos.model.js'
import bcriptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import * as dotenv from 'dotenv'
import { GraphQLError } from 'graphql'

dotenv.config()

const crearToken = (usuario, secreta, expiresIn) => {
  const { id, email, nombre, apellido } = usuario
  return jwt.sign({ id, email, nombre, apellido }, secreta, { expiresIn })
}

// Resolvers
const resolvers = {
  Query: {
    obtenerUsuario: async (_, {}, ctx) => {
      return ctx.usuario
    },
    obtenerProductos: async () => {
      try {
        const productos = await Producto.find({})
        return productos
      } catch (error) {
        throw new GraphQLError(error)
      }
    },
    obtenerProducto: async (_, { id }) => {
      try {
        // revisar si el producto existe o no
        const producto = await Producto.findById(id)

        if (!producto) {
          throw new Error('Producto no encontrado')
        }

        return producto
      } catch (error) {
        throw new GraphQLError(error)
      }
    },
    obtenerClientes: async () => {
      try {
        const clientes = await Cliente.find({})
        return clientes
      } catch (error) {
        throw new GraphQLError(error)
      }
    },
    obtenerClientesVendedor: async (_, {}, ctx) => {
      try {
        const clientes = await Cliente.find({ vendedor: ctx.usuario.id.toString() })
        return clientes
      } catch (error) {
        throw new GraphQLError(error)
      }
    },
    obtenerCliente: async (_, { id }, ctx) => {
      try {
        // Revisar si el cliente existe o no
        const existeCliente = await Cliente.findById(id)

        if (!existeCliente) {
          throw new Error('El cliente no existe')
        }

        // Quien lo creo puede verlo
        if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
          throw new Error('No tienes autorización para esta acción')
        }

        return existeCliente
      } catch (error) {
        throw new GraphQLError(error)
      }
    },
    obtenerPedidos: async () => {
      try {
        const pedidos = await Pedido.find({})
        return pedidos
      } catch (error) {
        throw new GraphQLError(error)
      }
    },
    obtenerPedidoVendedor: async (_, {}, ctx) => {
      try {
        const pedidos = await Pedido.find({ vendedor: ctx.usuario.id.toString() })
        return pedidos
      } catch (error) {
        throw new GraphQLError(error)
      }
    },
    obtenerPedido: async (_, { id }, ctx) => {
      // Validar si el pedido existe o no
      const existePedido = await Pedido.findById(id)

      if (!existePedido) {
        throw new GraphQLError('Pedido no encontrado')
      }

      // Solo quien lo creo puede verlo
      if (existePedido.vendedor.toString() !== ctx.usuario.id) {
        throw new GraphQLError('No tienes las credenciales')
      }

      // retornar el resultado
      return existePedido
    },
    obtenerPedidosEstado: async (_, { estado }, ctx) => {
      try {
        const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado })
        return pedidos
      } catch (error) {
        throw new GraphQLError(error)
      }
    },
    mejoresClientes: async () => {
      try {
        const clientes = await Pedido.aggregate([
          { $match: { estado: 'COMPLETADO' } },
          {
            $group: {
              _id: '$cliente',
              total: { $sum: '$total' }
            }
          },
          {
            $lookup: {
              from: 'clientes',
              localField: '_id',
              foreignField: '_id',
              as: 'cliente'
            }
          },
          {
            $limit: 10
          },
          {
            $sort: { total: -1 }
          }
        ])

        return clientes
      } catch (error) {
        throw new GraphQLError(error)
      }
    },
    mejoresVendedores: async () => {
      try {
        const vendedores = await Pedido.aggregate([
          { $match: { estado: 'COMPLETADO' } },
          {
            $group: {
              _id: '$vendedor',
              total: { $sum: '$total' }
            }
          },
          {
            $lookup: {
              from: 'usuarios',
              localField: '_id',
              foreignField: '_id',
              as: 'vendedor'
            }
          },
          {
            $limit: 3
          },
          {
            $sort: { total: -1 }
          }
        ])

        return vendedores
      } catch (error) {
        throw new GraphQLError(error)
      }
    },
    buscarProducto: async (_, { texto }, ctx) => {
      try {
        const productos = await Producto.find({ $text: { $search: texto } }).limit(10)

        return productos
      } catch (error) {
        throw new GraphQLError(error)
      }
    }
  },
  Mutation: {
    nuevoUsuario: async (_, { input }, ctx) => {
      const { email, password } = input

      // TODO Revisar si el usuario ya esta registrado
      const existeUsuario = await Usuario.findOne({ email })
      if (existeUsuario) {
        throw new GraphQLError('El usuario ya esta registrado')
      }

      // TODO Hashear su password
      const salt = bcriptjs.genSaltSync(10)
      input.password = bcriptjs.hashSync(password, salt)

      try {
        // TODO Guardarlo en la base de datos
        const usuario = new Usuario(input)
        usuario.save()
        return usuario
      } catch (error) {
        console.log(error)
      }
    },
    autenticarUsuario: async (_, { input }) => {
      const { email, password } = input
      // TODO Verificar si el usuario existe
      const existeUsuario = await Usuario.findOne({ email })
      if (!existeUsuario) {
        throw new GraphQLError('El usuario no existe')
      }

      // TODO Revisar si el password es correcto
      const passwordCorrecto = bcriptjs.compareSync(password, existeUsuario.password)

      if (!passwordCorrecto) {
        throw new GraphQLError('Credenciales inválidas')
      }

      // TODO Crear el token
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
    actualizarProducto: async (_, { id, input }) => {
      try {
        const existeProducto = await Producto.findById(id)

        if (!existeProducto) {
          throw new GraphQLError('Producto no encontrado')
        }

        const productoActualizado = await Producto.findByIdAndUpdate(id, input, { new: true })

        return productoActualizado
      } catch (error) {
        console.log(error)
      }
    },
    eliminarProducto: async (_, { id }) => {
      try {
        const existeProducto = await Producto.findById(id)

        if (!existeProducto) {
          throw new GraphQLError('Producto no encontrado')
        }

        await Producto.findByIdAndDelete(id)

        return 'Producto eliminado'
      } catch (error) {
        console.log(error)
      }
    },
    nuevoCliente: async (_, { input }, ctx) => {
      try {
        const { email } = input
        // Verificar si el cliente ya esta registrado
        const existeCliente = await Cliente.findOne({ email })

        if (existeCliente) {
          throw new Error('Este cliente ya existe')
        }

        // TODO Asignar al vendedor
        const nuevoCliente = new Cliente(input)
        nuevoCliente.vendedor = ctx.usuario.id

        // TODO Guardarlo en la base de datos
        const clienteGuardado = await nuevoCliente.save()
        return clienteGuardado
      } catch (error) {
        throw new GraphQLError(error)
      }
    },
    actualizarCliente: async (_, { id, input }, ctx) => {
      try {
        // verificar si existe o no
        const existeCliente = await Cliente.findById(id)

        if (!existeCliente) {
          throw new GraphQLError('Ese cliente ya esta registrado')
        }
        // Verificar si el vendedor es quien edita
        if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
          throw new GraphQLError('No tienes autorización para esta acción')
        }

        // Guardar el cliente
        const clienteActualizado = await Cliente.findByIdAndUpdate(id, input, { new: true })

        return clienteActualizado
      } catch (error) {
        console.log(error)
      }
    },
    eliminarCliente: async (_, { id }, ctx) => {
      try {
        // Verificar si existe o no
        const existeCliente = await Cliente.findById(id)

        if (!existeCliente) {
          throw new Error('Ese cliente no existe')
        }

        // Verificar si el vendedor es quien edita
        if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
          throw new Error('No tienes autorización para esta acción.')
        }

        // Eliminar Cliente
        await Cliente.findByIdAndDelete(id)
        return 'Cliente eliminado.'
      } catch (error) {
        throw new GraphQLError(error)
      }
    },
    nuevoPedido: async (_, { input }, ctx) => {
      const { cliente } = input

      // Verificar si el cliente existe o no
      const existeCliente = await Cliente.findById(cliente)

      if (!existeCliente) {
        throw new GraphQLError('Este cliente no existe')
      }

      // Verificar si el cliente es del vendedor
      if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
        throw new GraphQLError('No tienes las credenciales')
      }

      // Revisar que el stock este disponible
      for await (const articulo of input.pedido) {
        const { id } = articulo

        const producto = await Producto.findById(id)

        if (articulo.cantidad > producto.existencia) {
          throw new GraphQLError(`El articulo: ${producto.nombre} excede la cantidad disponible`)
        } else {
          // Restar la cantidad a lo disponible
          producto.existencia = producto.existencia - articulo.cantidad

          await producto.save()
        }
      }

      // Crear un nuevo pedido
      const nuevoPedido = new Pedido(input)

      // Asignarle un vendedor
      nuevoPedido.vendedor = ctx.usuario.id

      // Guardarlo en la base de datos
      const pedidoGuardado = await nuevoPedido.save()
      return pedidoGuardado
    },
    actualizarPedido: async (_, { id, input }, ctx) => {
      try {
        const { cliente } = input

        // Si el pedido existe
        const existePedido = await Pedido.findById(id)

        if (!existePedido) {
          throw new Error('El pedido no existe')
        }

        // Si el cliente existe
        const existeCliente = await Cliente.findById(cliente)
        if (!existeCliente) {
          throw new Error('El cliente no existe')
        }

        // Si el cliente y pedido pertenece al vendedor
        if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
          throw new Error('No tienen las credenciales')
        }

        // Revisar el stock
        if (input.pedido) {
          for await (const articulo of input.pedido) {
            const { id } = articulo

            const producto = await Producto.findById(id)

            if (articulo.cantidad > producto.existencia) {
              throw new GraphQLError(`El articulo: ${producto.nombre} excede la cantidad disponible`)
            } else {
              // Restar la cantidad a lo disponible
              producto.existencia = producto.existencia - articulo.cantidad

              await producto.save()
            }
          }
        }

        // Guardar el pedido
        const pedidoActualizado = await Pedido.findByIdAndUpdate(id, input, { new: true })
        return pedidoActualizado
      } catch (error) {
        throw new GraphQLError(error)
      }
    },
    eliminarPedido: async (_, { id }, ctx) => {
      try {
        // Verificar si existe o no
        const existePedido = await Pedido.findById(id)

        if (!existePedido) {
          throw new Error('Este pedido no existe')
        }

        // Verificar sie vendedor es quien edita
        if (existePedido.vendedor.toString() !== ctx.usuario.id) {
          throw new Error('No tienes autorización para esta acción')
        }

        // Eliminar pedido
        await Pedido.findByIdAndDelete(id)
        return 'Pedido eliminado...'
      } catch (error) {
        throw new GraphQLError(error)
      }
    }
  }
}

export default resolvers
