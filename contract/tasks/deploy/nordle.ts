import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
// eslint-disable-next-line import/no-extraneous-dependencies
import { task } from 'hardhat/config'
import type { TaskArguments } from 'hardhat/types'

import { Nordle, Nordle__factory } from '../../types'

task('deploy:Nordle')
  // .addParam('coreBridgeAddress', 'Wormhole Core Bridge Address')
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners()
    const nordleFactory = await ethers.getContractFactory('Nordle') as Nordle__factory

    // Goerli config
    const linkToken = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB'
    const linkOracle = '0xCC79157eb46F5624204f47AB42b3906cAA40eaB7'
    const linkVRFCoordinator = '0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D'
    const sKeyHash = '0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15'
    // const jobId = '0xca98366cc7314957b8c012c72f05aeeb'
    const vrfSubscriptionId = 10

    // { nonce: 39, gasPrice: 1e10 } => override when hanging
    const nordle: Nordle = await nordleFactory.connect(signers[0]).deploy(linkToken, linkOracle, linkVRFCoordinator, sKeyHash, vrfSubscriptionId)
    await nordle.deployed()

    console.log('Nordle deployed to: ', nordle.address)
  })
