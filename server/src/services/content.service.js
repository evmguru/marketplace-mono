import { utils } from 'ethers'
// import * as fs from 'fs'
import httpStatus from 'http-status'

import { ApiError } from '../utils'
import { openai } from '../constants'

// const loadJSON = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)))
// const DeployedContractAbi = loadJSON('../constants/DeployedContract.json')

// const overrides = {
//   gasLimit: 5_000_000,
// }

const abiCoder = new utils.AbiCoder()

export async function draw(options) {
  try {
    const { words, burnIds } = options

    const response = await openai.createImage({
      prompt: words.split('_').join(' '), // happy_unicorn => happy unicorn
      n: 1,
      size: '512x512',
    })
    const imageUrl = response.data.data[0].url
    const imageUrlBytes = utils.toUtf8Bytes(imageUrl)

    // Return byte-converted data of:
    // 1) byte length of Image URL (uint64 max)
    // 2) actual Image URL (converted to bytes)
    // 3) bytes of burn token IDs (each ID is uint256 or 32 bytes)
    const bytesData = abiCoder.encode(
      ['uint64', 'bytes', 'bytes'],
      [
        imageUrlBytes.length,
        imageUrlBytes,
        burnIds,
      ],
    )
    return bytesData
  } catch (e) {
    console.log(e)
    if (e instanceof ApiError) throw e
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Internal server error')
  }
}
