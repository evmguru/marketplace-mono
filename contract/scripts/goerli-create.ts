import { NORDLE_CONTRACT_ADDRESS } from '../constants';
import { Nordle, Nordle__factory } from '../types';
import { config as dotenvConfig } from 'dotenv';
import { utils, providers, BigNumber, Wallet } from 'ethers';
import { resolve } from 'path';

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || '../.env';
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

const mnemonic: string | undefined = process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error('Please set your MNEMONIC in a .env file');
}

const provider = new providers.JsonRpcProvider('https://rpc.ankr.com/eth_goerli');
const wallet = Wallet.fromMnemonic(mnemonic);
const signer = wallet.connect(provider);

// const contractAddress = '0xC3FAFbcDB0BC46805721c8A91dBD65a13fC15507'
// const contractAddress = '0x35387421Ac8B25E9d178B73F3a6fCfc1e995fAee';
// const contractAddress = '0xF630d757eD2b9DCcC3ed0d81820eb635d87ad350';

async function main() {
  const nordle = Nordle__factory.connect(NORDLE_CONTRACT_ADDRESS, signer);

  // const tx = await nordle['requestCreateWord()']({ gasLimit: 5_000_000 })
  // console.log(tx)
  // console.log(await tx.wait())

  const txResponse = await nordle['requestCreateWord(string)']('flying', {
    gasLimit: 5_000_000,
    value: BigNumber.from(5).mul(BigNumber.from(10).pow(16)),
  });
  console.log('hash: ', txResponse.hash);
  await txResponse.wait(1);
  console.log('Sent request to Chainlink Any API!');

  // const tx = await nordle.requestCombine([0, 1], { gasLimit: 5_000_000, nonce: 109, gasPrice: BigNumber.from(20).mul(BigNumber.from(10).pow(9)) })
  // console.log(tx)
  // console.log(await tx.wait())

  // const tx = await nordle.withdraw({ gasLimit: 5_000_000, nonce: 106, gasPrice: BigNumber.from(20).mul(BigNumber.from(10).pow(9)) })
  // console.log(tx)
  // console.log(await tx.wait())

  // console.log(await nordle.tokenWords(0), await nordle.tokenWords(1))
  // console.log(await nordle.ownerOf(0), await nordle.ownerOf(1))
  // console.log(await nordle.tokenURI(0), await nordle.tokenURI(1))
  // unicorn
  // 0x93aDbfFeD776f0a18943A32DaF92CD2D7FfADDb3
  // https://ipfs.io/ipfs/bafybeicizq4zwelyxkwq2rwsavhppxyrczodmyolgyqks5kgmbgekw5x5a/55181940.jpg

  // const linkToken = new Contract('0x326C977E6efc84E512bB9C30f76E30c160eD06FB', ERC20Abi, signer)
  // console.log(await linkToken.transfer(contractAddress, BigNumber.from(3).mul(BigNumber.from(10).pow(17)), { gasLimit: 5_000_000, nonce: 108, gasPrice: BigNumber.from(20).mul(BigNumber.from(10).pow(9)) }))
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
