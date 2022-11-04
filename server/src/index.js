import compression from 'compression'
import cors from 'cors'
import session from 'cookie-session'
import express from 'express'
import helmet from 'helmet'
import httpStatus from 'http-status'
import xss from 'xss-clean'

import { morgan, envVars } from './config'
import { errorConverter, errorHandler } from './middlewares/error'
import routes from './routes'
import { ApiError, logger } from './utils'

const app = express()

if (envVars.env !== 'test') {
  app.use(morgan.successHandler)
  app.use(morgan.errorHandler)
}

// set security HTTP headers
app.use(helmet())

// parse json request body
app.use(express.json())

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }))

// sanitize request data
app.use(xss())

// gzip compression
app.use(compression())

// enable cors
app.use(cors())
app.options('*', cors())

// use cookie helper
// app.use(cookieParser(envVars.cookieSecret))

// use session helper (for persistent session over server)
app.use(session({ secret: envVars.sessionSecret, resave: true, saveUninitialized: false }))

app.use('/', routes)

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Requested path not found'))
})

// convert error to ApiError, if needed
app.use(errorConverter)

// handle error
app.use(errorHandler)

//
// Start app server
//
const server = app.listen(envVars.port || 3000, () => {
  logger.info(`Listening to port ${envVars.port}`)
})

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed')
      process.exit(1)
    })
  } else {
    process.exit(1)
  }
}

const unexpectedErrorHandler = (error) => {
  console.log(error)
  exitHandler()
}

process.on('uncaughtException', unexpectedErrorHandler)
process.on('unhandledRejection', unexpectedErrorHandler)
