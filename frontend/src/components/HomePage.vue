<template>
  <div class="home-page">
    <!-- 动态光点背景 -->
    <div class="floating-particles" id="particles"></div>
    
    <!-- 房子形状网格背景 -->
    <div class="house-grid"></div>
    
    <!-- 科技光斑层 -->
    <div class="tech-glows"></div>
    
    <!-- 边角微光装饰 -->
    <div class="corner-lights"></div>
    
    <!-- 水波纹背景效果 -->
    <div class="scan-lines"></div>

    <!-- 顶部钱包连接区域 -->
    <header class="home-header">
      <div class="logo">HERSAFETY</div>
      <div class="wallet-status">
        <button
          v-if="!isConnected"
          class="connect-btn"
          @click="connectWallet"
          :disabled="connecting"
        >
          <span class="arrow-icon">→</span>
          {{ connecting ? '连接中...' : '连接钱包' }}
        </button>
        <div v-else class="wallet-info-display">
          <div class="wallet-address">
            已连接: {{ account ? `${account.substring(0, 6)}...${account.substring(38)}` : '' }}
            <button class="logout-btn" @click="disconnectWallet">登出</button>
          </div>
          <div v-if="tokenBalance !== null" class="token-balance">
            💰 {{ parseFloat(tokenBalance).toFixed(2) }} {{ tokenSymbol }}
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="home-main">
      <!-- 标题区域 -->
      <div class="title-section">
        <h1 class="main-title">HERSAFETY</h1>
        <div class="subtitle-wrapper">
          <div class="subtitle-line"></div>
          <p class="subtitle">无数个TA点亮的安全角落，让你安心住</p>
          <div class="subtitle-line"></div>
        </div>
      </div>

      <!-- 3D球体容器 -->
      <div class="globe-container">
        <div class="globe-wrapper floating-animation">
          <div class="atmosphere"></div>
          <div class="globe-ring"></div>
          <div class="globe-sphere">
            <!-- 地区标记点 -->
            <div
              v-for="(region, index) in regions"
              :key="region.id"
              class="region-marker"
              :class="{ 
                'marker-active': selectedRegion === region.id,
                'marker-hover': hoveredRegion === region.id,
                'marker-clickable': region.clickable,
                'marker-display-only': !region.clickable
              }"
              :style="getMarkerPosition(region, index)"
              @click="selectRegion(region)"
              @mouseenter="hoveredRegion = region.id"
              @mouseleave="hoveredRegion = null"
            >
              <div class="marker-dot" :style="getMarkerStyle(region)"></div>
              <div class="marker-tooltip" v-if="hoveredRegion === region.id">
                <div class="tooltip-name">{{ region.name }}</div>
                <div class="tooltip-info" v-if="region.clickable">{{ region.reviewCount }} 条评价</div>
                <div class="tooltip-info" v-else>仅展示</div>
              </div>
            </div>
            
            <!-- 球体表面效果 -->
            <div class="sphere-surface"></div>
          </div>
        </div>
      </div>

      <!-- 操作按钮区域 -->
      <div class="action-section" v-if="selectedRegion">
        <p class="target-info">
          <span class="pulse-icon">⚡</span>
          目标区域: <span class="target-name">{{ getSelectedRegionName() }}</span>
        </p>
        <div class="action-buttons">
          <button class="action-btn primary" @click="goToSubmitReview">
            <span>评论提交</span>
            <span class="btn-arrow">→</span>
          </button>
          <button class="action-btn secondary" @click="goToViewResults">
            <span>结果查看</span>
            <span class="btn-arrow">→</span>
          </button>
        </div>
      </div>

      <!-- 提示文字 -->
      <div class="hint-text" v-if="!selectedRegion">
        <span class="hint-pulse">选择一个区域开始探索安全评价</span>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import blockchainService from '../services/blockchain'

export default {
  name: 'HomePage',
  props: {
    isConnected: {
      type: Boolean,
      default: false
    },
    account: {
      type: String,
      default: null
    },
    tokenBalance: {
      type: [String, Number],
      default: null
    },
    tokenSymbol: {
      type: String,
      default: 'SAFE'
    }
  },
  emits: ['navigate', 'wallet-connected'],
  setup(props, { emit }) {
    const connecting = ref(false)
    const selectedRegion = ref(null)
    const hoveredRegion = ref(null)

    // 地区数据 - 全球主要城市
    const regions = ref([
      // 中国城市
      { id: 'beijing', name: '北京', reviewCount: 0, lat: 39.9042, lng: 116.4074, clickable: true, country: 'china', keywords: ['北京', 'Beijing', 'Peking'] },
      { id: 'shanghai', name: '上海', reviewCount: 0, lat: 31.2304, lng: 121.4737, clickable: true, country: 'china', keywords: ['上海', 'Shanghai'] },
      { id: 'shenzhen', name: '深圳', reviewCount: 0, lat: 22.5431, lng: 114.0579, clickable: true, country: 'china', keywords: ['深圳', 'Shenzhen'] },
      { id: 'guangzhou', name: '广州', reviewCount: 0, lat: 23.1291, lng: 113.2644, clickable: true, country: 'china', keywords: ['广州', 'Guangzhou', 'Canton'] },
      { id: 'hongkong', name: '香港', reviewCount: 0, lat: 22.3193, lng: 114.1694, clickable: true, country: 'china', keywords: ['香港', 'Hong Kong', 'Hongkong'] },
      
      // 欧美城市
      { id: 'newyork', name: '纽约', reviewCount: 0, lat: 40.7128, lng: -74.0060, clickable: true, country: 'usa', keywords: ['纽约', 'New York', 'NYC'] },
      { id: 'london', name: '伦敦', reviewCount: 0, lat: 51.5074, lng: -0.1278, clickable: true, country: 'uk', keywords: ['伦敦', 'London'] },
      { id: 'paris', name: '巴黎', reviewCount: 0, lat: 48.8566, lng: 2.3522, clickable: true, country: 'france', keywords: ['巴黎', 'Paris'] },
      { id: 'berlin', name: '柏林', reviewCount: 0, lat: 52.5200, lng: 13.4050, clickable: true, country: 'germany', keywords: ['柏林', 'Berlin'] },
      { id: 'losangeles', name: '洛杉矶', reviewCount: 0, lat: 34.0522, lng: -118.2437, clickable: true, country: 'usa', keywords: ['洛杉矶', 'Los Angeles', 'LA'] },
      { id: 'toronto', name: '多伦多', reviewCount: 0, lat: 43.6532, lng: -79.3832, clickable: true, country: 'canada', keywords: ['多伦多', 'Toronto'] },
      
      // 中东城市
      { id: 'dubai', name: '迪拜', reviewCount: 0, lat: 25.2048, lng: 55.2708, clickable: true, country: 'uae', keywords: ['迪拜', 'Dubai'] },
      { id: 'telaviv', name: '特拉维夫', reviewCount: 0, lat: 32.0853, lng: 34.7818, clickable: true, country: 'israel', keywords: ['特拉维夫', 'Tel Aviv', 'Tel-Aviv'] },
      { id: 'cairo', name: '开罗', reviewCount: 0, lat: 30.0444, lng: 31.2357, clickable: true, country: 'egypt', keywords: ['开罗', 'Cairo'] },
      
      // 南美城市
      { id: 'saopaulo', name: '圣保罗', reviewCount: 0, lat: -23.5505, lng: -46.6333, clickable: true, country: 'brazil', keywords: ['圣保罗', 'São Paulo', 'Sao Paulo'] },
      { id: 'riodejaneiro', name: '里约热内卢', reviewCount: 0, lat: -22.9068, lng: -43.1729, clickable: true, country: 'brazil', keywords: ['里约热内卢', 'Rio de Janeiro', 'Rio'] },
      { id: 'buenosaires', name: '布宜诺斯艾利斯', reviewCount: 0, lat: -34.6037, lng: -58.3816, clickable: true, country: 'argentina', keywords: ['布宜诺斯艾利斯', 'Buenos Aires'] },
      
      // 其他亚洲城市
      { id: 'tokyo', name: '东京', reviewCount: 0, lat: 35.6762, lng: 139.6503, clickable: true, country: 'japan', keywords: ['东京', 'Tokyo'] },
      { id: 'seoul', name: '首尔', reviewCount: 0, lat: 37.5665, lng: 126.9780, clickable: true, country: 'southkorea', keywords: ['首尔', 'Seoul'] },
      
      // 大洋洲城市
      { id: 'sydney', name: '悉尼', reviewCount: 0, lat: -33.8688, lng: 151.2093, clickable: true, country: 'australia', keywords: ['悉尼', 'Sydney'] },
      { id: 'melbourne', name: '墨尔本', reviewCount: 0, lat: -37.8136, lng: 144.9631, clickable: true, country: 'australia', keywords: ['墨尔本', 'Melbourne'] }
    ])

    // 加载评价数据并统计各城市评价数量
    const loadReviewCounts = async () => {
      if (!props.isConnected) {
        return
      }

      try {
        const allReviews = await blockchainService.getAllReviews()
        if (!Array.isArray(allReviews)) {
          return
        }

        // 统计每个城市的评价数量
        const cityCounts = {}
        allReviews.forEach(review => {
          const city = (review.city || '').toLowerCase()
          const province = (review.province || '').toLowerCase()
          const address = (review.address || '').toLowerCase()
          
          // 遍历所有城市，检查是否匹配
          regions.value.forEach(region => {
            if (region.keywords && region.keywords.length > 0) {
              const matched = region.keywords.some(keyword => {
                const keywordLower = keyword.toLowerCase()
                return city.includes(keywordLower) || 
                       province.includes(keywordLower) || 
                       address.includes(keywordLower)
              })
              
              if (matched) {
                cityCounts[region.id] = (cityCounts[region.id] || 0) + 1
              }
            }
          })
        })

        // 更新各城市的评价数量
        regions.value.forEach(region => {
          if (cityCounts[region.id] !== undefined) {
            region.reviewCount = cityCounts[region.id]
          }
        })
      } catch (error) {
        console.error('加载评价数量失败:', error)
      }
    }

    // 根据评价数量计算颜色亮度（基于0-5的范围）
    const getMarkerStyle = (region) => {
      if (!region.clickable) {
        return {}
      }

      const count = Math.min(region.reviewCount || 0, 4 ) // 限制最大值为5
      const maxCount =  4// 固定最大值为5
      
      // 归一化数量（0-1之间）
      const normalizedCount = count / maxCount
      
      // 定义6个渐变状态（0, 1, 2, 3, 4, 5）
      // 每个状态都有明显不同的亮度和不透明度
      const states = [
        { opacity: 0.15, brightness: 0.25, shadowIntensity: 0.15, shadowSize: 6 },   // 0条：非常暗淡
        { opacity: 0.30, brightness: 0.40, shadowIntensity: 0.25, shadowSize: 10 }, // 1条：暗淡
        { opacity: 0.50, brightness: 0.60, shadowIntensity: 0.40, shadowSize: 14 }, // 2条：中等暗淡
        { opacity: 0.70, brightness: 0.75, shadowIntensity: 0.55, shadowSize: 18 }, // 3条：中等
        { opacity: 0.85, brightness: 0.90, shadowIntensity: 0.70, shadowSize: 22 }, // 4条：较亮
        { opacity: 1.00, brightness: 1.00, shadowIntensity: 0.85, shadowSize: 26 }   // 5条：很亮
      ]
      
      // 根据数量选择对应的状态
      const stateIndex = Math.floor(count)
      const nextStateIndex = Math.min(stateIndex + 1, states.length - 1)
      const currentState = states[stateIndex]
      const nextState = states[nextStateIndex]
      
      // 在当前状态和下一个状态之间进行线性插值
      const progress = count - stateIndex // 0-1之间的小数部分
      const opacity = currentState.opacity + (nextState.opacity - currentState.opacity) * progress
      const brightness = currentState.brightness + (nextState.brightness - currentState.brightness) * progress
      const shadowIntensity = currentState.shadowIntensity + (nextState.shadowIntensity - currentState.shadowIntensity) * progress
      const shadowSize = currentState.shadowSize + (nextState.shadowSize - currentState.shadowSize) * progress
      
      // 基础颜色 #00F3FF (rgb(0, 243, 255))
      const r = 0
      const g = Math.round(243 * brightness)
      const b = Math.round(255 * brightness)
      
      return {
        background: `rgba(${r}, ${g}, ${b}, ${opacity})`,
        boxShadow: `0 0 ${shadowSize}px rgba(${r}, ${g}, ${b}, ${shadowIntensity})`
      }
    }

    // 连接钱包
    const connectWallet = async () => {
      connecting.value = true
      try {
        const walletInfo = await blockchainService.connectWallet()
        
        // 检测新用户并注册/登录
        try {
          const loginResult = await blockchainService.registerOrLogin()
          if (loginResult.isNewUser) {
            const tokenBalance = await blockchainService.getTokenBalance()
            alert(`🎉 欢迎新用户！您已获得 100 SAFE 代币奖励！`)
            
            // 通知父组件钱包连接成功
            emit('wallet-connected', {
              address: walletInfo.address,
              tokenBalance: tokenBalance,
              tokenSymbol: 'SAFE'
            })
          } else {
            const tokenBalance = await blockchainService.getTokenBalance()
            emit('wallet-connected', {
              address: walletInfo.address,
              tokenBalance: tokenBalance,
              tokenSymbol: 'SAFE'
            })
          }
          
          // 连接钱包后加载评价数量
          await loadReviewCounts()
        } catch (error) {
          console.error('注册/登录失败:', error)
          // 即使注册失败也通知连接成功
          emit('wallet-connected', {
            address: walletInfo.address,
            tokenBalance: '0',
            tokenSymbol: 'SAFE'
          })
          // 尝试加载评价数量
          await loadReviewCounts()
        }
      } catch (error) {
        alert('连接失败: ' + error.message)
      } finally {
        connecting.value = false
      }
    }

    // 断开钱包连接
    const disconnectWallet = () => {
      blockchainService.removeReviewListener()
      // 通知父组件断开连接
      emit('wallet-connected', {
        address: null,
        tokenBalance: null,
        tokenSymbol: 'SAFE'
      })
    }

    // 获取标记点位置 - 基于真实地理坐标的球面投影
    const getMarkerPosition = (region, index) => {
      // 将经纬度转换为球面坐标
      const lat = (region.lat * Math.PI) / 180 // 转换为弧度
      const lng = (region.lng * Math.PI) / 180
      
      // 球面投影到2D平面（简化的墨卡托投影）
      const radius = 45 // 球体半径百分比
      
      // 经度映射到x轴 (-180到180度映射到0-100%)
      const x = 50 + (region.lng / 180) * radius
      
      // 纬度映射到y轴 (90到-90度映射到0-100%)，并应用球面效果
      const y = 50 - (region.lat / 90) * radius * 0.8 // 0.8是压扁系数
      
      return {
        left: `${Math.max(5, Math.min(95, x))}%`,
        top: `${Math.max(5, Math.min(95, y))}%`,
        transform: 'translate(-50%, -50%)'
      }
    }

    // 选择地区
    const selectRegion = (region) => {
      console.log('selectRegion called with:', region)
      // 只有中国城市可以选择
      if (!region.clickable) {
        console.log('Region not clickable:', region.id)
        return
      }
      console.log('Setting selectedRegion from', selectedRegion.value, 'to', region.id)
      selectedRegion.value = selectedRegion.value === region.id ? null : region.id
      console.log('selectedRegion is now:', selectedRegion.value)
    }

    // 获取选中地区名称
    const getSelectedRegionName = () => {
      const region = regions.value.find(r => r.id === selectedRegion.value)
      return region ? region.name : ''
    }

    // 导航到评论提交页面
    const goToSubmitReview = () => {
      console.log('goToSubmitReview called, selectedRegion:', selectedRegion.value)
      const region = regions.value.find(r => r.id === selectedRegion.value)
      console.log('Found region:', region)
      emit('navigate', 'submit', { region })
    }

    // 导航到结果查看页面
    const goToViewResults = () => {
      const region = regions.value.find(r => r.id === selectedRegion.value)
      emit('navigate', 'results', { region })
    }

    // 创建动态粒子
    const initializeParticles = () => {
      const particlesContainer = document.getElementById('particles')
      if (!particlesContainer) return
      
      const createParticle = () => {
        const particle = document.createElement('div')
        particle.className = 'particle'
        particle.style.left = Math.random() * 100 + '%'
        particle.style.animationDelay = Math.random() * 20 + 's'
        particle.style.animationDuration = (15 + Math.random() * 10) + 's'
        particlesContainer.appendChild(particle)

        setTimeout(() => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle)
          }
        }, 25000)
      }

      // 初始创建粒子
      for (let i = 0; i < 5; i++) {
        setTimeout(createParticle, i * 1000)
      }

      // 持续创建新粒子
      setInterval(createParticle, 3000)
    }

    // 监听钱包连接状态变化，自动加载评价数量
    watch(() => props.isConnected, async (newVal) => {
      if (newVal) {
        await loadReviewCounts()
      }
    })

    onMounted(() => {
      initializeParticles()
      // 如果已经连接钱包，加载评价数量
      if (props.isConnected) {
        loadReviewCounts()
      }
    })

    return {
      connecting,
      selectedRegion,
      hoveredRegion,
      regions,
      connectWallet,
      disconnectWallet,
      getMarkerPosition,
      getMarkerStyle,
      selectRegion,
      getSelectedRegionName,
      goToSubmitReview,
      goToViewResults
    }
  }
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

/* 顶部头部 */
.home-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  backdrop-filter: blur(20px);
  background: rgba(10, 10, 20, 0.3);
  border-bottom: 1px solid rgba(255, 46, 151, 0.2);
}

.logo {
  font-size: 28px;
  font-weight: 900;
  color: #FF2E97;
  text-shadow: 0 0 15px #FF2E97;
  letter-spacing: 2px;
}

.connect-btn {
  background: linear-gradient(135deg, #B967FF, #8A4FFF);
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  color: white;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 15px rgba(185, 103, 255, 0.5);
  transition: all 0.3s ease;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.connect-btn:hover {
  box-shadow: 0 0 25px rgba(185, 103, 255, 0.8);
  transform: translateY(-2px);
}

.arrow-icon {
  font-size: 16px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateX(0); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(2px); }
}

.wallet-info-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.wallet-address {
  color: #FF2E97;
  font-weight: 700;
  text-shadow: 0 0 10px #FF2E97;
  padding: 8px 16px;
  background: rgba(255, 46, 151, 0.1);
  border-radius: 20px;
  border: 1px solid rgba(255, 46, 151, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.logout-btn {
  background: rgba(255, 46, 151, 0.2);
  border: 1px solid rgba(255, 46, 151, 0.4);
  color: #FF2E97;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: rgba(255, 46, 151, 0.3);
  transform: scale(1.05);
}

.token-balance {
  color: #00F3FF;
  font-weight: 700;
  text-shadow: 0 0 10px #00F3FF;
  font-size: 12px;
}

/* 主内容区域 */
.home-main {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px 50px;
  position: relative;
  z-index: 10;
}

/* 标题区域 */
.title-section {
  text-align: center;
  margin-bottom: 60px;
}

.main-title {
  font-size: 4rem;
  font-weight: 100;
  color: #ffffff;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
  margin-bottom: 20px;
  letter-spacing: 0.6em;
  text-transform: uppercase;
}

.subtitle-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  opacity: 0.3;
}

.subtitle-line {
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
}

.subtitle {
  font-size: 12px;
  font-weight: 300;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.8);
}

/* 球体容器 */
.globe-container {
  margin-bottom: 80px;
}

.globe-wrapper {
  width: 450px;
  height: 450px;
  position: relative;
  transform-style: preserve-3d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.floating-animation {
  animation: float-sphere 6s ease-in-out infinite;
}

@keyframes float-sphere {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

.atmosphere {
  position: absolute;
  inset: -100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 46, 151, 0.03) 0%, transparent 75%);
  pointer-events: none;
  animation: atmospheric-breathe 20s ease-in-out infinite;
  z-index: 1;
}

@keyframes atmospheric-breathe {
  0%, 100% { opacity: 0.15; transform: scale(0.85); filter: blur(35px); }
  50% { opacity: 0.35; transform: scale(1.15); filter: blur(55px); }
}

.globe-ring {
  position: absolute;
  width: 165%;
  height: 52%;
  border: 1px solid rgba(255, 46, 151, 0.4);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotateX(75deg);
  pointer-events: none;
  box-shadow: 0 0 40px rgba(255, 46, 151, 0.4);
  opacity: 0.25;
  animation: ring-rotate 50s linear infinite;
}

@keyframes ring-rotate {
  from { transform: translate(-50%, -50%) rotateX(75deg) rotateZ(0deg); }
  to { transform: translate(-50%, -50%) rotateX(75deg) rotateZ(360deg); }
}

.globe-sphere {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: 
    radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15) 0%, transparent 60%),
    radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.1) 100%);
  box-shadow: 
    inset 0 0 80px rgba(255,255,255,0.1),
    inset -20px -20px 100px rgba(0,0,0,0.3),
    0 0 100px rgba(255, 46, 151, 0.3),
    0 0 10px rgba(255,255,255,0.3);
  position: relative;
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255,255,255,0.15);
  z-index: 5;
  overflow: hidden;
}

.sphere-surface {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-image: url('https://www.transparenttextures.com/patterns/stardust.png');
  opacity: 0.15;
  pointer-events: none;
  mix-blend-mode: overlay;
}

/* 地区标记点 */
.region-marker {
  position: absolute;
  cursor: pointer;
  z-index: 20;
  transition: all 0.3s ease;
  padding: 10px;
  margin: -10px;
}

.region-marker.marker-display-only {
  cursor: default;
}

.marker-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #00F3FF;
  box-shadow: 0 0 15px rgba(0, 243, 255, 0.6);
  animation: marker-pulse 3s ease-in-out infinite;
  transition: all 0.3s ease;
}

/* 中国城市（可点击）*/
.region-marker.marker-clickable .marker-dot {
  background: #00F3FF;
  box-shadow: 0 0 15px rgba(0, 243, 255, 0.6);
}

.region-marker.marker-clickable:hover .marker-dot {
  transform: scale(1.3);
  background: #FF2E97;
  box-shadow: 0 0 25px rgba(255, 46, 151, 0.8);
}

.region-marker.marker-clickable.marker-active .marker-dot {
  transform: scale(1.5);
  background: #FFD700;
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.9);
  animation: active-pulse 2s ease-in-out infinite;
}

/* 世界其他城市（仅展示）*/
.region-marker.marker-display-only .marker-dot {
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
  animation: display-pulse 4s ease-in-out infinite;
}

.region-marker.marker-display-only:hover .marker-dot {
  transform: scale(1.2);
  background: rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
}

@keyframes marker-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
}

@keyframes display-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

@keyframes active-pulse {
  0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.9); }
  50% { box-shadow: 0 0 40px rgba(255, 215, 0, 1), 0 0 10px white; }
}

.marker-tooltip {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 10, 20, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 243, 255, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 20;
}

.tooltip-name {
  color: #00F3FF;
  font-weight: 700;
  font-size: 12px;
  text-shadow: 0 0 8px rgba(0, 243, 255, 0.6);
}

.tooltip-info {
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
  margin-top: 2px;
}

/* 操作区域 */
.action-section {
  text-align: center;
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.target-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 30px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: rgba(255, 255, 255, 0.6);
}

.pulse-icon {
  color: #00F3FF;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.target-name {
  color: #FF2E97;
  text-shadow: 0 0 10px #FF2E97;
  border-bottom: 1px solid rgba(255, 46, 151, 0.3);
  padding-bottom: 2px;
}

.action-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.action-btn {
  padding: 15px 30px;
  border: none;
  border-radius: 25px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  position: relative;
  overflow: hidden;
}

.action-btn.primary {
  background: linear-gradient(135deg, #FF2E97, #FF1744);
  color: white;
  box-shadow: 0 0 20px rgba(255, 46, 151, 0.5);
}

.action-btn.primary:hover {
  box-shadow: 0 0 30px rgba(255, 46, 151, 0.8);
  transform: translateY(-3px);
}

.action-btn.secondary {
  background: linear-gradient(135deg, #00F3FF, #0099CC);
  color: white;
  box-shadow: 0 0 20px rgba(0, 243, 255, 0.5);
}

.action-btn.secondary:hover {
  box-shadow: 0 0 30px rgba(0, 243, 255, 0.8);
  transform: translateY(-3px);
}

.btn-arrow {
  transition: transform 0.3s ease;
}

.action-btn:hover .btn-arrow {
  transform: translateX(4px);
}

/* 提示文字 */
.hint-text {
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8em;
}

.hint-pulse {
  animation: pulse 2s infinite;
}

/* 背景效果 */
.floating-particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(255, 46, 151, 0.6);
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(255, 46, 151, 0.8);
  animation: float-up linear infinite;
}

@keyframes float-up {
  0% {
    transform: translateY(100vh) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) translateX(100px);
    opacity: 0;
  }
}

.house-grid {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Cpath d='M25 8 L40 20 L40 42 L10 42 L10 20 Z' fill='none' stroke='rgba(26,26,46,0.08)' stroke-width='1'/%3E%3C/svg%3E");
  background-size: 50px 50px;
  z-index: 0;
  animation: gridPulse 8s ease-in-out infinite;
}

@keyframes gridPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.tech-glows {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(circle at 20% 80%, rgba(255, 46, 151, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(0, 243, 255, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(185, 103, 255, 0.02) 0%, transparent 50%);
  z-index: 0;
  pointer-events: none;
  animation: breathe 6s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.02); }
}

.corner-lights {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.corner-lights::before,
.corner-lights::after {
  content: '';
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  filter: blur(60px);
}

.corner-lights::before {
  top: -100px;
  left: -100px;
  background: rgba(255, 46, 151, 0.1);
}

.corner-lights::after {
  bottom: -100px;
  right: -100px;
  background: rgba(0, 243, 255, 0.1);
}

.scan-lines {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 243, 255, 0.03) 2px,
    rgba(0, 243, 255, 0.03) 4px
  );
  z-index: 0;
  pointer-events: none;
  animation: scan 20s linear infinite;
}

@keyframes scan {
  0% { transform: translateY(0); }
  100% { transform: translateY(100px); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .home-header {
    padding: 15px 20px;
    flex-direction: column;
    gap: 12px;
  }

  .logo {
    font-size: 24px;
  }

  .main-title {
    font-size: 2.5rem;
    letter-spacing: 0.3em;
  }

  .globe-wrapper {
    width: 300px;
    height: 300px;
  }

  .action-buttons {
    flex-direction: column;
    gap: 15px;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>

