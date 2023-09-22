import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone';
import resolvers from './db/resolvers.js'
import typeDefs from './db/schema.js'
import jwt from 'jsonwebtoken'
import * as dotenv from 'dotenv'

dotenv.config()


import conectarDB from './config/db.js'

// Conectar a la base de datos
conectarDB()

// servidor
const server = new ApolloServer({
    typeDefs,
    resolvers   
});


// levantar el servidor
const { url } = await startStandaloneServer(server, {

    listen: { port: 4000 },
    context: async ({ req, res }) => {
        const token = req.headers.authorization || ''
        if(token) {
            try {
                const usuario = jwt.verify(token, process.env.JWT_SECRET)

                return {
                    usuario
                }
            } catch (error) {
                console.log(error);
            }
        }
    }
  
  });

  console.log(`🚀  Servidor listo en: ${url}`);