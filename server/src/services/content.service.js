import { utils } from 'ethers';
// import * as fs from 'fs'
import httpStatus from 'http-status';
import { Web3Storage } from 'web3.storage';

import { ApiError } from '../utils';
import { openai } from '../constants';

// const loadJSON = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)))
// const DeployedContractAbi = loadJSON('../constants/DeployedContract.json')

// const overrides = {
//   gasLimit: 5_000_000,
// }

const abiCoder = new utils.AbiCoder();

export async function draw(options) {
  try {
    const { phrase } = options;

    // const response = await openai.createImage({
    //   prompt: phrase.split('_').join(' '), // happy_unicorn => happy unicorn
    //   n: 1,
    //   size: '512x512',
    // })
    // const imageUrl = response.data.data[0].url

    // TODO: Generate DALL-E image and save to IPFS, and return that link

    // const imageUrl = 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-j7QXf8rISyjEHz1qT8BcRXBI/user-cPKQfE1yYROUxPeytMJ0wWfB/img-Ctl95G6mTo6JLV2Tsimhnr6p.png?st=2022-11-05T04%3A27%3A00Z&se=2022-11-05T06%3A27%3A00Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-11-05T01%3A11%3A23Z&ske=2022-11-06T01%3A11%3A23Z&sks=b&skv=2021-08-06&sig=iUrwm8bp0W6v22CIJtN2p0ryU4xesU%2BeQ5EXs/K21aM%3D'
    const imageUrl =
      'https://ipfs.io/ipfs/bafybeicizq4zwelyxkwq2rwsavhppxyrczodmyolgyqks5kgmbgekw5x5a/55181940.jpg';

    return imageUrl;

    const imageUrlLength = utils.toUtf8Bytes(imageUrl).length;
    console.log(imageUrlLength, imageUrl);

    // Return byte-converted data of:
    // 1) byte length of Image URL (uint256)
    // 2) actual Image URL (converted to bytes)
    // 3a) bytes of burn token IDs (each ID is uint256 or 32 bytes)
    // 3b) Or prhase

    // NOTE: MUST USE `utils.solidityPack` in ethers.js to mimic `abi.encode()` in Solidity
    const bytesData = utils.solidityPack(
      ['uint256', 'string', 'string'],
      [imageUrlLength, imageUrl, phrase]
    );

    console.log('---phrase---');
    console.log(phrase);

    console.log('---imageUrl---');
    console.log(imageUrl);

    console.log('---bytesData---');
    console.log(bytesData);

    return bytesData;
  } catch (e) {
    console.log(e);
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Internal server error'
    );
  }
}
