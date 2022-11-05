import { config as dotenvConfig } from 'dotenv'
import { utils, providers, BigNumber, Wallet } from 'ethers'
import { resolve } from 'path'

import { Nordle, Nordle__factory } from '../types'

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || '../.env'
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) })

const mnemonic: string | undefined = process.env.MNEMONIC
if (!mnemonic) {
  throw new Error('Please set your MNEMONIC in a .env file')
}

const provider = new providers.JsonRpcProvider('https://rpc.ankr.com/eth_goerli')
const wallet = Wallet.fromMnemonic(mnemonic)
const signer = wallet.connect(provider)

// const contractAddress = '0x09aD4fe84C6C3c4C1F31297a751436Df9a506877'
const contractAddress = '0x701E42E843167AAE8658AB8F5ADcDb4BD2Ed6833'

async function main() {
	const nordle = Nordle__factory.connect(contractAddress, signer)

	// const tx = await nordle['requestCreateWord()']({ gasLimit: 5_000_000 })
	// console.log(tx)
	// console.log(await tx.wait())

	const tx = await nordle['requestCreateWord(string)']('unicorn', { gasLimit: 5_000_000, value: BigNumber.from(5).mul(BigNumber.from(10).pow(16)) })
	console.log(tx)
	console.log(await tx.wait())

	// const tx = await nordle.withdrawLink({ gasLimit: 5_000_000 })
	// console.log(await tx.wait())

	// const tokenId = 0
	// console.log(await nordle.tokenWords(tokenId))
	// console.log(await nordle.ownerOf(tokenId))
	// console.log(await nordle.tokenURI(tokenId))
}

main().catch((error) => {
  console.error(error)
	process.exit(1)
})