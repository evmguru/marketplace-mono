import { NORDLE_CONTRACT_ADDRESS } from '../../constants';
import { ERC20, ERC20__factory, Nordle, Nordle__factory } from '../../types';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
// eslint-disable-next-line import/no-extraneous-dependencies
import { task } from 'hardhat/config';
import type { TaskArguments } from 'hardhat/types';

task('deploy:Nordle')
  // .addParam('coreBridgeAddress', 'Wormhole Core Bridge Address')
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    console.log('Deploying Nordle...');
    const signers: SignerWithAddress[] = await ethers.getSigners();

    // Withdraw link from prev contract
    console.log('Withdrawing LINK from prev Nordle...');
    const prevNordle: Nordle = Nordle__factory.connect(NORDLE_CONTRACT_ADDRESS, signers[0]);
    const prevNordleWithdrawTx = await prevNordle.withdraw();
    await prevNordleWithdrawTx.wait(1);
    console.log('Withdrew LINK from prev Nordle!');

    // Deploy Nordle contract
    console.log('Deploying Nordle...');
    const nordleFactory = (await ethers.getContractFactory('Nordle')) as Nordle__factory;

    // Goerli config
    const linkToken = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB';
    const linkOracle = '0xCC79157eb46F5624204f47AB42b3906cAA40eaB7';
    const linkVRFCoordinator = '0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D';
    const sKeyHash = '0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15';
    // const jobId = '7da2702f37fd48e5b1b9a5715e3509b6'
    // const vrfSubscriptionId = 6097
    const vrfSubscriptionId = 6108;

    // { nonce: 39, gasPrice: 1e10 } => override when hanging
    const nordle: Nordle = await nordleFactory
      .connect(signers[0])
      .deploy(linkToken, linkOracle, linkVRFCoordinator, sKeyHash, vrfSubscriptionId);
    await nordle.deployed();

    console.log('Nordle deployed to: ', nordle.address);

    // Fund deployed contract
    console.log('Funding contract with LINK...');
    const fundingLinkAmount = ethers.utils.parseEther('0.5');
    const linkTokenContract = ERC20__factory.connect(linkToken, signers[0]);
    const linkTransferTx = await linkTokenContract.transfer(nordle.address, fundingLinkAmount);
    await linkTransferTx.wait(1);
    console.log('Funded contract with LINK!');
  });
