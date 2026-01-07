# HerSafety_private

女性安全地图 - 基于区块链的去中心化安全评价平台  
👉[访问地址]([https://example.com](https://her-safety-private.vercel.app/))  


## 项目简介

HerSafety 是一个基于区块链技术的女性安全地图应用，允许用户在地图上标记和评价地点的安全性，所有评价数据存储在以太坊 Sepolia 测试网上，确保数据的不可篡改性和透明性。

## 技术栈

### 前端
- Vue.js 3
- Vite
- Ethers.js
- 百度地图 API

### 后端
- Python (Vercel Serverless Functions)
- 百度地图 API 代理
- DeepSeek AI 分析

### 区块链
- Solidity
- Hardhat
- Ethereum Sepolia Testnet

## 功能特性

- 🗺️ 交互式地图浏览
- 📍 地点标记和评价
- ⛓️ 区块链数据存储
- 🎁 代币奖励机制
- 🤖 AI 评价分析
- 📊 数据统计和可视化

## 快速开始

### 本地开发

1. **安装依赖**
   ```bash
   # 安装前端依赖
   cd frontend
   npm install
   
   # 安装后端依赖
   pip install -r requirements.txt
   ```

2. **配置环境变量**
   - 创建 `.env` 文件
   - 配置 `BAIDU_MAP_AK` 和 `DEEPSEEK_API_KEY`

3. **启动开发服务器**
   ```bash
   # 启动前端（开发模式，使用 Vite 代理）
   cd frontend
   npm run dev
   ```
   
   **注意**：本地开发时，前端会通过 Vite 代理访问后端 API。生产环境使用 Vercel Serverless Functions。

### 部署到 Sepolia 测试网

详细步骤请参考 [完整使用指南](./GUIDE.md#部署到-sepolia-测试网)

### 部署到 Vercel

详细步骤请参考 [完整使用指南](./GUIDE.md#部署到-vercel)

### 部署到公网

**🚀 推荐使用 Vercel 部署**，项目已配置好，开箱即用！

详细部署指南请参考：[公网部署指南](./DEPLOYMENT.md)

## 文档

- [完整使用指南](./GUIDE.md) - 包含本地开发、Sepolia 部署、Vercel 部署和 Git 使用的完整指南
- [公网部署指南](./DEPLOYMENT.md) - 详细的公网部署方案和步骤

## 项目结构

```
├── frontend/          # 前端 Vue.js 应用
├── api/               # Vercel Serverless Functions
├── contracts/         # Solidity 智能合约
├── scripts/           # 部署脚本
└── const/             # 合约信息
```

## 许可证

Private Project
