<template>
  <div id="app">
    <div class="container">
      <!-- 头部 -->
      <header class="home-header">
        <div style="display: flex; align-items: center; gap: 20px;">
          <div class="logo">HERSAFETY</div>
          <button class="back-home-btn" @click="goToHome" title="返回首页">
            ← 返回
          </button>
        </div>
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
            <div v-if="tokenBalance !== null && tokenBalance !== undefined" class="token-balance" style="display: flex; align-items: center; gap: 15px;">
              <span>💰 {{ parseFloat(tokenBalance).toFixed(2) }} {{ tokenSymbol }}</span>
              <span v-if="isConnected" class="stats-inline" style="display: flex; align-items: center; gap: 6px;">
                <span class="stat-label-inline">总评价数:</span>
                <span class="stat-value-inline">{{ reviewCount }}</span>
              </span>
            </div>
            <div v-else-if="isConnected" class="stats-inline">
              <span class="stat-label-inline">总评价数:</span>
              <span class="stat-value-inline">{{ reviewCount }}</span>
            </div>
          </div>
        </div>
      </header>

      <!-- 主内容 -->
      <div class="main-content">
        <!-- 地图模块 -->
        <div class="map-container-wrapper" :class="{ 'pin-mode': pinMode }" style="position: relative;">
          <div class="map-container">
            <div id="map"></div>
          </div>
          <!-- 图钉工具按钮 -->
          <button
            v-if="isConnected"
            @click="togglePinMode"
            :class="['pin-mode-btn', { active: pinMode }]"
            :title="pinMode ? '点击退出图钉模式' : '点击进入图钉模式，在地图上标记位置'"
          >
            📍 {{ pinMode ? '退出图钉' : '图钉标记' }}
          </button>
        </div>

        <!-- 侧边栏 -->
        <div class="sidebar">
          <!-- 提交状态提示 -->
          <div v-if="submitStatus" class="submit-status-overlay">
            <div class="submit-status-card">
              <div v-if="submitting" class="loading-spinner-small"></div>
              <div class="submit-status-text" v-html="submitStatus.replace(/\n/g, '<br>')"></div>
            </div>
          </div>
          <!-- 地址查找状态提示 -->
          <div v-if="lookingUpAddress" class="submit-status-overlay">
            <div class="submit-status-card">
              <div class="loading-spinner-small"></div>
              <div class="submit-status-text">
                🔍 正在查找地址信息...
              </div>
            </div>
          </div>
          <!-- 提交表单 -->
          <ReviewForm 
            @submitted="handleSubmit" 
            @location-selected="handleLocationSelected"
            @address-lookup-start="handleAddressLookupStart"
            @address-lookup-end="handleAddressLookupEnd"
            :map-selected-location="mapSelectedLocation"
          />
        </div>
      </div>
      
      <!-- 地点详情面板 -->
      <LocationDetail 
        v-if="selectedLocation"
        :location="selectedLocation"
        @close="selectedLocation = null"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import blockchainService from '../services/blockchain'
import { groupReviewsByLocation, calculateLocationAverageScore, aggregateKeywords, formatKeywords } from '../utils/locationUtils'
import ReviewForm from './ReviewForm.vue'
import LocationDetail from './LocationDetail.vue'

export default {
  name: 'MapPage',
  components: {
    ReviewForm,
    LocationDetail
  },
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
    },
    selectedRegion: {
      type: Object,
      default: null
    }
  },
  emits: ['navigate', 'wallet-connected'],
  setup(props, { emit }) {
    const connecting = ref(false)
    const isConnected = ref(props.isConnected)
    const account = ref(props.account)
    const reviews = ref([])
    const loading = ref(false)
    const reviewCount = ref(0)
    // 根据选中的城市设置地图中心点，如果没有选中则默认北京
    const getInitialMapCenter = () => {
      if (props.selectedRegion && props.selectedRegion.lat && props.selectedRegion.lng) {
        return { lat: props.selectedRegion.lat, lng: props.selectedRegion.lng }
      }
      return { lat: 39.9042, lng: 116.4074 } // 默认北京
    }
    const mapCenter = ref(getInitialMapCenter())
    const tokenBalance = ref(props.tokenBalance)
    const tokenSymbol = ref(props.tokenSymbol)
    const mapSelectedLocation = ref(null)
    const pinMode = ref(false)
    const selectedLocation = ref(null) // 选中的地点（聚合数据）

    // ========== 地图模块相关变量 ==========
    let map = null
    let markers = []
    let userLocationMarker = null
    let userLocation = null
    let selectedLocationMarker = null
    let pinMarker = null // 图钉标记
    let mapClickHandler = null // 备用点击处理器

    const connectWallet = async () => {
      connecting.value = true
      try {
        // 1. 连接钱包并签名验证
        const walletInfo = await blockchainService.connectWallet()
        account.value = walletInfo.address
        isConnected.value = true
        
        // 2. 检测新用户并注册/登录
        try {
          const loginResult = await blockchainService.registerOrLogin()
          
          if (loginResult.isNewUser) {
            // 新用户，显示欢迎消息
            await loadTokenBalance() // 先刷新余额
            alert(`🎉 欢迎新用户！\n\n您已成功注册并获得 100 SAFE 代币奖励！\n\n交易哈希: ${loginResult.txHash}`)
          } else {
            // 老用户，静默登录
            console.log('用户已注册，直接登录')
          }
        } catch (error) {
          console.error('注册/登录失败:', error)
          // 即使注册失败，也允许用户继续使用（可能是网络问题）
          if (!error.message.includes('user rejected')) {
            alert('注册/登录失败: ' + error.message + '\n您可以继续使用，但可能无法获得新用户奖励')
          }
        }
        
        // 3. 加载数据和设置监听
        await loadReviews()
        await loadTokenBalance()
        
        // 通知父组件钱包连接成功
        emit('wallet-connected', {
          address: account.value,
          tokenBalance: tokenBalance.value,
          tokenSymbol: tokenSymbol.value
        })
        
        // 开始监听新评价事件
        try {
          blockchainService.onReviewSubmitted(handleNewReview)
        } catch (error) {
          console.error('设置事件监听失败:', error)
        }
      } catch (error) {
        alert('连接失败: ' + error.message)
        console.error(error)
        // 连接失败时重置状态
        isConnected.value = false
        account.value = null
      } finally {
        connecting.value = false
      }
    }

    const loadReviews = async () => {
      if (!isConnected.value) {
        loading.value = false
        return
      }

      loading.value = true
      try {
        console.log('开始加载评价数据...')
        
        // 获取所有链上评价数据
        const allReviews = await blockchainService.getAllReviews()
        console.log('获取到的原始评价数据:', allReviews)
        
        reviewCount.value = await blockchainService.getReviewCount()
        console.log('评价总数:', reviewCount.value)
        
        // 确保 allReviews 是数组
        if (!Array.isArray(allReviews)) {
          console.warn('返回的数据不是数组:', allReviews)
          reviews.value = []
        } else {
          // 按时间戳倒序排列（最新的在最上面，像公告板）
          // 注意：这里要创建一个新数组，避免直接修改原数组
          reviews.value = [...allReviews].sort((a, b) => {
            return (b.timestamp || 0) - (a.timestamp || 0)
          })
        }
        
        console.log(`已加载 ${reviews.value.length} 条评价数据`)
        console.log('评价列表详情:', reviews.value.map(r => ({
          id: r.id,
          address: r.address,
          timestamp: r.timestamp,
          hasText: !!r.text_review,
          hasAI: !!r.ai_summary
        })))
        
        // 如果有评价，将地图中心设置为最新评价的位置
        if (reviews.value.length > 0) {
          mapCenter.value = {
            lat: reviews.value[0].latitude,
            lng: reviews.value[0].longitude
          }
        }
      } catch (error) {
        console.error('加载评价失败:', error)
        console.error('错误详情:', error)
        // 即使出错也要清空列表并设置 loading 为 false
        reviews.value = []
        reviewCount.value = 0
        alert('加载评价失败: ' + (error.message || error.toString()))
      } finally {
        loading.value = false
        console.log('加载完成，loading状态:', loading.value)
      }
    }

    const loadTokenBalance = async () => {
      if (!isConnected.value) return
      try {
        tokenBalance.value = await blockchainService.getTokenBalance()
        tokenSymbol.value = await blockchainService.getTokenSymbol()
      } catch (error) {
        console.error('加载代币余额失败:', error)
        // 如果代币合约未配置，不显示错误
        if (!error.message.includes('代币合约未配置')) {
          tokenBalance.value = null
        }
      }
    }

    const submitting = ref(false)
    const submitStatus = ref('') // 提交状态提示
    const lookingUpAddress = ref(false) // 地址查找状态
    const addressLookupStatus = ref('') // 地址查找状态提示

    const handleSubmit = async (formData) => {
      if (!isConnected.value) {
        alert('请先连接钱包')
        return
      }

      submitting.value = true
      submitStatus.value = '正在提交评价到区块链...'

      try {
        // 提交到区块链（返回交易对象，还未确认）
        submitStatus.value = '正在发送交易，请在钱包中确认...'
        const result = await blockchainService.submitReview(formData)
        
        // 显示等待确认提示
        submitStatus.value = `交易已发送，等待确认...\n交易哈希: ${result.txHash}`
        
        // 等待交易确认
        submitStatus.value = '交易已发送，等待区块链确认中，请稍候...'
        const receipt = await blockchainService.waitForTransaction(result.txHash)
        
        // 构建成功消息（新用户奖励已在登录时发放）
        submitStatus.value = `✅ 提交成功！\n交易哈希: ${receipt.txHash}\n区块号: ${receipt.blockNumber}\n\n🎉 恭喜！您获得了 1 ${tokenSymbol.value} 评论奖励！`
        
        // 重新加载所有评价和代币余额（确保显示最新数据）
        await loadReviews()
        await loadTokenBalance()
        
        // 3秒后清除状态提示
        setTimeout(() => {
          submitStatus.value = ''
          submitting.value = false
        }, 3000)
      } catch (error) {
        console.error('提交失败:', error)
        submitting.value = false
        if (error.message && error.message.includes('user rejected')) {
          submitStatus.value = '❌ 交易已取消'
          setTimeout(() => { submitStatus.value = '' }, 3000)
        } else {
          submitStatus.value = '❌ 提交失败: ' + error.message
          setTimeout(() => { submitStatus.value = '' }, 5000)
        }
      }
    }

    const handleLocationSelect = (location) => {
      selectedLocation.value = location
      // 移动地图中心到该地点
      mapCenter.value = { lat: location.latitude, lng: location.longitude }
    }
    
    const handleLocationSelected = (location) => {
      // 当地址被选择或获取当前位置时，更新地图中心
      mapCenter.value = {
        lat: location.lat,
        lng: location.lng
      }
    }

    const handleMapClick = (location) => {
      // 如果不在图钉模式，才处理普通点击
      if (!pinMode.value) {
        // 当地图被点击时，设置选中的位置（触发一个新的对象引用）
        mapSelectedLocation.value = {
          lat: location.lat,
          lng: location.lng,
          timestamp: Date.now() // 添加时间戳确保每次都是新对象
        }
        // 更新地图中心到点击位置
        mapCenter.value = {
          lat: location.lat,
          lng: location.lng
        }
      }
    }

    const handlePinPlaced = (location) => {
      // 图钉确认后，设置位置并退出图钉模式
      mapSelectedLocation.value = {
        lat: location.lat,
        lng: location.lng,
        timestamp: Date.now()
      }
      mapCenter.value = {
        lat: location.lat,
        lng: location.lng
      }
      pinMode.value = false // 退出图钉模式
    }

    const togglePinMode = () => {
      pinMode.value = !pinMode.value
    }

    const disconnectWallet = () => {
      // 断开钱包连接
      blockchainService.removeReviewListener()
      isConnected.value = false
      account.value = null
      reviews.value = []
      reviewCount.value = 0
      tokenBalance.value = null
      mapSelectedLocation.value = null
      
      // 通知父组件断开连接
      emit('wallet-connected', {
        address: null,
        tokenBalance: null,
        tokenSymbol: 'SAFE'
      })
    }

    // 处理新评价事件（实时更新，像公告板一样）
    const handleNewReview = (newReview, newCount) => {
      // 检查是否已存在（避免重复添加）
      const exists = reviews.value.some(r => r.id === newReview.id)
      if (!exists) {
        // 将新评价添加到列表开头（最新在最上面，像公告板）
        reviews.value.unshift(newReview)
        reviewCount.value = newCount
        console.log('新评价已实时添加:', newReview)
      }
    }

    const goToHome = () => {
      emit('navigate', 'home')
    }

    // ========== 地图模块相关函数 ==========
    // 创建标记图标
    const createMarkerIcon = (color) => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        </svg>
      `
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      return URL.createObjectURL(blob)
    }

    // 创建用户位置图标
    const createUserLocationIcon = () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="#4285F4" stroke="white" stroke-width="3" opacity="0.9"/>
          <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>
      `
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      return URL.createObjectURL(blob)
    }

    // 创建选中位置图标
    const createSelectedLocationIcon = () => {
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
          <path d="M16 0 C10 0, 6 4, 6 10 C6 16, 16 32, 16 32 C16 32, 26 16, 26 10 C26 4, 22 0, 16 0 Z" 
                fill="#FF0000" stroke="white" stroke-width="2"/>
          <circle cx="16" cy="12" r="6" fill="white" opacity="0.9"/>
          <circle cx="16" cy="12" r="3" fill="#FF0000"/>
        </svg>
      `
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      return URL.createObjectURL(blob)
    }

    // 初始化地图
    const initMap = () => {
      if (typeof BMapGL === 'undefined') {
        console.error('百度地图 API 未加载')
        return
      }

      map = new BMapGL.Map('map')
      const point = new BMapGL.Point(mapCenter.value.lng, mapCenter.value.lat)
      map.centerAndZoom(point, 12)
      
      map.setMapStyle({ style: 'dark' })
      map.addControl(new BMapGL.NavigationControl())
      map.addControl(new BMapGL.ScaleControl())
      
      // 立即启用所有交互功能（滚轮缩放、拖拽等）
      map.enableScrollWheelZoom()
      map.enableDragging()
      map.enableDoubleClickZoom()
      if (map.enablePinchToZoom) {
        map.enablePinchToZoom()
      }
      
      // 添加地图点击事件
      const handleMapClickEvent = (e) => {
        if (!e) return
        
        let lat, lng
        
        if (e.point && typeof BMapGL !== 'undefined') {
          lat = e.point.lat
          lng = e.point.lng
          
          if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            const mercatorX = lng
            const mercatorY = lat
            lng = mercatorX / 20037508.34 * 180
            let lat_rad = mercatorY / 20037508.34 * Math.PI
            lat = (Math.atan(Math.exp(lat_rad)) - Math.PI / 4) * 360 / Math.PI
          }
          
          if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            try {
              if (typeof BMapGL.Projection !== 'undefined' && BMapGL.Projection.convertMC2LL) {
                const wgs84Point = BMapGL.Projection.convertMC2LL(e.point)
                if (wgs84Point) {
                  lat = wgs84Point.lat
                  lng = wgs84Point.lng
                }
              }
            } catch (error) {
              console.warn('使用百度地图转换方法失败:', error)
            }
          }
        } else if (e.latlng) {
          lat = e.latlng.lat
          lng = e.latlng.lng
        } else {
          console.error('无法获取点击位置的坐标')
          return
        }
        
        if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          console.error('无效的坐标值:', lat, lng)
          return
        }
        
        lat = parseFloat(lat.toFixed(6))
        lng = parseFloat(lng.toFixed(6))
        
        if (pinMode.value) {
          console.log('图钉模式：放置图钉', { lat, lng })
          placePin({ lat, lng })
          return
        } else {
          handleMapClick({ lat, lng })
        }
      }
      
      map.addEventListener('click', handleMapClickEvent)
    }

    // 放置图钉标记
    const placePin = (location) => {
      if (!map) return
      
      if (pinMarker) {
        map.removeOverlay(pinMarker)
        pinMarker = null
      }
      
      const point = new BMapGL.Point(location.lng, location.lat)
      const icon = new BMapGL.Icon(
        createSelectedLocationIcon(),
        new BMapGL.Size(32, 48),
        { anchor: new BMapGL.Size(16, 48) }
      )
      
      pinMarker = new BMapGL.Marker(point, { icon })
      map.addOverlay(pinMarker)
      map.panTo(point)
      
      const infoWindowContent = `
        <div style="padding: 10px; min-width: 200px; text-align: center;">
          <div style="font-weight: 500; margin-bottom: 10px;">已标记位置</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 10px;">
            ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
          </div>
          <button 
            id="confirmPinBtn" 
            style="
              background: #1976d2; 
              color: white; 
              border: none; 
              padding: 8px 16px; 
              border-radius: 4px; 
              cursor: pointer;
              font-size: 14px;
              width: 100%;
            "
            onmouseover="this.style.background='#1565c0'"
            onmouseout="this.style.background='#1976d2'"
          >
            确认使用此位置
          </button>
        </div>
      `
      
      const infoWindow = new BMapGL.InfoWindow(infoWindowContent, {
        width: 220,
        height: 'auto',
        title: '选择评价位置'
      })
      
      map.openInfoWindow(infoWindow, point)
      
      setTimeout(() => {
        const confirmBtn = document.getElementById('confirmPinBtn')
        if (confirmBtn) {
          confirmBtn.onclick = () => {
            map.closeInfoWindow()
            handlePinPlaced({ lat: location.lat, lng: location.lng })
          }
        }
      }, 100)
    }
    
    // 清除图钉
    const clearPin = () => {
      if (pinMarker) {
        map.removeOverlay(pinMarker)
        pinMarker = null
      }
      if (map) {
        map.closeInfoWindow()
      }
    }
    
    // 更新地图交互
    const updateMapInteraction = () => {
      if (!map) return
      
      // 始终启用所有交互功能（缩放、拖拽等）
      map.enableScrollWheelZoom()
      map.enableDragging()
      map.enableDoubleClickZoom()
      map.enablePinchToZoom && map.enablePinchToZoom()
      
      if (pinMode.value) {
        // 图钉模式：保持交互功能，但添加图钉样式和点击处理
        const mapElement = document.getElementById('map')
        if (mapElement) {
          mapElement.classList.add('pin-mode')
          mapClickHandler = handleMapClickDirectly
          setTimeout(() => {
            mapElement.addEventListener('click', mapClickHandler, true)
          }, 100)
        }
      } else {
        // 普通模式：移除图钉样式
        const mapElement = document.getElementById('map')
        if (mapElement) {
          mapElement.classList.remove('pin-mode')
          if (mapClickHandler) {
            mapElement.removeEventListener('click', mapClickHandler, true)
            mapClickHandler = null
          }
        }
      }
    }

    // 直接处理地图点击（备用方案）
    const handleMapClickDirectly = (e) => {
      if (!pinMode.value || !map) return
      
      const target = e.target
      if (target.tagName === 'BUTTON' || 
          target.closest('button') || 
          target.closest('.BMap_bubble_content') ||
          target.closest('.anchorBL') ||
          target.closest('.BMap_cpyCtrl') ||
          target.closest('.BMap_stdMpCtrl')) {
        return
      }
      
      const mapContainer = map.getContainer()
      const rect = mapContainer.getBoundingClientRect()
      const pixelX = e.clientX - rect.left
      const pixelY = e.clientY - rect.top
      
      try {
        if (typeof map.pixelToPoint === 'function') {
          const pixel = new BMapGL.Pixel(pixelX, pixelY)
          const point = map.pixelToPoint(pixel)
          if (point && !isNaN(point.lat) && !isNaN(point.lng)) {
            placePin({ lat: point.lat, lng: point.lng })
            return
          }
        }
        
        const mapType = map.getMapType()
        if (mapType && mapType.getProjection) {
          const projection = mapType.getProjection()
          if (projection && typeof projection.pixelToLngLat === 'function') {
            const pixel = new BMapGL.Pixel(pixelX, pixelY)
            const point = projection.pixelToLngLat(pixel)
            if (point && !isNaN(point.lat) && !isNaN(point.lng)) {
              placePin({ lat: point.lat, lng: point.lng })
              return
            }
          }
        }
        
        const centerPoint = map.getCenter()
        const zoom = map.getZoom()
        const scale = Math.pow(2, 18 - zoom)
        const centerPixel = map.pointToPixel(centerPoint)
        const offsetX = (pixelX - centerPixel.x) * scale
        const offsetY = (pixelY - centerPixel.y) * scale
        
        const latOffset = offsetY * 0.000001
        const lngOffset = offsetX * 0.000001 / Math.cos(centerPoint.lat * Math.PI / 180)
        
        const calculatedLat = centerPoint.lat - latOffset
        const calculatedLng = centerPoint.lng + lngOffset
        
        placePin({ lat: calculatedLat, lng: calculatedLng })
        
      } catch (error) {
        console.error('获取点击坐标失败:', error)
      }
    }

    // 获取用户当前位置
    const getUserLocation = () => {
      if (!map) return

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = parseFloat(position.coords.latitude.toFixed(6))
            const lng = parseFloat(position.coords.longitude.toFixed(6))
            userLocation = { lat, lng }

            if (userLocationMarker) {
              map.removeOverlay(userLocationMarker)
            }

            const point = new BMapGL.Point(lng, lat)
            const icon = new BMapGL.Icon(
              createUserLocationIcon(),
              new BMapGL.Size(32, 32),
              { anchor: new BMapGL.Size(16, 16) }
            )
            userLocationMarker = new BMapGL.Marker(point, { icon })
            map.addOverlay(userLocationMarker)

            map.centerAndZoom(point, 15)

            const infoWindow = new BMapGL.InfoWindow(
              '<div style="padding: 10px; min-width: 150px;"><strong>您的位置</strong></div>',
              { width: 150, height: 'auto' }
            )
            userLocationMarker.addEventListener('click', () => {
              map.openInfoWindow(infoWindow, point)
            })
          },
          (error) => {
            console.warn('获取用户位置失败:', error.message)
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        )
      } else {
        console.warn('浏览器不支持地理位置获取')
      }
    }

    // 更新标记
    const updateMarkers = () => {
      if (!map) return

      markers.forEach(marker => map.removeOverlay(marker))
      markers = []

      const locations = groupReviewsByLocation(reviews.value)

      locations.forEach(location => {
        const point = new BMapGL.Point(location.longitude, location.latitude)
        
        const avgScore = calculateLocationAverageScore(location)
        const overallScore = parseFloat(avgScore.overall)

        let iconColor = '#ff0000'
        if (overallScore >= 4) {
          iconColor = '#00ff00'
        } else if (overallScore >= 3) {
          iconColor = '#ffaa00'
        }

        const iconSize = location.reviews.length > 1 ? 28 : 24
        const icon = new BMapGL.Icon(
          createMarkerIcon(iconColor),
          new BMapGL.Size(iconSize, iconSize),
          { anchor: new BMapGL.Size(iconSize / 2, iconSize / 2) }
        )

        const marker = new BMapGL.Marker(point, { icon })
        
        const keywords = aggregateKeywords(location.reviews)
        const keywordTags = formatKeywords(keywords).slice(0, 5).join(' ')
        
        const infoWindowContent = `
          <div style="padding: 10px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px;">${location.address || '未知地址'}</h3>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
              <div><strong>平均评分：</strong>${overallScore.toFixed(1)}/5</div>
              <div style="margin-top: 4px;">
                照明:${avgScore.night_lighting} | 治安:${avgScore.security_status} | 女性:${avgScore.female_density} | 总体:${avgScore.overall_safety}
              </div>
              ${location.reviews.length > 1 ? `<div style="margin-top: 4px; color: #1976d2; font-weight: 500;">${location.reviews.length}条评价</div>` : ''}
            </div>
            ${keywordTags ? `<div style="margin-top: 8px; font-size: 11px; color: #1976d2; word-wrap: break-word;">${keywordTags}</div>` : ''}
          </div>
        `
        
        const infoWindow = new BMapGL.InfoWindow(infoWindowContent, {
          width: 250,
          height: 'auto'
        })

        marker.addEventListener('click', () => {
          map.openInfoWindow(infoWindow, point)
          handleLocationSelect(location)
        })

        map.addOverlay(marker)
        markers.push(marker)
      })
    }

    // 更新选中位置标记
    const updateSelectedLocationMarker = () => {
      if (!map) return

      if (selectedLocationMarker) {
        map.removeOverlay(selectedLocationMarker)
        selectedLocationMarker = null
      }

      if (mapCenter.value && mapCenter.value.lat && mapCenter.value.lng) {
        const point = new BMapGL.Point(mapCenter.value.lng, mapCenter.value.lat)
        
        const isUserLocation = userLocation && 
          Math.abs(userLocation.lat - mapCenter.value.lat) < 0.0001 &&
          Math.abs(userLocation.lng - mapCenter.value.lng) < 0.0001

        if (!isUserLocation) {
          const icon = new BMapGL.Icon(
            createSelectedLocationIcon(),
            new BMapGL.Size(32, 48),
            { anchor: new BMapGL.Size(16, 48) }
          )
          selectedLocationMarker = new BMapGL.Marker(point, { icon })
          map.addOverlay(selectedLocationMarker)

          const infoWindow = new BMapGL.InfoWindow(
            '<div style="padding: 10px; min-width: 150px;"><strong>选中位置</strong></div>',
            { width: 150, height: 'auto' }
          )
          selectedLocationMarker.addEventListener('click', () => {
            map.openInfoWindow(infoWindow, point)
          })
        }
      }
    }

    // 监听图钉模式变化
    watch(() => pinMode.value, (newValue) => {
      updateMapInteraction()
      if (!newValue) {
        clearPin()
      }
    })

    // 监听评价变化
    watch(() => reviews.value, () => {
      updateMarkers()
    }, { deep: true })

    // 监听地图中心变化
    watch(() => mapCenter.value, (newCenter) => {
      if (map && newCenter) {
        const point = new BMapGL.Point(newCenter.lng, newCenter.lat)
        map.panTo(point)
        setTimeout(() => {
          updateSelectedLocationMarker()
        }, 100)
      }
    })

    // 监听选中的城市变化，更新地图中心点
    watch(() => props.selectedRegion, (newRegion) => {
      if (newRegion && newRegion.lat && newRegion.lng) {
        mapCenter.value = { lat: newRegion.lat, lng: newRegion.lng }
        // 如果地图已初始化，立即更新中心点
        if (map) {
          const point = new BMapGL.Point(newRegion.lng, newRegion.lat)
          map.centerAndZoom(point, 12)
        }
      }
    }, { immediate: true })

    // 检查是否已连接（注意：不再自动连接，需要用户主动连接并签名）
    onMounted(async () => {
      // 初始化地图
      initMap()
      setTimeout(() => {
        updateMarkers()
        getUserLocation()
        updateSelectedLocationMarker()
        updateMapInteraction()
      }, 500)

      // 如果已经连接了钱包，加载数据
      if (isConnected.value && account.value) {
        await loadReviews()
        await loadTokenBalance()
        try {
          blockchainService.onReviewSubmitted(handleNewReview)
        } catch (error) {
          console.error('设置事件监听失败:', error)
        }
      }
    })

    // 组件卸载时移除事件监听
    onUnmounted(() => {
      blockchainService.removeReviewListener()
    })

      return {
      isConnected,
      connecting,
      account,
      reviews,
      loading,
      reviewCount,
      mapCenter,
      tokenBalance,
      tokenSymbol,
      mapSelectedLocation,
      pinMode,
      submitting,
      submitStatus,
      lookingUpAddress,
      addressLookupStatus,
      connectWallet,
      disconnectWallet,
      handleSubmit,
      handleLocationSelected,
      handleLocationSelect,
      handleMapClick,
      handlePinPlaced,
      togglePinMode,
      selectedLocation,
      goToHome
    }
  }
}
</script>

<style scoped>
/* 头部样式 - 与首页保持一致 */
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

.back-home-btn {
  background: rgba(255, 46, 151, 0.15);
  border: 1px solid rgba(255, 46, 151, 0.3);
  color: #FF2E97;
  padding: 6px 14px;
  border-radius: 15px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-shadow: 0 0 8px rgba(255, 46, 151, 0.5);
}

.back-home-btn:hover {
  background: rgba(255, 46, 151, 0.25);
  transform: translateY(-1px);
  box-shadow: 0 0 12px rgba(255, 46, 151, 0.4);
}

.wallet-status {
  display: flex;
  align-items: center;
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

.connect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.arrow-icon {
  font-size: 16px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(3px); }
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

.stats-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.stat-label-inline {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.stat-value-inline {
  color: #00F3FF;
  font-weight: 700;
  text-shadow: 0 0 8px #00F3FF;
}

/* 容器样式 - 为固定头部留出空间 */
.container {
  padding-top: 0;
}

/* 主内容区域 - 为固定头部留出空间 */
.main-content {
  margin-top: 120px !important;
  padding-top: 20px;
}

/* 地图模块样式 */
.map-container-wrapper {
  background: rgba(26, 26, 46, 0.3);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(0, 243, 255, 0.3);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 0 30px rgba(0, 243, 255, 0.2);
  height: 980px;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

#map {
  width: 100%;
  height: 100%;
}
</style>

<style>
/* 图钉模式下的鼠标样式（不使用scoped，因为需要应用到动态添加的class） */
#map.pin-mode {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='32' viewBox='0 0 24 32'%3E%3Cpath d='M12 0 C7 0, 4 3, 4 8 C4 14, 12 32, 12 32 C12 32, 20 14, 20 8 C20 3, 17 0, 12 0 Z' fill='%23FF0000' stroke='white' stroke-width='1.5'/%3E%3Ccircle cx='12' cy='10' r='4' fill='white' opacity='0.9'/%3E%3Ccircle cx='12' cy='10' r='2' fill='%23FF0000'/%3E%3C/svg%3E") 12 16, crosshair !important;
  user-select: none;
}

#map.pin-mode * {
  cursor: inherit !important;
}

/* 提交状态提示样式 */
.submit-status-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

.submit-status-card {
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(0, 243, 255, 0.5);
  border-radius: 20px;
  padding: 30px 40px;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 0 50px rgba(0, 243, 255, 0.3);
  animation: slideIn 0.3s ease-out;
}

.submit-status-text {
  color: #ffffff;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-line;
}

.loading-spinner-small {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(0, 243, 255, 0.2);
  border-top-color: #00F3FF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

