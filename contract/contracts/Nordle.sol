//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { Chainlink, ChainlinkClient } from "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import { ConfirmedOwner } from "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import { VRFCoordinatorV2Interface } from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import { VRFConsumerBaseV2 } from "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import { ERC721, ERC721URIStorage } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import { BytesLib } from "./ModBytesLib.sol";

/**
 * Request testnet LINK and ETH here: https://faucets.chain.link/
 * Find information on LINK Token Contracts and get the latest ETH and LINK faucets here:
 * https://docs.chain.link/docs/link-token-contracts/
 */

interface LinkTokenMini {
  function balanceOf(address owner) external view returns (uint256 balance);
  function transfer(address to, uint256 value) external returns (bool success);
}

contract Nordle is ERC721URIStorage, ChainlinkClient, ConfirmedOwner, VRFConsumerBaseV2 {
    using BytesLib for bytes;
    using Chainlink for Chainlink.Request;

    // event CreateWordRequested(bytes url, string indexed word);
    event CreateWordRequestFulfilled(uint256 tokenIdCount, string word);

    // event CombineRequested(bytes url, string indexed words, uint256[] indexed burnIds);
    event CombineRequestFulfilled(bytes32 indexed requestId, bytes indexed data);

    // event FulfilledVRF(uint256 indexed requestId, uint256 randomIndex, string intialWord);

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

    mapping(uint256 => address) public tempRequestCreateWordHolders;

    /// @dev All possible words
    string[] public nordleWords = ["unicorn", "outlier", "ethereum", "pepe"];

    uint256 public wordForcedPrice = 5e16; // 0.05 (18 decimals)

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
        uint256 requestId = VRF_COORDINATOR.requestRandomWords(
            vrfKeyHash,
            vrfSubscriptionId,
            3, // Number of confirmations
            500_000, // Callback gas limit
            1 // Number of generated words
        );
        tempRequestCreateWordHolders[requestId] = msg.sender;
    }

    /// @dev Initiate request to create new word NFT, and you can "buy" a word (initiate it)
    function requestCreateWord(string memory word) public payable {
        require(msg.value == wordForcedPrice, 'Invalid payment');
        uint256 pseudoRequestId = uint256(bytes32(abi.encodePacked(block.timestamp, msg.sender, word)));
        tempRequestCreateWordHolders[pseudoRequestId] = msg.sender;
        _createWord(word, pseudoRequestId);
    }

    /// @dev Callback function for VRF, using the random number to get the initial word
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        uint256 randomIndex = _randomWords[0] % nordleWords.length;
        string memory word = nordleWords[randomIndex];

        // emit FulfilledVRF(_requestId, randomIndex, word);

        _createWord(word, _requestId);
    }

    function _createWord(string memory _initialWord, uint256 _requestId) internal {
        // Chainlink Any API
        Chainlink.Request memory req = buildChainlinkRequest(
            jobIdAnyApi,
            address(this),
            this.fulfillCreateWord.selector
        );
        bytes memory url = drawUrl(_initialWord);
        req.add("get", string(url));
        req.add("path", "payload,data"); // response looks like: { payload: { data: '' } }
        
        bytes32 requestId = sendChainlinkRequest(req, feeAnyApi);
        tempRequestCreateWordHolders[uint256(requestId)] = tempRequestCreateWordHolders[_requestId];
        // delete tempRequestCreateWordHolders[_requestId];

        // emit CreateWordRequested(url, _initialWord);
    }

    /// @dev Fulfill request to create new word NFT
    /// @dev Actual minting happens here
    function fulfillCreateWord(bytes32 requestId, bytes memory bytesData) public recordChainlinkFulfillment(requestId) {
        (string memory imageUrl,,bytes memory wordBytes) = _decodeDrawResponse(bytesData, false);

        // We can cast wordBytes (bytes) to bytes32 because we know it's just one word!
        string memory word = string(wordBytes);

        emit CreateWordRequestFulfilled(tokenIdCount, word);

        _mintWord(tempRequestCreateWordHolders[uint256(requestId)], imageUrl, word);
        // delete tempRequestCreateWordHolders[uint256(requestId)];
    }

    /**
     * @notice Request variable bytes from the oracle
     */
    function requestCombine(uint256[] memory burnIds) public {
        // Validate that caller is owner of all to-be-burned token IDs,
        // while adding all words for combining
        bytes memory burnIdsBytes;
        bytes memory phrase;
        for (uint256 i = 0; i < burnIds.length; i++) {
            require(ownerOf(burnIds[i]) == msg.sender, "Invalid owner of burn ID");
            burnIdsBytes = bytes.concat(burnIdsBytes, bytes32(burnIds[i])); // don't encode pack
            phrase = abi.encode(phrase, tokenWords[burnIds[i]]); // 'happy dolphine' => 'happy_dolphine'
            unchecked {
                i++;
            }
        }

        // Store what phrase was burned for burnIdsBytes
        burnPhraseStorage[burnIdsBytes] = string(phrase);

        // Chainlink Any API
        Chainlink.Request memory req = buildChainlinkRequest(jobIdAnyApi, address(this), this.fulfillCombine.selector);
        bytes memory url = bytes.concat(drawUrl(string(phrase)), "&burnIds=", burnIdsBytes);
        req.addBytes("get", url);
        req.add("path", "payload,data"); // response looks like: { payload: { data: '' } }
        sendChainlinkRequest(req, feeAnyApi);

        // emit CombineRequested(url, string(phrase), burnIds);
    }

    // /**
    //  * @notice Fulfillment function for variable bytes
    //  * @dev This is called by the oracle. recordChainlinkFulfillment must be used.
    //  */
    function fulfillCombine(bytes32 requestId, bytes memory bytesData) public recordChainlinkFulfillment(requestId) {
        emit CombineRequestFulfilled(requestId, bytesData);

        (string memory imageUrl, uint256[] memory burnIds,) = _decodeDrawResponse(bytesData, true);

        // Burn the burned word NFTs, then mint a new one
        bytes memory burnIdsBytes;
        for (uint256 i = 0; i < burnIds.length; i++) {
            _burn(burnIds[i]);
            burnIdsBytes = bytes.concat(burnIdsBytes, bytes32(burnIds[i])); // don't encode pack
            unchecked {
                i++;
            }
        }

        // Mint new token to owner; Retrieve the owner by referencing the first burn Id
        _mintWord(ownerOf(burnIds[0]), imageUrl, burnPhraseStorage[burnIdsBytes]);
    }

    function _mintWord(address owner, string memory imageUrl, string memory phrase) internal {
        _mint(owner, tokenIdCount);
        _setTokenURI(tokenIdCount, imageUrl);
        tokenWords[tokenIdCount] = phrase;
        tokenIdCount++;
    }

    /**
     * Allow withdraw of Link & Native tokens from the contract
     */
    function withdraw() public onlyOwner {
        LinkTokenMini link = LinkTokenMini(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
        (bool sent,) = address(msg.sender).call{value: address(this).balance}("");
        require(sent, "Unable to transfer");
    }

    function drawUrl(string memory phrase) public pure returns (bytes memory) {
        return bytes.concat("https://nordle-server-ltu9g.ondigitalocean.app/draw?phrase=", bytes(phrase));
    }

    /// @dev Decodes response from drawing, based on if it's a CreateWord or Combine
    function _decodeDrawResponse(bytes memory payload, bool isCombine)
        internal
        pure
        returns (
            string memory imageUrl,
            uint256[] memory burnIds,
            // address owner,
            bytes memory phrase
        )
    {
        uint256 index = 0;

        uint256 urlSize = payload.slice(0, 32).toUint256(0);
        index += 32;

        imageUrl = string(payload.slice(index, urlSize));
        index += urlSize;

        if (isCombine) {
            for (uint i = 0; i < (payload.length - index) / 32; i++) {
                burnIds[i] = payload.slice(index, 32).toUint256(0);
                index += 32;
                unchecked { i++; }
            }
        } else {
            // owner = address(uint160(uint256((payload.slice(index, 32).toBytes32(0)))));
            // index += 32;
            phrase = payload.slice(index, payload.length - index);
        }
    }

    // function bytes32ToString(bytes32 input) internal pure returns (string memory) {
    //     uint256 i;
    //     while (i < 32 && input[i] != 0) {
    //         i++;
    //     }
    //     bytes memory array = new bytes(i);
    //     for (uint256 c = 0; c < i; c++) {
    //         array[c] = input[c];
    //         unchecked { c++; }
    //     }
    //     return string(array);
    // }

    // https://github.com/crytic/slither/wiki/Detector-Documentation#contracts-that-lock-ether
    function receive() payable public {}
}
