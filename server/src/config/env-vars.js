import dotenv from 'dotenv'
import Joi from 'joi'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

import { IS_PRODUCTION } from '../utils/constants'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFileName = IS_PRODUCTION ? '.env' : '.env.dev'
// This config must come before all other imports that rely on process.env
//  and any variables that use process.env (other than IS_PRODUCTION)
dotenv.config({ path: path.join(__dirname, `../../${envFileName}`) })

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),

    PRIVATE_KEY: Joi.string().required(),

    OPENAI_API_KEY: Joi.string().required(),

    WEB3STORAGE_TOKEN: Joi.string().required(),

    SESSION_SECRET: Joi.string().required().description('Secret key for protecting sessions'),
  })
  .unknown()

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env)

if (error) {
  throw new Error(`Config validation error: ${error.message}`)
}

export default {
  env: envVars.NODE_ENV,
  port: envVars.PORT,

  privateKey: envVars.PRIVATE_KEY,

  openAiApiKey: envVars.OPENAI_API_KEY,

  web3StorageToken: envVars.WEB3STORAGE_TOKEN,

  sessionSecret: envVars.SESSION_SECRET,
}
