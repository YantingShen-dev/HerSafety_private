# 完整使用指南

本文档包含项目的完整使用指南，包括本地开发、Sepolia 部署、Vercel 部署和 Git 使用。

## 📋 目录

1. [本地开发](#本地开发)
2. [部署到 Sepolia 测试网](#部署到-sepolia-测试网)
3. [部署到 Vercel](#部署到-vercel)
4. [Git 使用指南](#git-使用指南)
5. [常见问题](#常见问题)

---

## 本地开发

### 前置要求

1. **Node.js** (v16 或更高版本)
2. **Python** (v3.8 或更高版本)
3. **MetaMask** 浏览器扩展（可选）
4. **Git**

### 安装依赖

```bash
# 1. 安装 Node.js 依赖（项目根目录）
npm install

# 2. 安装 Python 依赖
pip install -r requirements.txt

# 3. 安装前端依赖
cd frontend
npm install
cd ..
```

### 启动本地区块链节点

在**第一个终端窗口**运行：

```bash
npm run local-node
```

**重要：** 保持此终端窗口运行，不要关闭。

### 编译和部署智能合约

在**第二个终端窗口**运行：

```bash
npm run setup-local
```

部署成功后，更新 `frontend/src/config.js` 中的合约地址。

### 启动前端应用

在**第三个终端窗口**运行：

```bash
cd frontend
npm run dev
```

前端应用将运行在 `http://localhost:5173`。

### 使用应用

1. 打开浏览器访问前端地址
2. 连接钱包并签名登录
3. 新用户首次登录会获得 **100 SAFE 代币** 注册奖励
4. 提交评价会获得 **1 SAFE 代币** 奖励
5. 代币余额实时显示在页面顶部

---

## 部署到 Sepolia 测试网

### 前置准备

1. **获取 Sepolia ETH**
   - 访问 [Sepolia Faucet](https://sepoliafaucet.com/) 获取测试 ETH
   - 需要用于支付 gas 费用

2. **准备部署账户**
   - 确保有 MetaMask 钱包账户
   - 导出私钥（账户详情 → 导出私钥）
   - **重要：私钥请妥善保管！**

### 配置步骤

#### 1. 创建 .env 文件

在项目根目录创建 `.env` 文件：

```env
# Sepolia RPC URL
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# 部署账户的私钥（请确保账户有足够的 Sepolia ETH）
PRIVATE_KEY=your_private_key_here
```

**⚠️ 警告：** `.env` 文件已添加到 `.gitignore`，不会被提交到 Git。

#### 2. 编译合约

```bash
npm run compile
```

#### 3. 部署到 Sepolia

```bash
npm run deploy-sepolia
```

部署脚本会输出合约地址，请保存这些地址。

#### 4. 更新前端配置

编辑 `frontend/src/config.js`：

```javascript
export const CONTRACT_ADDRESS = '0x...' // 从部署输出复制
export const TOKEN_CONTRACT_ADDRESS = '0x...' // 从部署输出复制
export const NETWORK_URL = 'https://ethereum-sepolia-rpc.publicnode.com'
export const CHAIN_ID = 11155111
```

#### 5. 本地测试

1. 启动前端：`cd frontend && npm run dev`
2. 确保 MetaMask 已切换到 Sepolia 测试网
3. 测试连接钱包、注册、提交评价等功能

### 网络信息

- **网络名称:** Sepolia Testnet
- **Chain ID:** 11155111
- **RPC URL:** https://ethereum-sepolia-rpc.publicnode.com
- **区块浏览器:** https://sepolia.etherscan.io

---

## 部署到 Vercel

### 前置准备

1. **确保代码已提交到 Git**
   ```bash
   git add .
   git commit -m "准备部署到 Vercel"
   git push
   ```

2. **准备环境变量**
   - 百度地图 API Key: `BAIDU_MAP_AK`
   - DeepSeek API Key: `DEEPSEEK_API_KEY`（可选）

### 部署步骤

#### 方法 1: 通过 Vercel 网站（推荐）

1. **访问 Vercel**
   - 访问 https://vercel.com/
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "Add New Project"
   - 选择你的 Git 仓库

3. **配置项目设置**
   - **Framework Preset**: Other
   - **Root Directory**: 留空（或设置为项目根目录）
   - **Build Command**: `cd frontend && npm run build`
   - **Output Directory**: `frontend/dist`
   
   **注意：** 如果项目根目录有 `vercel.json` 文件，Vercel 会自动使用该配置，网站上的设置可能会被忽略。

4. **配置环境变量**
   在 "Environment Variables" 中添加：
   ```
   BAIDU_MAP_AK=你的百度地图API密钥
   DEEPSEEK_API_KEY=你的DeepSeek API密钥（可选）
   ```

5. **部署**
   - 点击 "Deploy"
   - 等待构建完成

#### 方法 2: 通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel

# 生产环境部署
vercel --prod
```

### 部署后验证

1. 访问 Vercel 提供的 URL
2. 检查 API：`https://your-domain.vercel.app/api/health`
3. 测试功能：连接钱包、搜索地址、提交评价

### 更新部署

代码更新后，只需：

```bash
git push
```

Vercel 会自动重新部署。

---

## Git 使用指南

### 初始设置

```bash
# 1. 初始化 Git 仓库
git init

# 2. 添加所有文件
git add .

# 3. 提交代码
git commit -m "Initial commit: HerSafety 女性安全地图项目"

# 4. 设置主分支
git branch -M main

# 5. 添加远程仓库
git remote add origin https://github.com/YantingShen-dev/HerSafety_private.git

# 6. 推送到 GitHub
git push -u origin main
```

### 常用命令

```bash
# 查看状态
git status

# 添加文件
git add .
git add <文件名>

# 提交更改
git commit -m "提交说明"

# 推送更改
git push

# 拉取更改
git pull
```

### 私有仓库认证

GitHub 私有仓库需要使用 Personal Access Token：

1. **创建 Token**
   - 访问：https://github.com/settings/tokens
   - 点击 "Generate new token" → "Generate new token (classic)"
   - 勾选 `repo` 权限
   - 复制生成的 Token

2. **使用 Token 推送**
   - 当 Git 提示输入密码时：
     - Username: `YantingShen-dev`
     - Password: 粘贴 Token（不是 GitHub 密码）

3. **配置凭据管理器（Windows）**
   ```bash
   git config --global credential.helper wincred
   ```

### 常见问题

#### Repository not found

**解决方案：**
1. 在 GitHub 上创建仓库
2. 确认仓库名称正确
3. 确认有访问权限

#### Authentication failed

**解决方案：**
- 检查 Token 是否正确
- 确认 Token 有 `repo` 权限
- 确认 Token 未过期

#### 远程仓库已存在内容

```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## 常见问题

### 1. 部署后前端显示"代币合约未配置"

**解决方法：** 更新 `frontend/src/config.js` 中的合约地址。

### 2. 提交评价后没有收到代币

**可能原因：**
- 代币合约地址未配置
- 合约未正确设置奖励关系

**解决方法：**
- 检查 `const/contract-info.json` 确认合约部署正确
- 重新部署合约并更新前端配置

### 3. 连接钱包失败

**解决方法：**
- 确保 MetaMask 已安装并解锁
- 确保 MetaMask 连接到正确的网络（Sepolia 或本地网络）
- 检查浏览器控制台错误信息

### 4. 定位功能无法使用

**解决方法：**
- 在浏览器设置中允许位置访问权限
- 移动设备需要开启 GPS
- 可以使用地图点击功能替代

### 5. 部署到 Sepolia 失败：Insufficient funds

**解决方法：** 确保部署账户有足够的 Sepolia ETH（建议至少 0.1 ETH）

### 6. Vercel 构建失败

**解决方法：**
- 检查 `frontend/package.json` 中的依赖是否正确
- 查看 Vercel 构建日志中的错误信息
- 确认环境变量已正确配置

### 7. API 调用失败

**解决方法：**
- 确认环境变量已正确配置
- 检查 API 密钥是否有效
- 查看 Vercel 函数日志

### 8. Vercel 部署后显示 404 错误

**可能原因：**
- `vercel.json` 路由配置不正确
- 构建输出目录配置错误
- 静态资源路径配置问题

**解决方法：**
1. **检查 `vercel.json` 配置**
   - 确保路由规则正确指向构建输出文件
   - 静态资源路由应指向根目录：`"dest": "/$1"`
   - SPA 回退路由应指向：`"dest": "/index.html"`

2. **检查构建输出**
   - 在 Vercel 构建日志中确认 `frontend/dist` 目录已生成
   - 确认 `index.html` 文件存在于构建输出中

3. **验证路由配置**
   - API 路由：`/api/(.*)` → `/api/$1.py`
   - 静态资源：`/(.*\\.(js|css|...))` → `/$1`
   - 其他路由：`/(.*)` → `/index.html`（SPA 回退）

4. **重新部署**
   ```bash
   git add vercel.json
   git commit -m "修复 Vercel 路由配置"
   git push
   ```

5. **如果问题仍然存在**
   - 在 Vercel 项目设置中检查 "Output Directory" 是否为 `frontend/dist`
   - 检查 Vercel 构建日志中的错误信息
   - 尝试删除 `vercel.json`，使用 Vercel 网站上的配置

6. **检查构建输出**
   - 在 Vercel 部署日志中，查找 "Build Output" 部分
   - 确认 `frontend/dist/index.html` 文件存在
   - 确认 `frontend/dist/assets/` 目录中有 JS 和 CSS 文件

7. **尝试临时删除 vercel.json 进行测试**
   ```bash
   # 备份当前配置
   mv vercel.json vercel.json.bak
   git add vercel.json.bak
   git commit -m "备份 vercel.json"
   git push
   ```
   然后在 Vercel 网站的项目设置中手动配置：
   - **Framework Preset**: Other
   - **Root Directory**: 留空
   - **Build Command**: `cd frontend && npm run build`
   - **Output Directory**: `frontend/dist`
   如果这样可以工作，说明是 `vercel.json` 配置问题

8. **检查 distDir 配置**
   - 对于 `@vercel/static-build`，`distDir` 是相对于构建命令的工作目录
   - 如果构建命令是 `cd frontend && npm run build`，工作目录是 `frontend`
   - 所以 `distDir` 应该是 `"dist"`（不是 `"frontend/dist"`）
   - 但 `outputDirectory` 应该是 `"frontend/dist"`（相对于项目根目录）

---

## 项目结构

```
├── frontend/          # 前端 Vue.js 应用
├── api/               # Vercel Serverless Functions
├── contracts/         # Solidity 智能合约
├── scripts/           # 部署脚本
├── const/             # 合约信息
├── vercel.json        # Vercel 配置
└── hardhat.config.js  # Hardhat 配置
```

---

## 开发命令

```bash
# 编译合约
npm run compile

# 部署到本地
npm run deploy-local

# 部署到 Sepolia
npm run deploy-sepolia

# 启动本地节点
npm run local-node

# 启动前端
cd frontend && npm run dev
```

---

## 注意事项

1. **敏感信息**
   - `.env` 文件已添加到 `.gitignore`
   - 不要提交包含真实 API 密钥或私钥的文件

2. **合约地址**
   - 每次重新部署合约后，必须更新前端配置
   - 确保 `frontend/src/config.js` 中的地址正确

3. **网络切换**
   - 本地开发使用 Hardhat 本地网络（Chain ID: 31337）
   - 生产环境使用 Sepolia 测试网（Chain ID: 11155111）
   - 确保 MetaMask 连接到正确的网络

4. **代币奖励**
   - 新用户首次登录获得 100 SAFE 代币
   - 每次提交评价获得 1 SAFE 代币
   - 奖励自动发放，无需额外操作

---

祝使用愉快！🚀
