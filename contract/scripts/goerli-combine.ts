import { NORDLE_CONTRACT_ADDRESS } from '../constants';
import { Nordle, Nordle__factory } from '../types';
import { config as dotenvConfig } from 'dotenv';
import { utils, providers, BigNumber, Wallet, ethers } from 'ethers';
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

const defaultServerResponseBytes =
  '0x000000000000000000000000000000000000000000000000000000000000005d68747470733a2f2f697066732e696f2f697066732f6261667962656963697a71347a77656c79786b7771327277736176687070787972637a6f646d796f6c6779716b73356b676d6267656b77357835612f35353138313934302e6a7067756e69636f726e';

type WordToken = {
  id: number;
};

async function main() {
  console.log('---goerli-combine---');
  const nordle = Nordle__factory.connect(NORDLE_CONTRACT_ADDRESS, signer);

  const token0: WordToken = {
    id: 0,
  };

  const token1: WordToken = {
    id: 1,
  };

  console.log('---Token0 Info:');
  console.log('Owner: ', await nordle.ownerOf(token0.id));
  console.log('Token Words: ', await nordle.tokenWords(token0.id));
  console.log('TokenURI: ', await nordle.tokenURI(token0.id));
  console.log('---Token1 Info:');
  console.log('Owner: ', await nordle.ownerOf(token1.id));
  console.log('Token Words: ', await nordle.tokenWords(token1.id));
  console.log('TokenURI: ', await nordle.tokenURI(token1.id));

  console.log('----------');

  const requestId = await nordle.callStatic.requestCombine([token0.id, token1.id]);
  console.log('Request ID: ', requestId);
  const requestCombineTx = await nordle.requestCombine([token0.id, token1.id], {
    gasLimit: 5_000_000,
  });
  console.log('combineTx: ', requestCombineTx.hash);
  await requestCombineTx.wait(1);

  console.log('---fulfillCombine---');
  // const requestId = ethers.utils.solidityPack(['uint256'], ['0x1']);
  const fulfillCombineTx = await nordle.fulfillCombine(requestId, defaultServerResponseBytes, {
    gasLimit: 5_000_000,
  });
  console.log('fulfillCombineTx: ', fulfillCombineTx.hash);
  await fulfillCombineTx.wait(1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
