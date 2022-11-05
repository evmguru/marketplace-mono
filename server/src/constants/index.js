import { providers } from 'ethers'
import { Configuration, OpenAIApi } from 'openai'

import envVars from '../config/env-vars'

export const provider = new providers.JsonRpcProvider(envVars.web3NodeUrl)

const openAiConfig = new Configuration({ apiKey: envVars.openAiApiKey })

export const openai = new OpenAIApi(openAiConfig)

// export function makeStorageClient() {
//   return new Web3Storage({ token: envVars.web3StorageToken })
// }
