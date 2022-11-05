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
  // dummy data for now (unicorn)
  return '0x00000000000000000000000000000000000000000000000000000000000001d80000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000026000000000000000000000000000000000000000000000000000000000000001d868747470733a2f2f6f616964616c6c6561706970726f64736375732e626c6f622e636f72652e77696e646f77732e6e65742f707269766174652f6f72672d6a3751586638724953796a45487a317154384263525842492f757365722d63504b516645317959524f5578506579744d4a30775766422f696d672d6d613637796c675241767257594a366e775a426c315354722e706e673f73743d323032322d31312d3035543031253341333325334134365a2673653d323032322d31312d3035543033253341333325334134365a2673703d722673763d323032312d30382d30362673723d6226727363643d696e6c696e6526727363743d696d6167652f706e6726736b6f69643d36616161646564652d346662332d343639382d613866362d36383464373738366230363726736b7469643d61343863636135362d653664612d343834652d613831342d39633834393635326263623326736b743d323032322d31312d3035543032253341333325334134365a26736b653d323032322d31312d3036543032253341333325334134365a26736b733d6226736b763d323032312d30382d3036267369673d37445363486a6767333651786f4948466a45397678647579687a415933623837725952766f657459384c3425334400000000000000000000000000000000000000000000000000000000000000000000000000000007756e69636f726e00000000000000000000000000000000000000000000000000'
  /*
  try {
    const { phrase, burnIds } = options

    const response = await openai.createImage({
      prompt: phrase.split('_').join(' '), // happy_unicorn => happy unicorn
      n: 1,
      size: '512x512',
    })
    const imageUrl = response.data.data[0].url
    const imageUrlBytes = utils.toUtf8Bytes(imageUrl)

    // Return byte-converted data of:
    // 1) byte length of Image URL (uint64 max)
    // 2) actual Image URL (converted to bytes)
    // 3a) bytes of burn token IDs (each ID is uint256 or 32 bytes)
    // 3b) Or prhase
    let bytesData = ''
    if (burnIds) {
      bytesData = abiCoder.encode(
        ['uint64', 'bytes', 'bytes'],
        [imageUrlBytes.length, imageUrlBytes, burnIds],
      )
    } else {
      bytesData = abiCoder.encode(
        ['uint64', 'bytes', 'string'],
        [imageUrlBytes.length, imageUrlBytes, phrase],
      )
    }
    return bytesData
  } catch (e) {
    console.log(e)
    if (e instanceof ApiError) throw e
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Internal server error')
  }
  */
}
