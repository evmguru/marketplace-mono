//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { Chainlink, ChainlinkClient, LinkTokenInterface } from "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import { ConfirmedOwner } from "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import { VRFCoordinatorV2Interface } from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import { VRFConsumerBaseV2 } from "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import { ERC721, ERC721URIStorage } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import { BytesLib } from "./BytesLib.sol";
import "hardhat/console.sol";

/**
 * Request testnet LINK and ETH here: https://faucets.chain.link/
 * Find information on LINK Token Contracts and get the latest ETH and LINK faucets here:
 * https://docs.chain.link/docs/link-token-contracts/
 */

contract Nordle is ERC721URIStorage, ChainlinkClient, ConfirmedOwner, VRFConsumerBaseV2 {
    using BytesLib for bytes;
    using Chainlink for Chainlink.Request;

    event CreateWordRequested(bytes url, string indexed word);
    event CreateWordRequestFulfilled(bytes32 indexed requestId, bytes indexed data, uint256 tokenIdCount, string word);

    event CombineRequested(bytes url, string[] indexed words, uint256[] indexed burnIds);
    event CombineRequestFulfilled(bytes32 indexed requestId, bytes indexed data);

    event FulFilledVRF(uint256 indexed requestId, uint256 randomIndex, string intialWord);

    /// @dev Chainlink VRF Coordinator
    VRFCoordinatorV2Interface private VRF_COORDINATOR;

    /// @dev Chainlink VRF Subscription ID
    uint64 private immutable vrfSubscriptionId;

    /// @dev Chainlink VRF Max Gas Price Key Hash
    bytes32 private immutable vrfKeyHash;

    /// @dev Chainlink Any API Job ID
    bytes32 private jobIdAnyApi;

    /// @dev Chainlink Any API Fee
    uint256 private feeAnyApi;

    /// @dev NFT Token ID counter
    uint256 private tokenIdCount;

    /// @dev Words (phrase) associated with each token
    mapping(uint256 => string) public tokenWords;

    /// @dev For a list of IDs burned, check what phrase was burned (burnIdsBytes is bytes of arbitrary length)
    /// @dev This is like a snapshot, and also needed when receiving AnyAPI for combining words
    mapping(bytes => string) public burnPhraseStorage;

    /// @dev All possible words
    string[] public nordleWords = ["unicorn", "outlier", "ethereum", "pepe"];

    /**
     * @notice Initialize the link token and target oracle
     * @dev The oracle address must be an Operator contract for multiword response
     *
     * Goerli Testnet details:
     * Link Token: 0x326C977E6efc84E512bB9C30f76E30c160eD06FB
     * Oracle: 0xCC79157eb46F5624204f47AB42b3906cAA40eaB7 (Chainlink DevRel)
     * VRF: 0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D
     * sKeyHash: 0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15
     * jobId: 7da2702f37fd48e5b1b9a5715e3509b6 // https://docs.chain.link/docs/any-api/testnet-oracles/#job-ids
     *
     */
    constructor(
        address linkToken,
        address linkOracle,
        address linkVRFCoordinator,
        bytes32 sKeyHash,
        // bytes32 _jobIdAnyApi,
        uint64 _vrfSubscriptionId
    ) ERC721("Nordle", "NRD") ConfirmedOwner(msg.sender) VRFConsumerBaseV2(linkVRFCoordinator) {
        setChainlinkToken(linkToken);
        setChainlinkOracle(linkOracle);
        // jobIdAnyApi = _jobIdAnyApi;
        // https://docs.chain.link/docs/any-api/testnet-oracles/#job-ids
        jobIdAnyApi = '7da2702f37fd48e5b1b9a5715e3509b6'; // Job ID for GET>bytes
        feeAnyApi = (1 * LINK_DIVISIBILITY) / 10; // 0,1 * 10**18 (Varies by network and job)

        // Intialize the VRF Coordinator
        VRF_COORDINATOR = VRFCoordinatorV2Interface(linkVRFCoordinator);
        vrfSubscriptionId = _vrfSubscriptionId;
        vrfKeyHash = sKeyHash;
    }

    /// @dev Initiate request to create new word NFT
    function requestCreateWord() public {
        //
        // TODO: Chainlink VRF for creating random word
        //
        // VRF_COORDINATOR.requestRandomWords(
        //     vrfKeyHash,
        //     vrfSubscriptionId,
        //     3, // Number of confirmations
        //     100000, // Callback gas limit
        //     1 // Number of generated words
        // );
        _createWord('unicorn');
    }

    /// @dev Callback function for VRF, using the random number to get the initial word
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        uint256 randomIndex = _randomWords[0] % nordleWords.length;
        string memory initialWord = nordleWords[randomIndex];
        console.log("---FullFillVRF---");
        console.log(_requestId, initialWord);
        emit FulFilledVRF(_requestId, randomIndex, initialWord);
        console.log("Emitted");
        _createWord(initialWord);
    }

    function _createWord(string memory _initialWord) internal {
        // Chainlink Any API
        Chainlink.Request memory req = buildChainlinkRequest(
            jobIdAnyApi,
            address(this),
            this.fulfillCreateWord.selector
        );
        bytes memory url = drawUrl(_initialWord);
        req.add("get", string(url));
        req.add("path", "payload,data"); // response looks like: { payload: { data: '' } }
        sendChainlinkRequest(req, feeAnyApi);

        emit CreateWordRequested(url, _initialWord);
    }

    /// @dev Fulfill request to create new word NFT
    /// @dev Actual minting happens here
    function fulfillCreateWord(bytes32 requestId, bytes memory bytesData) public recordChainlinkFulfillment(requestId) {
        (string memory imageUrl, , bytes memory wordBytes) = _decodeDrawResponse(bytesData, false);

        // We can cast wordBytes (bytes) to bytes32 because we know it's just one word!
        string memory word = bytes32ToString(bytes32(wordBytes));

        emit CreateWordRequestFulfilled(requestId, bytesData, tokenIdCount, word);

        _mint(msg.sender, tokenIdCount);
        _setTokenURI(tokenIdCount, imageUrl);
        tokenWords[tokenIdCount] = word;
        tokenIdCount++;
    }

    /**
     * @notice Request variable bytes from the oracle
     */
    function requestCombine(uint256[] memory burnIds) public {
        // Validate that caller is owner of all to-be-burned token IDs,
        // while adding all words for combining
        bytes memory burnIdsBytes;
        string[] memory words;
        for (uint256 i = 0; i < burnIds.length; i++) {
            require(ownerOf(burnIds[i]) == msg.sender, "Invalid owner of burn ID");
            burnIdsBytes = bytes.concat(burnIdsBytes, bytes32(burnIds[i])); // don't encode pack
            words[i] = tokenWords[burnIds[i]];
            unchecked {
                i++;
            }
        }

        // Combine words into a phrase
        string memory phrase = combineWords(words);

        // Store what phrase was burned for burnIdsBytes
        burnPhraseStorage[burnIdsBytes] = phrase;

        // Chainlink Any API
        Chainlink.Request memory req = buildChainlinkRequest(jobIdAnyApi, address(this), this.fulfillCombine.selector);
        bytes memory url = drawUrl(phrase, burnIdsBytes);
        req.addBytes("get", url);
        req.add("path", "payload,data"); // response looks like: { payload: { data: '' } }
        sendChainlinkRequest(req, feeAnyApi);

        emit CombineRequested(url, words, burnIds);
    }

    /**
     * @notice Fulfillment function for variable bytes
     * @dev This is called by the oracle. recordChainlinkFulfillment must be used.
     */
    function fulfillCombine(bytes32 requestId, bytes memory bytesData) public recordChainlinkFulfillment(requestId) {
        emit CombineRequestFulfilled(requestId, bytesData);

        (string memory imageUrl, uint256[] memory burnIds, bytes memory burnIdsBytes) = _decodeDrawResponse(
            bytesData,
            true
        );

        // Retrieve the owner by referencing the first burn Id
        address combineOwner = ownerOf(burnIds[0]);

        // Burn the burned word NFTs, then mint a new one
        for (uint256 i = 0; i < burnIds.length; i++) {
            _burn(burnIds[i]);
            unchecked {
                i++;
            }
        }

        _mint(combineOwner, tokenIdCount);
        _setTokenURI(tokenIdCount, imageUrl);
        tokenWords[tokenIdCount] = burnPhraseStorage[burnIdsBytes];
        tokenIdCount++;
    }

    /**
     * Allow withdraw of Link tokens from the contract
     */
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
    }

    function combineWords(string[] memory words) public pure returns (string memory) {
        bytes memory output;

        for (uint256 i = 0; i < words.length; i++) {
            output = abi.encode(output, "_", words[i]); // 'happy dolphine' => 'happy_dolphine'
            unchecked {
                i++;
            }
        }

        return string(output);
    }

    function drawUrl(string memory phrase) public pure returns (bytes memory) {
        return bytes.concat("https://nordle-server-ltu9g.ondigitalocean.app/draw?phrase=", bytes(phrase));
    }

    function drawUrl(string memory phrase, bytes memory burnIdsBytes) public pure returns (bytes memory) {
        return bytes.concat(drawUrl(phrase), "&burnIds=", burnIdsBytes);
    }

    /// @dev Decodes response from drawing, based on if it's a CreateWord or Combine
    function _decodeDrawResponse(bytes memory payload, bool isCombine)
        private
        pure
        returns (
            string memory imageUrl,
            uint256[] memory burnIds,
            bytes memory burnIdsBytesOrOutputPhrase
        )
    {
        uint256 index = 0;

        uint256 urlSize = payload.slice(0, 32).toUint256(0);
        index += 32;

        imageUrl = string(payload.slice(index, urlSize));
        index += urlSize;

        if (isCombine) {
            uint256 numIds = (payload.length - index) / 32;
            for (uint i = 0; i < numIds; i++) {
                burnIds[i] = payload.slice(index, 32).toUint256(0);
                index += 32;
                unchecked { i++; }
            }
        } else {
            burnIdsBytesOrOutputPhrase = payload.slice(index, payload.length - index);
        }
    }

    function bytes32ToString(bytes32 input) internal pure returns (string memory) {
        uint256 i;
        while (i < 32 && input[i] != 0) {
            i++;
        }
        bytes memory array = new bytes(i);
        for (uint256 c = 0; c < i; c++) {
            array[c] = input[c];
        }
        return string(array);
    }

    /// @dev https://ethereum.stackexchange.com/a/96516
    /// @dev Is this function safe?
    function bytesToString(bytes memory byteCode) public pure returns (string memory stringData) {
        uint256 blank = 0; //blank 32 byte value
        uint256 length = byteCode.length;

        uint256 cycles = byteCode.length / 0x20;
        uint256 requiredAlloc = length;

        if (length % 0x20 > 0) //optimise copying the final part of the bytes - to avoid looping with single byte writes
        {
            cycles++;
            requiredAlloc += 0x20; //expand memory to allow end blank, so we don't smack the next stack entry
        }

        stringData = new string(requiredAlloc);

        //copy data in 32 byte blocks
        assembly {
            let cycle := 0

            for {
                let mc := add(stringData, 0x20) //pointer into bytes we're writing to
                let cc := add(byteCode, 0x20) //pointer to where we're reading from
            } lt(cycle, cycles) {
                mc := add(mc, 0x20)
                cc := add(cc, 0x20)
                cycle := add(cycle, 0x01)
            } {
                mstore(mc, mload(cc))
            }
        }

        //finally blank final bytes and shrink size (part of the optimisation to avoid looping adding blank bytes1)
        if (length % 0x20 > 0) {
            uint256 offsetStart = 0x20 + length;
            assembly {
                let mc := add(stringData, offsetStart)
                mstore(mc, mload(add(blank, 0x20)))
                //now shrink the memory back so the returned object is the correct size
                mstore(stringData, length)
            }
        }
    }
}
