import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";

import { developmentChains } from "../helper-hardhat-config";
import { Nordle, Nordle__factory, VRFCoordinatorV2Mock__factory } from "../types";
import { VRFCoordinatorV2Mock } from "../types/@chainlink/contracts/src/v0.8/mocks";

const linkToken = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB";
const linkOracle = "0xCC79157eb46F5624204f47AB42b3906cAA40eaB7";
const linkVRFCoordinator = "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D";
const sKeyHash = "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15";
// const jobId = '0xca98366cc7314957b8c012c72f05aeeb'
const baseFee = ethers.utils.parseEther("0.25");
const gasPriceLink = 1e9;
const vrfSubscriptionFundAmount = ethers.utils.parseEther("2");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Nordle", () => {
      let nordleContract: Nordle;
      let vrfCoordinatorV2MockContract: VRFCoordinatorV2Mock;
      let admin: SignerWithAddress;
      let vrfSubscriptionId: string;

      beforeEach(async function () {
        // Get signer
        const signers: SignerWithAddress[] = await ethers.getSigners();
        admin = signers[0];

        // Deploy the VRF Coordinator Mock
        const vrfCoordinatorV2MockFactory = (await ethers.getContractFactory(
          "VRFCoordinatorV2Mock",
        )) as VRFCoordinatorV2Mock__factory;
        vrfCoordinatorV2MockContract = await vrfCoordinatorV2MockFactory.connect(admin).deploy(baseFee, gasPriceLink);
        // Create the subscription required for the mock
        const transactionResponse = await vrfCoordinatorV2MockContract.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        // The subscription ID is stored in the events
        vrfSubscriptionId = transactionReceipt.events ? transactionReceipt.events[0].args?.subId : "";
        // Fund the subscription
        await vrfCoordinatorV2MockContract.fundSubscription(vrfSubscriptionId, vrfSubscriptionFundAmount);

        // Deploy the Nordle contract
        const nordleFactory = (await ethers.getContractFactory("Nordle")) as Nordle__factory;
        nordleContract = await nordleFactory
          .connect(admin)
          .deploy(linkToken, linkOracle, vrfCoordinatorV2MockContract.address, sKeyHash, vrfSubscriptionId);
        // Add the deployed Nordle contract as a consumer for the VRF Coordinator Mock
        vrfCoordinatorV2MockContract.addConsumer(vrfSubscriptionId, nordleContract.address);
      });

      describe("requestCreateWord", function () {
        // NOTE: Since the mock for the Chainlink Any API is not implemented yet, we have to comment out "_createWord(initialWord)"
        // in the fulfillRandomWords function or the call will otherwise revert
        it("emits fulfilledVRF event", async function () {
          const vrfRequestId = await nordleContract.callStatic.requestCreateWord();
          nordleContract.requestCreateWord();
          await expect(vrfCoordinatorV2MockContract.fulfillRandomWords(vrfRequestId, nordleContract.address))
            .to.emit(nordleContract, "FulFilledVRF")
            .withArgs(vrfRequestId, 1, "outlier");
        });
      });
    });
