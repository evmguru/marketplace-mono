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
const contractAddress = '0xF630d757eD2b9DCcC3ed0d81820eb635d87ad350';

async function main() {
  const nordle = Nordle__factory.connect(contractAddress, signer);

  const txResponse = await nordle.withdraw({
    gasLimit: 5_000_000,
  });
  console.log('hash: ', txResponse.hash);
  await txResponse.wait(1);
  console.log('Withdrew!');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
