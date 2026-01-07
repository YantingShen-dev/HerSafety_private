# 女性安全地图 - 前端应用

基于 Vue 3 + Vite + Ethers.js 的区块链前端应用，直接与智能合约交互，无需后端数据库。

## 功能特性

- ✅ 直接连接区块链（Hardhat 本地网络或 MetaMask）
- ✅ 提交安全评价到区块链
- ✅ 从区块链读取所有评价数据
- ✅ 地图可视化展示评价位置
- ✅ 实时显示评价统计

## 安装和运行

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 配置百度地图 API Key

编辑 `index.html`，将 `YOUR_BAIDU_MAP_AK` 替换为你的百度地图 API Key。

如果没有 API Key，可以：
- 访问 [百度地图开放平台](https://lbsyun.baidu.com/) 申请
- 或者使用其他地图服务（如高德地图、OpenStreetMap）

### 3. 确保区块链服务运行

在运行前端之前，确保：

1. **Hardhat 节点正在运行**：
   ```bash
   npm run local-node
   ```

2. **合约已部署**：
   ```bash
   npm run setup-local
   ```

3. **更新合约地址**（如果需要）：
   编辑 `src/config.js`，更新 `CONTRACT_ADDRESS` 为实际部署的合约地址。

### 4. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:3000` 运行。

## 使用说明

1. **连接钱包**：
   - 点击"连接钱包"按钮
   - 如果使用 MetaMask，确保切换到 Hardhat 本地网络（Chain ID: 31337）
   - 开发模式下会自动使用 Hardhat 默认账户

2. **提交评价**：
   - 填写地址和经纬度（可点击"获取当前位置"）
   - 设置各项安全评分（0-5）
   - 填写文字评价（可选）
   - 点击"提交到区块链"

3. **查看评价**：
   - 评价会自动显示在地图上（不同颜色表示安全等级）
   - 侧边栏显示所有评价列表
   - 点击评价可在地图上定位

## 项目结构

```
frontend/
├── src/
│   ├── components/       # Vue 组件
│   │   ├── MapView.vue   # 地图组件
│   │   ├── ReviewForm.vue # 提交表单
│   │   └── ReviewList.vue # 评价列表
│   ├── services/         # 服务层
│   │   └── blockchain.js # 区块链交互服务
│   ├── config.js          # 配置文件
│   ├── App.vue           # 主应用组件
│   ├── main.js           # 入口文件
│   └── style.css         # 全局样式
├── index.html            # HTML 模板
├── package.json          # 依赖配置
└── vite.config.js       # Vite 配置
```

## 技术栈

- **Vue 3** - 前端框架
- **Vite** - 构建工具
- **Ethers.js** - 区块链交互
- **百度地图 API** - 地图可视化

## 注意事项

1. **网络配置**：确保 Hardhat 节点运行在 `http://127.0.0.1:8545`
2. **合约地址**：部署合约后，记得更新 `src/config.js` 中的合约地址
3. **地图 API**：需要有效的百度地图 API Key 才能显示地图
4. **浏览器兼容性**：建议使用 Chrome 或 Firefox 浏览器

## 故障排查

### 无法连接钱包
- 检查 Hardhat 节点是否运行
- 检查合约地址是否正确
- 查看浏览器控制台错误信息

### 地图不显示
- 检查百度地图 API Key 是否正确
- 检查网络连接
- 查看浏览器控制台是否有 API 相关错误

### 提交失败
- 确保钱包已连接
- 检查所有必填字段是否填写
- 查看浏览器控制台错误信息

