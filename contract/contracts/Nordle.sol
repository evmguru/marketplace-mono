//SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { Chainlink, ChainlinkClient, LinkTokenInterface } from '@chainlink/contracts/src/v0.8/ChainlinkClient.sol';
import { ConfirmedOwner } from '@chainlink/contracts/src/v0.8/ConfirmedOwner.sol';
import { ERC721 } from '@openzeppelin/contracts/token/ERC721/ERC721.sol';

import { BytesLib } from './BytesLib.sol';

/**
 * Request testnet LINK and ETH here: https://faucets.chain.link/
 * Find information on LINK Token Contracts and get the latest ETH and LINK faucets here: https://docs.chain.link/docs/link-token-contracts/
 */

contract Nordle is ERC721, ChainlinkClient, ConfirmedOwner {
    using BytesLib for bytes;
    using Chainlink for Chainlink.Request;

    event RequestFulfilled(bytes32 indexed requestId, bytes indexed data);

    event CombineRequested(bytes url, string[] indexed words, uint256[] indexed burnIds);

    bytes32 private jobId;
    uint256 private fee;

    uint256 private tokenIdCount;

    /// @dev Words (phrase) associated with each token
    mapping(uint256 => string) tokenWords;

    /// @dev For a list of IDs burned, check what phrase was burned (burnIdsBytes is bytes of arbitrary length)
    mapping(bytes => string) burnPhraseStorage;

    /**
     * @notice Initialize the link token and target oracle
     * @dev The oracle address must be an Operator contract for multiword response
     *
     *
     * Goerli Testnet details:
     * Link Token: 0x326C977E6efc84E512bB9C30f76E30c160eD06FB
     * Oracle: 0xCC79157eb46F5624204f47AB42b3906cAA40eaB7 (Chainlink DevRel)
     * jobId: 7da2702f37fd48e5b1b9a5715e3509b6
     *
     */
    constructor(
        address linkToken,
        address linkOracle,
        bytes32 _jobId
    ) ERC721('Nordle', 'NRD') ConfirmedOwner(msg.sender) {
        setChainlinkToken(linkToken);
        setChainlinkOracle(linkOracle);
        jobId = _jobId;
        fee = (1 * LINK_DIVISIBILITY) / 10; // 0,1 * 10**18 (Varies by network and job)
    }

    /**
     * @notice Request variable bytes from the oracle
     */
    function requestCombine(string[] memory words, uint256[] memory burnIds) public {
        // Validate that caller is owner of all to-be-burned token IDs
        bytes memory burnIdsBytes;
        for (uint i = 0; i < words.length; i++) {
            require(ownerOf(burnIds[i]) == msg.sender, 'Invalid owner of burn ID');
            burnIdsBytes = bytes.concat(burnIdsBytes, bytes32(burnIds[i])); // don't encode pack
            unchecked { i++; }
        }

        // Combine words into a phrase
        string memory phrase = combineWords(words);

        // Store what phrase was burned for burnIdsBytes
        burnPhraseStorage[burnIdsBytes] = phrase;

        // Chainlink Any API
        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfillCombine.selector);
        bytes memory url = drawUrl(phrase, burnIdsBytes);
        req.addBytes('get', url);
        req.add('path', 'payload,data'); // response looks like: { payload: { data: '' } }
        sendChainlinkRequest(req, fee);

        emit CombineRequested(url, words, burnIds);
    }

    /**
     * @notice Fulfillment function for variable bytes
     * @dev This is called by the oracle. recordChainlinkFulfillment must be used.
     */
    function fulfillCombine(bytes32 requestId, bytes memory bytesData) public recordChainlinkFulfillment(requestId) {
        emit RequestFulfilled(requestId, bytesData);

        (string memory imageUrl, uint256[] memory burnIds, bytes memory burnIdsBytes) = _decodeDrawResponse(bytesData);

        // Retrieve the owner by referencing the first burn Id
        address combineOwner = ownerOf(burnIds[0]);

        // Burn the burned word NFTs, then mint a new one
        for (uint i = 0; i < burnIds.length; i++) {
            _burn(burnIds[i]);
            unchecked { i++; }
        }

        _mint(combineOwner, tokenIdCount);
        tokenWords[tokenIdCount] = burnPhraseStorage[burnIdsBytes];
        tokenIdCount++;
    }

    /**
     * Allow withdraw of Link tokens from the contract
     */
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), 'Unable to transfer');
    }

    function combineWords(string[] memory words) public pure returns (string memory) {
        bytes memory output;

        for (uint i = 0; i < words.length; i++) {
            output = abi.encode(output, words[i]);
            unchecked { i++; }
        }

        return string(output);
    }

    function drawUrl(string memory words, bytes memory burnIds) public pure returns (bytes memory) {
        return bytes.concat(
            'https://api.nordle.lol/draw?words=',
            bytes(words),
            '&burnIds=',
            burnIds
        );
    }

    function _decodeDrawResponse(bytes memory payload)
        private
        view
        returns (string memory imageUrl, uint256[] memory burnIds, bytes memory burnIdsBytes)
    {
        uint index = 0;

        uint urlSize = uint256(payload.slice(0,8).toUint64(0));
        index += 8;

        // uint s = 0;
        // while (s < urlSize) {
        //     s += 256;
        // }
        imageUrl = bytesToString(payload.slice(8, uint256(urlSize)));
        index += urlSize;

        uint j = 0;
        while (index < payload.length) {
            bytes32 bib = payload.slice(index, index + 32).toBytes32(0);
            burnIdsBytes = bytes.concat(burnIdsBytes, bib);
            burnIds[j] = uint256(bib);
            index += 256;
            j++;
        }
    }

    function bytes32ToString(bytes32 input) internal pure returns (string memory) {
        uint256 i;
        while (i < 32 && input[i] != 0) {
            i++;
        }
        bytes memory array = new bytes(i);
        for (uint c = 0; c < i; c++) {
            array[c] = input[c];
        }
        return string(array);
    }

    /// @dev https://ethereum.stackexchange.com/a/96516
    /// @dev Is this function safe?
    function bytesToString(bytes memory byteCode) public pure returns(string memory stringData) {
        uint256 blank = 0; //blank 32 byte value
        uint256 length = byteCode.length;

        uint cycles = byteCode.length / 0x20;
        uint requiredAlloc = length;

        if (length % 0x20 > 0) //optimise copying the final part of the bytes - to avoid looping with single byte writes
        {
            cycles++;
            requiredAlloc += 0x20; //expand memory to allow end blank, so we don't smack the next stack entry
        }

        stringData = new string(requiredAlloc);

        //copy data in 32 byte blocks
        assembly {
            let cycle := 0

            for
            {
                let mc := add(stringData, 0x20) //pointer into bytes we're writing to
                let cc := add(byteCode, 0x20)   //pointer to where we're reading from
            } lt(cycle, cycles) {
                mc := add(mc, 0x20)
                cc := add(cc, 0x20)
                cycle := add(cycle, 0x01)
            } {
                mstore(mc, mload(cc))
            }
        }

        //finally blank final bytes and shrink size (part of the optimisation to avoid looping adding blank bytes1)
        if (length % 0x20 > 0)
        {
            uint offsetStart = 0x20 + length;
            assembly
            {
                let mc := add(stringData, offsetStart)
                mstore(mc, mload(add(blank, 0x20)))
                //now shrink the memory back so the returned object is the correct size
                mstore(stringData, length)
            }
        }
    }
}