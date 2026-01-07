// 合约配置
// 注意：部署后需要更新这些地址
// 默认使用 Sepolia 测试网配置，如需切换到本地网络，请修改下面的配置

// Sepolia 测试网配置
export const CONTRACT_ADDRESS = '0xCD4603b516a5388786DcB8f1b7FEF2EC0777B9F2' // SafetyReview合约地址
export const TOKEN_CONTRACT_ADDRESS = '0xd7C7Db332a3f4D12629f03D669b36FDc4601B414' // SafetyToken合约地址
export const NETWORK_URL = 'https://ethereum-sepolia-rpc.publicnode.com'
export const CHAIN_ID = 11155111 // Sepolia Chain ID

// 本地网络配置（备用）
// export const CONTRACT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
// export const TOKEN_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'
// export const NETWORK_URL = 'http://127.0.0.1:8545'
// export const CHAIN_ID = 31337

// 合约 ABI (从编译后的文件提取)
export const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "reviewId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "submitter", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "address_text", "type": "string"},
      {"indexed": false, "internalType": "int256", "name": "latitude", "type": "int256"},
      {"indexed": false, "internalType": "int256", "name": "longitude", "type": "int256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "ReviewSubmitted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "getAllReviews",
    "outputs": [{
      "components": [
        {"internalType": "uint256", "name": "id", "type": "uint256"},
        {"internalType": "string", "name": "address_text", "type": "string"},
        {"internalType": "int256", "name": "latitude", "type": "int256"},
        {"internalType": "int256", "name": "longitude", "type": "int256"},
        {"internalType": "string", "name": "province", "type": "string"},
        {"internalType": "string", "name": "city", "type": "string"},
        {"internalType": "string", "name": "district", "type": "string"},
        {"internalType": "uint8", "name": "night_lighting", "type": "uint8"},
        {"internalType": "uint8", "name": "security_status", "type": "uint8"},
        {"internalType": "uint8", "name": "female_density", "type": "uint8"},
        {"internalType": "uint8", "name": "overall_safety", "type": "uint8"},
        {"internalType": "string", "name": "text_review", "type": "string"},
        {"internalType": "string", "name": "ai_summary", "type": "string"},
        {"internalType": "string", "name": "keywords", "type": "string"},
        {"internalType": "address", "name": "submitter", "type": "address"},
        {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
      ],
      "internalType": "struct SafetyReview.Review[]",
      "name": "",
      "type": "tuple[]"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getReviewCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "_id", "type": "uint256"},
      {"internalType": "string", "name": "_address", "type": "string"},
      {"internalType": "int256", "name": "_latitude", "type": "int256"},
      {"internalType": "int256", "name": "_longitude", "type": "int256"},
      {"internalType": "string", "name": "_province", "type": "string"},
      {"internalType": "string", "name": "_city", "type": "string"},
      {"internalType": "string", "name": "_district", "type": "string"},
      {"internalType": "uint8", "name": "_night_lighting", "type": "uint8"},
      {"internalType": "uint8", "name": "_security_status", "type": "uint8"},
      {"internalType": "uint8", "name": "_female_density", "type": "uint8"},
      {"internalType": "uint8", "name": "_overall_safety", "type": "uint8"},
      {"internalType": "string", "name": "_text_review", "type": "string"},
      {"internalType": "string", "name": "_ai_summary", "type": "string"},
      {"internalType": "string", "name": "_keywords", "type": "string"}
    ],
    "name": "submitReview",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
    "name": "getUserTokenBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "recipient", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": true, "internalType": "uint256", "name": "reviewId", "type": "uint256"}
    ],
    "name": "TokenRewarded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "rewardAmount", "type": "uint256"}
    ],
    "name": "NewUserRegistered",
    "type": "event"
  },
  {
    "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
    "name": "isUserRegistered",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "registerOrLogin",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "bool", "name": "isNewUser", "type": "bool"}
    ],
    "name": "UserLoggedIn",
    "type": "event"
  }
]

// SafetyToken 合约 ABI
export const TOKEN_CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "_account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
]

