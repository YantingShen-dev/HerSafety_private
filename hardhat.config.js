require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");

// 可选加载 dotenv（如果已安装）
try {
  require("dotenv").config();
} catch (e) {
  // dotenv 未安装，跳过
  console.log("提示: dotenv 未安装，如需使用环境变量请运行: npm install dotenv");
}

// 处理私钥：确保有 0x 前缀
function getPrivateKey() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    return null;
  }
  // 如果私钥没有 0x 前缀，添加它
  return privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      viaIR: true,
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: (() => {
        const pk = getPrivateKey();
        if (!pk) {
          console.warn("⚠️  警告: PRIVATE_KEY 未设置，无法部署到 Sepolia 网络");
          return [];
        }
        return [pk];
      })(),
      chainId: 11155111,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};