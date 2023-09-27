import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { ApolloServerErrorCode } from '@apollo/server/errors'
import resolvers from './db/resolvers.js'
import typeDefs from './db/schema.js'
import jwt from 'jsonwebtoken'
import * as dotenv from 'dotenv'

import conectarDB from './config/db.js'
import { GraphQLError } from 'graphql'

dotenv.config()

// Conectar a la base de datos
conectarDB()

// servidor
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    // Return a different error message
    if (
      formattedError.extensions.code ===
      ApolloServerErrorCode.GRAPHQL_VALIDATION_FAILED
    ) {
      return {
        ...formattedError,
        message: "Your query doesn't match the schema. Try double-checking it!"
      }
    }

    // Otherwise return the formatted error. This error can also
    // be manipulated in other ways, as long as it's returned.
    return formattedError
  }
})

// levantar el servidor
const { url } = await startStandaloneServer(server, {

  listen: { port: 4000 },
  context: async ({ req, res }) => {
    const token = req.headers.authorization || ''
    if (token) {
      try {
        const usuario = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET)

        return {
          usuario
        }
      } catch (error) {
        throw new GraphQLError(error)
      }
    }
  }

})

console.log(`🚀  Servidor listo en: ${url}`)
