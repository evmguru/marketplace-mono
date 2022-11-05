import { config as dotenvConfig } from 'dotenv'
import { utils, providers, Wallet } from 'ethers'
import { resolve } from 'path'

import { Nordle, Nordle__factory } from '../types'

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || '../.env'
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) })

const mnemonic: string | undefined = process.env.MNEMONIC
if (!mnemonic) {
  throw new Error('Please set your MNEMONIC in a .env file')
}

const provider = new providers.JsonRpcProvider('https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161')
const wallet = Wallet.fromMnemonic(mnemonic)
const signer = wallet.connect(provider)

// const contractAddress = '0x09aD4fe84C6C3c4C1F31297a751436Df9a506877'
const contractAddress = '0xEeC7c9b7E2A84dD649236d73Cb15614F357bf916'

async function main() {
	const nordle = Nordle__factory.connect(contractAddress, signer)

	const tx = await nordle.requestCreateWord({ gasLimit: 5_000_000 })
	console.log(tx)
	console.log(await tx.wait())

	// const tx = await nordle.withdrawLink({ gasLimit: 5_000_000 })
	// console.log(await tx.wait())

	// console.log(await nordle.tokenWords(0))
}

main().catch((error) => {
  console.error(error)
	process.exit(1)
})