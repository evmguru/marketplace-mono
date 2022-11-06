import { utils } from 'ethers'
// import * as fs from 'fs'
import httpStatus from 'http-status'
import fetch from 'node-fetch'
import { Readable } from 'stream'
import { File } from 'web3.storage'

import { ApiError } from '../utils'
import { makeStorageClient, openai } from '../constants'

// const loadJSON = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)))
// const DeployedContractAbi = loadJSON('../constants/DeployedContract.json')

// const overrides = {
//   gasLimit: 5_000_000,
// }

const storage = makeStorageClient()

function ReadableBufferStream(arrayBuffer) {
  return new Readable({
    start(controller) {
      controller.enqueue(arrayBuffer)
      controller.close()
    },
  })
}

export async function draw(options) {
  try {
    const { phrase } = options

    const response = await openai.createImage({
      prompt: decodeURIComponent(phrase), // happy_unicorn => happy unicorn
      n: 1,
      size: '512x512',
    })
    const generatedImageUrl = response.data.data[0].url
    // const generatedImageUrl = 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-j7QXf8rISyjEHz1qT8BcRXBI/user-cPKQfE1yYROUxPeytMJ0wWfB/img-S1SXRBRQ7bEmZAWRGGLgugZv.png?st=2022-11-06T15%3A07%3A12Z&se=2022-11-06T17%3A07%3A12Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2022-11-06T01%3A44%3A00Z&ske=2022-11-07T01%3A44%3A00Z&sks=b&skv=2021-08-06&sig=loXWhtW%2BRIIfFR8OR/64a1KUJgjLrV0ixCw4F28LxRU%3D'
    // console.log(generatedImageUrl)

    const imageBuffer = await fetch(generatedImageUrl).then((res) => res.arrayBuffer())
    const imageName = decodeURIComponent(phrase).split(' ').join('_')
    const imageFile = new File([imageBuffer], imageName) // need to convert to `File` for web3.storage

    const cid = await storage.put([imageFile])
    if (!cid) throw new Error('IPFS upload failed')

    const imageUrl = `https://${cid}.ipfs.w3s.link/${imageName}`
    const imageUrlLength = utils.toUtf8Bytes(imageUrl).length
    console.log(imageUrlLength, imageUrl)

    // Return byte-converted data of:
    // 1) byte length of Image URL (uint256)
    // 2) actual Image URL (converted to bytes)
    // 3a) bytes of burn token IDs (each ID is uint256 or 32 bytes)
    // 3b) Or prhase

    // NOTE: MUST USE `utils.solidityPack` in ethers.js to mimic `abi.encode()` in Solidity
    const bytesData = utils.solidityPack(
      ['uint256', 'string', 'string'],
      [imageUrlLength, imageUrl, phrase],
    )

    console.log('---phrase---')
    console.log(phrase)

    console.log('---imageUrl---')
    console.log(imageUrl)

    console.log('---bytesData---')
    console.log(bytesData)

    return bytesData
  } catch (e) {
    console.log(e)
    if (e instanceof ApiError) throw e
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Internal server error',
    )
  }
}
