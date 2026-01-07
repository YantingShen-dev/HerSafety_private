const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("开始部署合约...");

  // 1. 先部署代币合约
  console.log("\n1. 部署 SafetyToken 代币合约...");
  const SafetyToken = await ethers.getContractFactory("SafetyToken");
  const safetyToken = await SafetyToken.deploy();
  await safetyToken.deployed();
  console.log("SafetyToken 合约已部署到:", safetyToken.address);

  // 2. 部署 SafetyReview 合约，并传入代币合约地址
  console.log("\n2. 部署 SafetyReview 合约...");
  const SafetyReview = await ethers.getContractFactory("SafetyReview");
  const safetyReview = await SafetyReview.deploy(safetyToken.address);
  await safetyReview.deployed();
  console.log("SafetyReview 合约已部署到:", safetyReview.address);

  // 3. 将 SafetyReview 合约设置为代币的奖励合约
  console.log("\n3. 设置 SafetyReview 为代币奖励合约...");
  const setRewardTx = await safetyToken.setRewardContract(safetyReview.address);
  await setRewardTx.wait();
  console.log("奖励合约设置完成");
  
  const deployerAddress = await safetyReview.signer.getAddress();
  console.log("\n部署者地址:", deployerAddress);
  
  // 获取网络信息
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "sepolia" : network.name;
  const chainId = Number(network.chainId);
  
  // 保存合约地址到文件
  const contractInfo = {
    safetyReview: {
      address: safetyReview.address,
      deployer: deployerAddress,
    },
    safetyToken: {
      address: safetyToken.address,
      deployer: deployerAddress,
    },
    network: networkName,
    chainId: chainId
  };
  
  // 确保目录存在
  const contractInfoDir = path.join(__dirname, '../const');
  if (!fs.existsSync(contractInfoDir)) {
    fs.mkdirSync(contractInfoDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(contractInfoDir, 'contract-info.json'), 
    JSON.stringify(contractInfo, null, 2)
  );
  
  console.log("\n合约信息已保存到 const/contract-info.json");
  console.log("\n✅ 部署完成！");
  console.log(`\n网络: ${networkName} (Chain ID: ${chainId})`);
  console.log("\n请更新 frontend/src/config.js 中的合约地址：");
  console.log(`CONTRACT_ADDRESS = '${safetyReview.address}'`);
  console.log(`TOKEN_CONTRACT_ADDRESS = '${safetyToken.address}'`);
  console.log(`NETWORK_URL = '${networkName === "sepolia" ? "https://ethereum-sepolia-rpc.publicnode.com" : "http://127.0.0.1:8545"}'`);
  console.log(`CHAIN_ID = ${chainId}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

