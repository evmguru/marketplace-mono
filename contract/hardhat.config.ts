import './tasks/accounts';
import './tasks/deploy';
import '@nomicfoundation/hardhat-toolbox';
import { config as dotenvConfig } from 'dotenv';
import 'hardhat-contract-sizer';
import type { HardhatUserConfig } from 'hardhat/config';
import type { NetworkUserConfig } from 'hardhat/types';
import { resolve } from 'path';

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || './.env';
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

// Ensure that we have all the environment variables we need.
const mnemonic: string | undefined = process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error('Please set your MNEMONIC in a .env file');
}

const infuraApiKey: string | undefined = process.env.INFURA_API_KEY;
if (!infuraApiKey) {
  throw new Error('Please set your INFURA_API_KEY in a .env file');
}

const chainIds = {
  'arbitrum-mainnet': 42161,
  avalanche: 43114,
  'avalanche-fuji': 43113,
  bsc: 56,
  goerli: 5,
  hardhat: 31337,
  mainnet: 1,
  'optimism-mainnet': 10,
  'polygon-mainnet': 137,
  mumbai: 80001,
  'klaytn-baobab': 1001,
};

function getChainConfig(chain: keyof typeof chainIds): NetworkUserConfig {
  let jsonRpcUrl: string;
  switch (chain) {
    case 'avalanche':
      jsonRpcUrl = 'https://api.avax.network/ext/bc/C/rpc';
      break;
    case 'goerli':
      jsonRpcUrl = `https://goerli.infura.io/v3/${infuraApiKey}`;
      // jsonRpcUrl = 'https://rpc.ankr.com/eth_goerli';
      break;
    case 'mumbai':
      jsonRpcUrl = 'https://rpc.ankr.com/polygon_mumbai';
      break;
    case 'avalanche-fuji':
      jsonRpcUrl = 'https://api.avax-test.network/ext/bc/C/rpc';
      break;
    case 'klaytn-baobab':
      jsonRpcUrl = 'https://api.baobab.klaytn.net:8651';
      break;
    case 'bsc':
      jsonRpcUrl = 'https://bsc-dataseed1.binance.org';
      break;
    default:
      jsonRpcUrl = `https://${chain}.infura.io/v3/${infuraApiKey}`;
  }
  return {
    // accounts: {
    //   count: 10,
    //   mnemonic,
    //   path: "m/44'/60'/0'/0",
    // },
    accounts: [process.env.PRIVATE_KEY as string],
    chainId: chainIds[chain],
    url: jsonRpcUrl,
    allowUnlimitedContractSize: true,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY || '',
      avalanche: process.env.SNOWTRACE_API_KEY || '',
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || '',
      bsc: process.env.BSCSCAN_API_KEY || '',
      bscTestnet: process.env.BSCSCAN_API_KEY || '',
      goerli: process.env.ETHERSCAN_API_KEY || '',
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      optimisticEthereum: process.env.OPTIMISM_API_KEY || '',
      polygon: process.env.POLYGONSCAN_API_KEY || '',
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || '',
      // fantom: process.env.FANTOMSCAN_API_KEY || '',
    },
  },
  gasReporter: {
    currency: 'USD',
    enabled: !!process.env.REPORT_GAS,
    excludeContracts: [],
    src: './contracts',
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic,
      },
      chainId: chainIds.hardhat,
      allowUnlimitedContractSize: true,
    },
    //
    // Local
    //
    // FORK_CHAIN_ID=31337 npx hardhat node --fork https://rpc.ankr.com/eth --port 8545
    localEvm1: {
      accounts: { mnemonic },
      // chainId: chainIds.mainnet,
      url: 'http://localhost:8545',
      chainId: process.env.FORK_CHAIN_ID ? Number(process.env.FORK_CHAIN_ID) : 31337,
    },
    // FORK_CHAIN_ID=xxxxx npx hardhat node --fork https://rpc.ankr.com/polygon --port 8546
    localEvm2: {
      accounts: { mnemonic },
      url: 'http://localhost:8546',
      chainId: process.env.FORK_CHAIN_ID ? Number(process.env.FORK_CHAIN_ID) : 31337,
    },
    // FORK_CHAIN_ID=xxxxx npx hardhat node --fork https://rpc.ankr.com/avalanche --port 8547
    localEvm3: {
      accounts: { mnemonic },
      url: 'http://localhost:8547',
      chainId: process.env.FORK_CHAIN_ID ? Number(process.env.FORK_CHAIN_ID) : 31337,
    },
    // actual networks
    arbitrum: getChainConfig('arbitrum-mainnet'),
    avalanche: getChainConfig('avalanche'),
    fuji: getChainConfig('avalanche-fuji'),
    baobab: getChainConfig('klaytn-baobab'),
    bsc: getChainConfig('bsc'),
    goerli: getChainConfig('goerli'),
    mainnet: getChainConfig('mainnet'),
    optimism: getChainConfig('optimism-mainnet'),
    polygon: getChainConfig('polygon-mainnet'),
    mumbai: getChainConfig('mumbai'),
    'polygon-mumbai': getChainConfig('mumbai'),
  },
  paths: {
    artifacts: './artifacts',
    cache: './cache',
    sources: './contracts',
    tests: './test',
  },
  solidity: {
    compilers: [{ version: '0.4.11' }, { version: '0.8.7' }, { version: '0.8.8' }],
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: 'none',
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 10,
      },
    },
  },
  // outputSelection: {
  //   '*': {
  //     '*': ['evm.assembly', 'irOptimized']
  //   }
  // },
  typechain: {
    outDir: 'types',
    target: 'ethers-v5',
  },
};

export default config;
