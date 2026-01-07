import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI, TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, NETWORK_URL, CHAIN_ID } from '../config'

class BlockchainService {
  constructor() {
    this.provider = null
    this.signer = null
    this.contract = null
    this.tokenContract = null
    this.account = null
  }

  // 签名消息（用于验证用户身份）
  async signMessage(message) {
    if (!this.signer) {
      throw new Error('请先连接钱包')
    }
    try {
      // 使用 MetaMask 签名
      if (typeof window.ethereum !== 'undefined') {
        const signature = await this.signer.signMessage(message)
        return signature
      } else {
        // 本地开发环境，直接签名
        const signature = await this.signer.signMessage(message)
        return signature
      }
    } catch (error) {
      console.error('签名失败:', error)
      throw error
    }
  }

  // 切换到指定网络
  async switchNetwork(chainId) {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask 未安装')
    }

    const chainIdHex = `0x${chainId.toString(16)}`
    
    try {
      // 尝试切换网络
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      })
    } catch (switchError) {
      // 如果网络不存在，尝试添加网络
      if (switchError.code === 4902 || switchError.code === -32603) {
        // Sepolia 网络配置
        if (chainId === 11155111) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: chainIdHex,
                chainName: 'Sepolia',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }],
            })
          } catch (addError) {
            throw new Error('无法添加 Sepolia 网络，请手动在 MetaMask 中添加')
          }
        } else {
          throw new Error(`请手动切换到 Chain ID: ${chainId} 的网络`)
        }
      } else {
        throw switchError
      }
    }
  }

  // 连接钱包（使用 MetaMask 或本地账户）
  async connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
      // 使用 MetaMask
      try {
        // 1. 请求连接账户
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        this.provider = new ethers.BrowserProvider(window.ethereum)
        
        // 2. 检查并切换网络
        const network = await this.provider.getNetwork()
        const currentChainId = Number(network.chainId)
        if (currentChainId !== CHAIN_ID) {
          const networkName = CHAIN_ID === 11155111 ? 'Sepolia 测试网' : CHAIN_ID === 31337 ? 'Hardhat 本地网络' : `Chain ID ${CHAIN_ID}`
          console.log(`当前网络 Chain ID: ${currentChainId}，正在切换到 ${networkName}...`)
          try {
            await this.switchNetwork(CHAIN_ID)
            // 等待网络切换完成
            await new Promise(resolve => setTimeout(resolve, 1000))
            // 重新获取 provider 以获取新网络
            this.provider = new ethers.BrowserProvider(window.ethereum)
          } catch (switchError) {
            throw new Error(`无法切换到 ${networkName}，请手动在 MetaMask 中切换。错误: ${switchError.message}`)
          }
        }
        
        this.signer = await this.provider.getSigner()
        this.account = await this.signer.getAddress()
        
        // 检查账户余额（用于调试）
        try {
          const balance = await this.provider.getBalance(this.account)
          const balanceInEth = ethers.formatEther(balance)
          console.log(`✅ 连接成功！账户: ${this.account}`)
          console.log(`💰 账户余额: ${balanceInEth} ETH`)
          console.log(`🌐 网络 Chain ID: ${currentChainId}`)
          
          if (parseFloat(balanceInEth) < 0.001) {
            console.warn('⚠️ 账户余额较低，可能无法完成交易')
          }
        } catch (balanceError) {
          console.warn('无法获取账户余额:', balanceError)
        }
        
        // 2. 要求用户签名验证身份
        const message = `请签名以登录女性安全地图系统\n\n地址: ${this.account}\n时间: ${new Date().toISOString()}\n\n此签名仅用于身份验证，不会产生任何费用。`
        
        try {
          await this.signMessage(message)
          console.log('签名验证成功')
        } catch (error) {
          if (error.message && error.message.includes('user rejected')) {
            throw new Error('签名被取消，登录失败')
          }
          throw new Error('签名验证失败: ' + error.message)
        }
      } catch (error) {
        console.error('连接钱包失败:', error)
        // 重置状态
        this.provider = null
        this.signer = null
        this.account = null
        throw error
      }
    } else {
      // 使用本地 Hardhat 节点（开发模式）
      this.provider = new ethers.JsonRpcProvider(NETWORK_URL)
      // 使用 Hardhat 默认账户
      const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
      this.signer = new ethers.Wallet(privateKey, this.provider)
      this.account = this.signer.address
    }

    // 验证合约地址
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '') {
      throw new Error('合约地址未配置，请先部署合约并更新 frontend/src/config.js 中的 CONTRACT_ADDRESS')
    }
    
    // 创建合约实例
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer)
    
    // 创建代币合约实例（如果地址已配置）
    if (TOKEN_CONTRACT_ADDRESS && TOKEN_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' && TOKEN_CONTRACT_ADDRESS !== '') {
      this.tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, this.signer)
    } else {
      console.warn('代币合约地址未配置，代币相关功能将不可用')
    }
    
    return {
      address: this.account,
      provider: this.provider
    }
  }

  // 注册或登录（检测新用户并发放奖励）
  async registerOrLogin() {
    if (!this.contract) {
      throw new Error('请先连接钱包')
    }
    
    try {
      // 先检查用户是否已注册（避免不必要的gas费用）
      const isRegistered = await this.isUserRegistered()
      
      if (isRegistered) {
        // 已注册用户，直接返回
        return {
          isNewUser: false,
          rewardAmount: 0
        }
      }
      
      // 新用户，调用注册函数
      const tx = await this.contract.registerOrLogin()
      
      // 等待交易确认
      const receipt = await this.waitForTransaction(tx.hash)
      
      // 返回结果
      return {
        isNewUser: true,
        rewardAmount: 100, // 100 个代币
        txHash: receipt.txHash
      }
    } catch (error) {
      console.error('注册/登录失败:', error)
      throw error
    }
  }

  // 检查连接状态
  async checkConnection() {
    if (!this.provider) {
      return false
    }
    try {
      await this.provider.getBlockNumber()
      return true
    } catch {
      return false
    }
  }

  // 获取账户地址
  getAccount() {
    return this.account
  }

  // 提交评价到区块链
  async submitReview(reviewData) {
    if (!this.contract) {
      throw new Error('请先连接钱包')
    }

    // 检查账户余额
    try {
      const balance = await this.provider.getBalance(this.account)
      const balanceInEth = ethers.formatEther(balance)
      console.log(`💰 提交前账户余额: ${balanceInEth} ETH`)
      
      if (parseFloat(balanceInEth) < 0.001) {
        throw new Error(`账户余额不足！当前余额: ${balanceInEth} ETH，建议至少保留 0.001 ETH 用于支付 gas 费用。`)
      }
    } catch (balanceError) {
      if (balanceError.message.includes('余额不足')) {
        throw balanceError
      }
      console.warn('无法检查账户余额:', balanceError)
    }

    try {
      // 格式化经纬度，保留6位小数，然后转换为整数（乘以1000000）
      const lat = parseFloat(reviewData.latitude.toFixed(6))
      const lng = parseFloat(reviewData.longitude.toFixed(6))
      const latitudeInt = BigInt(Math.floor(lat * 1000000))
      const longitudeInt = BigInt(Math.floor(lng * 1000000))

      // 生成一个唯一的 ID（使用时间戳）
      const reviewId = BigInt(Date.now())

      // 调用合约（这里只是发送交易，还未确认）
      const tx = await this.contract.submitReview(
        reviewId,
        reviewData.address || '',
        latitudeInt,
        longitudeInt,
        reviewData.province || '',
        reviewData.city || '',
        reviewData.district || '',
        reviewData.night_lighting || 0,
        reviewData.security_status || 0,
        reviewData.female_density || 0,
        reviewData.overall_safety || 0,
        reviewData.text_review || '',
        reviewData.ai_summary || '',
        reviewData.keywords || ''
      )

      // 返回交易对象，让调用者决定何时等待确认
      return {
        tx: tx,
        txHash: tx.hash
      }
    } catch (error) {
      console.error('提交评价失败:', error)
      throw error
    }
  }

  // 从区块链获取所有评价
  async getAllReviews() {
    if (!this.contract) {
      throw new Error('请先连接钱包')
    }

    try {
      console.log('调用合约 getAllReviews...')
      console.log('合约地址:', this.contract.target)
      console.log('合约实例:', this.contract)
      
      // 先检查合约是否可用
      try {
        const count = await this.contract.getReviewCount()
        console.log('当前评价总数:', count.toString())
        
        if (count === 0n || count === 0) {
          console.log('链上没有评价数据')
          return []
        }
      } catch (countError) {
        console.warn('获取评价总数失败，继续尝试获取列表:', countError)
      }
      
      const reviews = await this.contract.getAllReviews()
      console.log('合约返回的原始数据:', reviews)
      console.log('数据类型:', Array.isArray(reviews) ? '数组' : typeof reviews)
      
      // 如果返回空数组或null，直接返回空数组
      if (!reviews || reviews.length === 0) {
        console.log('链上没有评价数据')
        return []
      }
      
      // 格式化数据，经纬度保留6位小数
      // 兼容旧数据（10000）和新数据（1000000）
      const formattedReviews = reviews.map((review, index) => {
        try {
          const latValue = Number(review.latitude)
          const lngValue = Number(review.longitude)
          
          // 判断是旧格式（10000）还是新格式（1000000）
          // 如果值很大（>100000），可能是新格式；否则是旧格式
          const latDivisor = Math.abs(latValue) > 100000 ? 1000000 : 10000
          const lngDivisor = Math.abs(lngValue) > 100000 ? 1000000 : 10000
          
          // 生成唯一ID：优先使用合约返回的id，如果没有则使用组合字段生成
          const uniqueId = review.id 
            ? review.id.toString() 
            : `review-${review.submitter || 'unknown'}-${review.timestamp || Date.now()}-${index}-${latValue}-${lngValue}`
          
          return {
            id: uniqueId,
            originalId: review.id ? review.id.toString() : null, // 保留原始ID用于查找
            address: review.address_text || '',
            latitude: parseFloat((latValue / latDivisor).toFixed(6)),
            longitude: parseFloat((lngValue / lngDivisor).toFixed(6)),
            province: review.province || '',
            city: review.city || '',
            district: review.district || '',
            night_lighting: Number(review.night_lighting) || 0,
            security_status: Number(review.security_status) || 0,
            female_density: Number(review.female_density) || 0,
            overall_safety: Number(review.overall_safety) || 0,
            text_review: review.text_review || '',
            ai_summary: review.ai_summary || '',
            keywords: review.keywords || '',
            submitter: review.submitter || '',
            timestamp: review.timestamp ? Number(review.timestamp) * 1000 : Date.now() // 转换为毫秒
          }
        } catch (err) {
          console.error(`格式化第 ${index} 条评价失败:`, err, review)
          return null
        }
      }).filter(review => review !== null) // 过滤掉格式化失败的数据
      
      console.log('格式化后的评价数据:', formattedReviews)
      return formattedReviews
    } catch (error) {
      console.error('获取评价失败:', error)
      console.error('错误堆栈:', error.stack)
      // 如果是合约调用错误，返回空数组而不是抛出异常
      if (error.message && error.message.includes('contract')) {
        console.warn('合约调用可能失败，返回空数组')
        return []
      }
      throw error
    }
  }

  // 获取评价总数
  async getReviewCount() {
    if (!this.contract) {
      throw new Error('请先连接钱包')
    }

    try {
      const count = await this.contract.getReviewCount()
      return Number(count)
    } catch (error) {
      console.error('获取评价总数失败:', error)
      throw error
    }
  }

  // 等待交易确认
  async waitForTransaction(txHash) {
    if (!this.provider) {
      throw new Error('请先连接钱包')
    }
    
    try {
      const receipt = await this.provider.waitForTransaction(txHash)
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed'
      }
    } catch (error) {
      console.error('等待交易确认失败:', error)
      throw error
    }
  }

  // 检查用户是否已注册
  async isUserRegistered(address = null) {
    if (!this.contract) {
      throw new Error('请先连接钱包')
    }
    
    const userAddress = address || this.account
    if (!userAddress) {
      return false
    }
    
    try {
      return await this.contract.isUserRegistered(userAddress)
    } catch (error) {
      console.error('检查用户注册状态失败:', error)
      return false
    }
  }

  // 监听新评价事件
  onReviewSubmitted(callback) {
    if (!this.contract) {
      throw new Error('请先连接钱包')
    }

    // 监听 ReviewSubmitted 事件
    this.contract.on('ReviewSubmitted', async (reviewId, submitter, address_text, latitude, longitude, timestamp) => {
      try {
        // 等待一小段时间确保数据已写入
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 获取最新的评价总数
        const count = await this.getReviewCount()
        
        // 获取所有评价并找到最新的
        const allReviews = await this.getAllReviews()
        // 按时间戳排序，找到最新的
        const sortedReviews = allReviews.sort((a, b) => b.timestamp - a.timestamp)
        const newReview = sortedReviews[0]
        
        if (newReview) {
          callback(newReview, count)
        }
      } catch (error) {
        console.error('处理新评价事件失败:', error)
      }
    })
  }

  // 移除事件监听
  removeReviewListener() {
    if (this.contract) {
      this.contract.removeAllListeners('ReviewSubmitted')
    }
  }

  // 获取代币余额
  async getTokenBalance(address = null) {
    if (!this.tokenContract) {
      throw new Error('代币合约未配置，请检查 TOKEN_CONTRACT_ADDRESS')
    }
    
    const userAddress = address || this.account
    if (!userAddress) {
      throw new Error('请先连接钱包')
    }
    
    try {
      const balance = await this.tokenContract.balanceOf(userAddress)
      // 将代币数量转换为可读格式（除以10^18）
      return ethers.formatEther(balance)
    } catch (error) {
      console.error('获取代币余额失败:', error)
      throw error
    }
  }

  // 获取代币符号
  async getTokenSymbol() {
    if (!this.tokenContract) {
      return 'SAFE' // 默认返回
    }
    try {
      return await this.tokenContract.symbol()
    } catch (error) {
      console.error('获取代币符号失败:', error)
      return 'SAFE'
    }
  }

  // 获取代币名称
  async getTokenName() {
    if (!this.tokenContract) {
      return 'Safety Token'
    }
    try {
      return await this.tokenContract.name()
    } catch (error) {
      console.error('获取代币名称失败:', error)
      return 'Safety Token'
    }
  }
}

export default new BlockchainService()

