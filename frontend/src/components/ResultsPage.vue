<template>
  <div class="results-page">
    <!-- 顶部导航 -->
    <header class="home-header">
      <div style="display: flex; align-items: center; gap: 20px;">
        <div class="logo">HERSAFETY</div>
        <button class="back-home-btn" @click="goBack" title="返回首页">
          ← 返回
        </button>
        <div class="page-subtitle" v-if="selectedRegion || filteredReviews.length > 0">
          <span v-if="selectedRegion">{{ selectedRegion.name }} 安全评价统计</span>
          <span v-else>全部地区安全评价统计</span>
        </div>
      </div>
      <div class="wallet-status">
        <div class="stats-display">
          <div class="stat-item-header">
            <span class="stat-label-header">总评价数</span>
            <span class="stat-value-header">{{ filteredReviews.length }}</span>
          </div>
          <div class="stat-item-header">
            <span class="stat-label-header">平均评分</span>
            <span class="stat-value-header">{{ averageScore.toFixed(1) }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="results-main">
      <!-- 筛选和搜索区域 -->
      <div class="filter-section">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索地址、关键词..."
            class="search-input"
          />
          <span class="search-icon">🔍</span>
        </div>
        
        <div class="filter-controls">
          <select v-model="sortBy" class="filter-select">
            <option value="time">按时间排序</option>
            <option value="score">按评分排序</option>
            <option value="location">按地区排序</option>
          </select>
          
          <select v-model="filterScore" class="filter-select">
            <option value="all">所有评分</option>
            <option value="5">5星评价</option>
            <option value="4">4星以上</option>
            <option value="3">3星以上</option>
            <option value="2">2星以上</option>
          </select>
        </div>
      </div>

      <!-- 地区分组展示 -->
      <div class="regions-container">
        <div
          v-for="(group, region) in groupedReviews"
          :key="region"
          class="region-group"
        >
          <div class="region-header" @click="toggleRegion(region)">
            <div class="region-info">
              <h3 class="region-name">{{ region }}</h3>
              <div class="region-stats">
                <span class="review-count">{{ group.reviews.length }} 条评价</span>
                <span class="avg-score">平均 {{ group.averageScore.toFixed(1) }} 分</span>
              </div>
            </div>
            <div class="region-controls">
              <div class="score-indicator" :class="getScoreClass(group.averageScore)">
                {{ group.averageScore.toFixed(1) }}
              </div>
              <span class="expand-icon" :class="{ expanded: expandedRegions.includes(region) }">
                ▼
              </span>
            </div>
          </div>

          <!-- 评价列表 -->
          <div v-if="expandedRegions.includes(region)" class="reviews-list">
            <div
              v-for="review in group.reviews"
              :key="review.id || review.timestamp"
              class="review-card"
              :class="{ 'expanded': expandedReviews.includes(review.id || review.timestamp) }"
            >
              <div class="review-header" @click="toggleReviewDetail(review)">
                <div class="review-location">
                  <span class="location-icon">📍</span>
                  <span class="address">{{ review.address || '未知地址' }}</span>
                </div>
                <div class="review-header-right">
                  <div class="review-time">
                    {{ formatTime(review.timestamp) }}
                  </div>
                  <button 
                    class="expand-detail-btn"
                    @click.stop="toggleReviewDetail(review)"
                    :title="expandedReviews.includes(review.id || review.timestamp) ? '收起详情' : '展开详情'"
                  >
                    <span :class="['expand-icon-small', { expanded: expandedReviews.includes(review.id || review.timestamp) }]">
                      ▼
                    </span>
                  </button>
                </div>
              </div>

              <!-- 评分概览 -->
              <div class="review-scores">
                <div class="score-item">
                  <span class="score-label">总体</span>
                  <div class="stars">
                    <span v-for="i in 5" :key="`overall-${i}`" 
                          :class="['star', { active: i <= (review.overall_safety || 0) }]">★</span>
                  </div>
                  <div class="score-number">{{ review.overall_safety || 0 }}/5</div>
                </div>
                <div class="score-item">
                  <span class="score-label">照明</span>
                  <div class="stars">
                    <span v-for="i in 5" :key="`lighting-${i}`" 
                          :class="['star', { active: i <= (review.night_lighting || 0) }]">★</span>
                  </div>
                  <div class="score-number">{{ review.night_lighting || 0 }}/5</div>
                </div>
                <div class="score-item">
                  <span class="score-label">治安</span>
                  <div class="stars">
                    <span v-for="i in 5" :key="`security-${i}`" 
                          :class="['star', { active: i <= (review.security_status || 0) }]">★</span>
                  </div>
                  <div class="score-number">{{ review.security_status || 0 }}/5</div>
                </div>
                <div class="score-item">
                  <span class="score-label">女性</span>
                  <div class="stars">
                    <span v-for="i in 5" :key="`female-${i}`" 
                          :class="['star', { active: i <= (review.female_density || 0) }]">★</span>
                  </div>
                  <div class="score-number">{{ review.female_density || 0 }}/5</div>
                </div>
              </div>

              <!-- 详细信息（可展开） -->
              <div v-if="expandedReviews.includes(review.id || review.timestamp)" class="review-details">
                <!-- 位置信息 -->
                <div class="detail-section">
                  <h5 class="detail-section-title">📍 位置信息</h5>
                  <div class="detail-content">
                    <div class="detail-row">
                      <span class="detail-label">详细地址：</span>
                      <span class="detail-value">{{ review.address || '未知地址' }}</span>
                    </div>
                    <div class="detail-row" v-if="review.province || review.city || review.district">
                      <span class="detail-label">行政区划：</span>
                      <span class="detail-value">{{ review.province }} {{ review.city }} {{ review.district }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">坐标：</span>
                      <span class="detail-value coordinates-text">
                        {{ review.latitude?.toFixed(6) }}, {{ review.longitude?.toFixed(6) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 文字评价 -->
                <div v-if="review.text_review" class="detail-section">
                  <h5 class="detail-section-title">✍️ 文字评价</h5>
                  <div class="review-text-full">
                    {{ review.text_review }}
                  </div>
                </div>

                <!-- AI总结 -->
                <div v-if="review.ai_summary && review.ai_summary.trim()" class="detail-section">
                  <h5 class="detail-section-title">🤖 AI总结</h5>
                  <div class="ai-summary-full">
                    {{ review.ai_summary }}
                  </div>
                </div>

                <!-- 关键词 -->
                <div v-if="review.keywords && formatKeywords(review.keywords).length > 0" class="detail-section">
                  <h5 class="detail-section-title">🏷️ 关键词标签</h5>
                  <div class="keywords-tags-full">
                    <span 
                      v-for="(keyword, idx) in formatKeywords(review.keywords)" 
                      :key="`keyword-${idx}-${keyword}`"
                      class="keyword-tag-large"
                    >
                      {{ keyword }}
                    </span>
                  </div>
                </div>

                <!-- 提交信息 -->
                <div class="detail-section">
                  <h5 class="detail-section-title">⛓️ 链上信息</h5>
                  <div class="detail-content">
                    <div class="detail-row">
                      <span class="detail-label">提交者：</span>
                      <span class="detail-value monospace">{{ formatAddress(review.submitter) }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">提交时间：</span>
                      <span class="detail-value">{{ formatTime(review.timestamp) }}</span>
                    </div>
                    <div class="detail-row" v-if="review.id">
                      <span class="detail-label">评价ID：</span>
                      <span class="detail-value monospace">{{ review.id }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 预览信息（未展开时显示） -->
              <div v-else class="review-preview">
                <div v-if="review.text_review" class="review-text-preview">
                  "{{ review.text_review.length > 100 ? review.text_review.substring(0, 100) + '...' : review.text_review }}"
                </div>

                <!-- AI总结预览 -->
                <div v-if="review.ai_summary" class="ai-summary-preview">
                  <div class="ai-label">🤖 AI总结</div>
                  <div class="ai-content-preview">{{ review.ai_summary.length > 80 ? review.ai_summary.substring(0, 80) + '...' : review.ai_summary }}</div>
                </div>

                <!-- 关键词预览 -->
                <div v-if="review.keywords" class="keywords-preview">
                  <div class="keywords-label">🏷️ 关键词</div>
                  <div class="keywords-tags">
                    <span 
                      v-for="(keyword, idx) in formatKeywords(review.keywords).slice(0, 5)" 
                      :key="`keyword-preview-${idx}-${keyword}`"
                      class="keyword-tag"
                      v-if="keyword && keyword.trim()"
                    >
                      {{ keyword }}
                    </span>
                    <span v-if="formatKeywords(review.keywords).length > 5" class="keyword-more">
                      +{{ formatKeywords(review.keywords).length - 5 }} 个
                    </span>
                  </div>
                </div>
              </div>

              <div class="review-footer">
                <div class="reviewer-info">
                  <span class="reviewer">{{ formatAddress(review.submitter) }}</span>
                  <span class="chain-badge">⛓️ 链上存证</span>
                </div>
                <div class="review-actions">
                  <button class="action-btn" @click.stop="viewOnMap(review)">
                    <span>地图查看</span>
                  </button>
                  <button 
                    class="action-btn secondary" 
                    @click.stop="toggleReviewDetail(review)"
                  >
                    <span>{{ expandedReviews.includes(review.id || review.timestamp) ? '收起详情' : '展开详情' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="Object.keys(groupedReviews).length === 0 && !loading" class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>暂无评价数据</h3>
        <p>该地区还没有安全评价，成为第一个评价者吧！</p>
        <button class="empty-action-btn" @click="goToSubmit">
          <span>立即评价</span>
          <span class="btn-arrow">→</span>
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    </main>

    <!-- 地图查看弹窗 -->
    <div v-if="showMapModal" class="modal-overlay" @click="showMapModal = false">
      <div class="modal-content map-modal" @click.stop>
        <div class="modal-header">
          <h3>地图位置</h3>
          <button class="modal-close" @click="showMapModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="map-preview-container">
            <div id="map-preview"></div>
          </div>
          <div class="location-info">
            <h4>{{ selectedReview?.address || '未知地址' }}</h4>
            <p>{{ selectedReview?.province }} {{ selectedReview?.city }} {{ selectedReview?.district }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import blockchainService from '../services/blockchain'

export default {
  name: 'ResultsPage',
  props: {
    selectedRegion: {
      type: Object,
      default: null
    },
    isConnected: {
      type: Boolean,
      default: false
    },
    account: {
      type: String,
      default: null
    }
  },
  emits: ['navigate'],
  setup(props, { emit }) {
    const reviews = ref([])
    const loading = ref(false)
    const searchQuery = ref('')
    const sortBy = ref('time')
    const filterScore = ref('all')
    const expandedRegions = ref([])
    const expandedReviews = ref([]) // 展开的详细评价ID列表
    const showMapModal = ref(false)
    const selectedReview = ref(null)
    let previewMap = null

    // 返回主页
    const goBack = () => {
      emit('navigate', 'home')
    }

    // 去评价页面
    const goToSubmit = () => {
      emit('navigate', 'submit', { region: props.selectedRegion })
    }

    // 加载评价数据
    const loadReviews = async () => {
      if (!props.isConnected) {
        loading.value = false
        return
      }

      loading.value = true
      try {
        const allReviews = await blockchainService.getAllReviews()
        reviews.value = allReviews || []
        
        // 数据加载完成后，默认展开第一个地区
        setTimeout(() => {
          const regions = Object.keys(groupedReviews.value)
          if (regions.length > 0 && expandedRegions.value.length === 0) {
            expandedRegions.value.push(regions[0])
          }
        }, 100)
      } catch (error) {
        console.error('加载评价失败:', error)
        reviews.value = []
      } finally {
        loading.value = false
      }
    }

    // 格式化关键词
    const formatKeywords = (keywordsStr) => {
      if (!keywordsStr) return []
      // 确保 keywordsStr 是字符串
      const str = String(keywordsStr)
      return str.split(',')
        .map(k => k && typeof k === 'string' ? k.trim() : '')
        .filter(k => k && k.length > 0)
        .map(k => `#${k}`)
    }

    // 筛选后的评价
    const filteredReviews = computed(() => {
      let filtered = reviews.value

      // 根据选中的地区过滤
      if (props.selectedRegion && props.selectedRegion.name) {
        const regionName = props.selectedRegion.name
        filtered = filtered.filter(review => {
          const reviewCity = (review.city || '').replace('市', '')
          const reviewProvince = (review.province || '').replace('市', '')
          const selectedCity = regionName.replace('市', '')
          
          return reviewCity.includes(selectedCity) || 
                 reviewProvince.includes(selectedCity) ||
                 selectedCity.includes(reviewCity) ||
                 selectedCity.includes(reviewProvince)
        })
      }

      // 搜索筛选
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(review => 
          review.address?.toLowerCase().includes(query) ||
          review.text_review?.toLowerCase().includes(query) ||
          review.province?.toLowerCase().includes(query) ||
          review.city?.toLowerCase().includes(query) ||
          review.district?.toLowerCase().includes(query) ||
          review.keywords?.toLowerCase().includes(query)
        )
      }

      // 评分筛选
      if (filterScore.value !== 'all') {
        const minScore = parseInt(filterScore.value)
        filtered = filtered.filter(review => (review.overall_safety || 0) >= minScore)
      }

      // 排序
      if (sortBy.value === 'time') {
        filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      } else if (sortBy.value === 'score') {
        filtered.sort((a, b) => (b.overall_safety || 0) - (a.overall_safety || 0))
      } else if (sortBy.value === 'location') {
        filtered.sort((a, b) => (a.address || '').localeCompare(b.address || ''))
      }

      return filtered
    })

    // 格式化地区名称（去掉"市"字）
    const formatRegionName = (name) => {
      if (!name) return '未知地区'
      return name.replace('市', '').trim()
    }

    // 按地区分组的评价
    const groupedReviews = computed(() => {
      const groups = {}
      
      filteredReviews.value.forEach(review => {
        const rawRegion = review.city || review.province || '未知地区'
        const region = formatRegionName(rawRegion)
        
        if (!groups[region]) {
          groups[region] = {
            reviews: [],
            averageScore: 0
          }
        }
        
        groups[region].reviews.push(review)
      })

      // 计算每个地区的平均分
      Object.keys(groups).forEach(region => {
        const reviews = groups[region].reviews
        const totalScore = reviews.reduce((sum, review) => sum + (review.overall_safety || 0), 0)
        groups[region].averageScore = reviews.length > 0 ? totalScore / reviews.length : 0
      })

      return groups
    })

    // 平均评分
    const averageScore = computed(() => {
      if (filteredReviews.value.length === 0) return 0
      const totalScore = filteredReviews.value.reduce((sum, review) => sum + (review.overall_safety || 0), 0)
      return totalScore / filteredReviews.value.length
    })

    // 切换地区展开状态
    const toggleRegion = (region) => {
      const index = expandedRegions.value.indexOf(region)
      if (index > -1) {
        expandedRegions.value.splice(index, 1)
      } else {
        expandedRegions.value.push(region)
      }
    }

    // 选择评价
    const selectReview = (review) => {
      selectedReview.value = review
    }

    // 切换评价详情展开/收起
    const toggleReviewDetail = (review) => {
      const reviewId = review.id || review.timestamp
      const index = expandedReviews.value.indexOf(reviewId)
      if (index > -1) {
        expandedReviews.value.splice(index, 1)
      } else {
        expandedReviews.value.push(reviewId)
      }
    }

    // 在地图上查看
    const viewOnMap = (review) => {
      selectedReview.value = review
      showMapModal.value = true
      
      // 初始化地图预览
      setTimeout(() => {
        initMapPreview(review)
      }, 100)
    }

    // 初始化地图预览
    const initMapPreview = (review) => {
      if (typeof BMapGL === 'undefined' || !review) return

      // 清除旧地图
      if (previewMap) {
        previewMap = null
      }

      const mapElement = document.getElementById('map-preview')
      if (!mapElement) return

      previewMap = new BMapGL.Map('map-preview')
      const point = new BMapGL.Point(review.longitude, review.latitude)
      previewMap.centerAndZoom(point, 15)
      previewMap.setMapStyle({ style: 'dark' })

      // 添加标记
      const icon = new BMapGL.Icon(
        createMarkerIcon('#FF2E97'),
        new BMapGL.Size(32, 32),
        { anchor: new BMapGL.Size(16, 16) }
      )
      const marker = new BMapGL.Marker(point, { icon })
      previewMap.addOverlay(marker)

      const infoWindow = new BMapGL.InfoWindow(
        `<div style="padding: 10px; min-width: 150px;"><strong>${review.address || '未知地址'}</strong></div>`,
        { width: 150, height: 'auto' }
      )
      marker.addEventListener('click', () => {
        previewMap.openInfoWindow(infoWindow, point)
      })
    }

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

    // 获取评分等级样式
    const getScoreClass = (score) => {
      if (score >= 4.5) return 'excellent'
      if (score >= 3.5) return 'good'
      if (score >= 2.5) return 'average'
      return 'poor'
    }

    // 格式化时间
    const formatTime = (timestamp) => {
      if (!timestamp) return '未知时间'
      const date = new Date(timestamp)
      return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }

    // 格式化地址
    const formatAddress = (address) => {
      if (!address) return '匿名用户'
      return `${address.substring(0, 6)}...${address.substring(38)}`
    }

    // 监听连接状态变化
    watch(() => props.isConnected, (newValue) => {
      if (newValue) {
        loadReviews()
      }
    })

    onMounted(() => {
      if (props.isConnected) {
        loadReviews()
      }
    })

    onUnmounted(() => {
      if (previewMap) {
        previewMap = null
      }
    })

    return {
      reviews,
      loading,
      searchQuery,
      sortBy,
      filterScore,
      expandedRegions,
      expandedReviews,
      showMapModal,
      selectedReview,
      filteredReviews,
      groupedReviews,
      averageScore,
      goBack,
      goToSubmit,
      toggleRegion,
      toggleReviewDetail,
      selectReview,
      viewOnMap,
      getScoreClass,
      formatTime,
      formatAddress,
      formatKeywords
    }
  }
}
</script>

<style scoped>
.results-page {
  min-height: 100vh;
  background: #0A0A14;
  color: #ffffff;
  position: relative;
}

/* 顶部导航 - 与首页和地图页保持一致 */
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

.page-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
  padding-left: 20px;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
}

.wallet-status {
  display: flex;
  align-items: center;
}

.stats-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.stat-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(0, 243, 255, 0.1);
  border: 1px solid rgba(0, 243, 255, 0.3);
  border-radius: 12px;
}

.stat-label-header {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value-header {
  font-size: 16px;
  font-weight: 700;
  color: #00F3FF;
  text-shadow: 0 0 8px rgba(0, 243, 255, 0.6);
}

/* 主内容区域 - 为固定头部留出空间 */
.results-main {
  padding: 30px 40px;
  max-width: 1200px;
  margin: 0 auto;
  margin-top: 100px !important;
  padding-top: 30px;
}

/* 筛选区域 */
.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  gap: 20px;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 12px 45px 12px 15px;
  background: rgba(10, 10, 20, 0.8);
  border: 2px solid rgba(0, 243, 255, 0.3);
  border-radius: 25px;
  color: white;
  font-size: 14px;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #00F3FF;
  box-shadow: 0 0 15px rgba(0, 243, 255, 0.3);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #00F3FF;
  font-size: 16px;
}

.filter-controls {
  display: flex;
  gap: 15px;
}

.filter-select {
  padding: 10px 15px;
  background: rgba(10, 10, 20, 0.8);
  border: 2px solid rgba(0, 243, 255, 0.3);
  border-radius: 15px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #00F3FF;
  box-shadow: 0 0 15px rgba(0, 243, 255, 0.3);
}

/* 地区分组 */
.regions-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.region-group {
  background: rgba(26, 26, 46, 0.3);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(255, 46, 151, 0.3);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 0 30px rgba(255, 46, 151, 0.2);
}

.region-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(255, 46, 151, 0.2);
}

.region-header:hover {
  background: rgba(255, 46, 151, 0.05);
}

.region-info h3 {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 5px;
}

.region-stats {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.region-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.score-indicator {
  padding: 8px 12px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 14px;
}

.score-indicator.excellent {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.score-indicator.good {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.score-indicator.average {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.score-indicator.poor {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.expand-icon {
  color: #00F3FF;
  font-size: 12px;
  transition: transform 0.3s ease;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

/* 评价列表 */
.reviews-list {
  padding: 0 25px 25px;
}

.review-card {
  background: rgba(10, 10, 20, 0.5);
  border: 1px solid rgba(0, 243, 255, 0.2);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.review-card:hover {
  border-color: rgba(0, 243, 255, 0.4);
  box-shadow: 0 0 20px rgba(0, 243, 255, 0.1);
  transform: translateY(-2px);
}

.review-card.expanded {
  border-color: rgba(255, 46, 151, 0.4);
  box-shadow: 0 0 30px rgba(255, 46, 151, 0.2);
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  cursor: pointer;
  padding: 8px;
  margin: -8px -8px 15px -8px;
  border-radius: 8px;
  transition: background 0.3s ease;
}

.review-header:hover {
  background: rgba(0, 243, 255, 0.05);
}

.review-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.expand-detail-btn {
  background: rgba(0, 243, 255, 0.1);
  border: 1px solid rgba(0, 243, 255, 0.3);
  border-radius: 8px;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #00F3FF;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-detail-btn:hover {
  background: rgba(0, 243, 255, 0.2);
  border-color: #00F3FF;
}

.expand-icon-small {
  font-size: 10px;
  transition: transform 0.3s ease;
  display: inline-block;
}

.expand-icon-small.expanded {
  transform: rotate(180deg);
}

.review-location {
  display: flex;
  align-items: center;
  gap: 8px;
}

.location-icon {
  color: #FF2E97;
}

.address {
  font-weight: 600;
  color: #ffffff;
}

.review-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.review-scores {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 15px;
}

.score-item {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-number {
  font-size: 11px;
  color: #00F3FF;
  font-weight: 600;
  text-shadow: 0 0 6px rgba(0, 243, 255, 0.6);
}

.score-label {
  display: block;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stars {
  display: flex;
  justify-content: center;
  gap: 2px;
}

.star {
  color: rgba(255, 255, 255, 0.2);
  font-size: 14px;
  transition: color 0.3s ease;
}

.star.active {
  color: #FFD700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
}

/* 预览信息 */
.review-preview {
  margin-bottom: 15px;
}

.review-text-preview {
  font-style: italic;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border-left: 3px solid #00F3FF;
  font-size: 13px;
  line-height: 1.5;
}

.ai-summary-preview {
  margin-bottom: 12px;
  padding: 10px;
  background: rgba(185, 103, 255, 0.1);
  border: 1px solid rgba(185, 103, 255, 0.3);
  border-radius: 8px;
}

.ai-content-preview {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
  margin-top: 5px;
}

.keywords-preview {
  margin-bottom: 12px;
}

.keyword-more {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

/* 详细信息（展开后） */
.review-details {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid rgba(0, 243, 255, 0.2);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.detail-section {
  margin-bottom: 20px;
  padding: 15px;
  background: rgba(10, 10, 20, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(0, 243, 255, 0.1);
}

.detail-section-title {
  font-size: 14px;
  font-weight: 700;
  color: #00F3FF;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-shadow: 0 0 8px rgba(0, 243, 255, 0.6);
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 13px;
}

.detail-label {
  color: rgba(255, 255, 255, 0.6);
  min-width: 80px;
  font-weight: 500;
}

.detail-value {
  color: rgba(255, 255, 255, 0.9);
  flex: 1;
  word-break: break-word;
}

.detail-value.monospace {
  font-family: monospace;
  font-size: 12px;
}

.coordinates-text {
  font-family: monospace;
  font-size: 11px;
  color: rgba(0, 243, 255, 0.8);
}

.detail-scores-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.detail-score-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-score-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.detail-score-bar {
  position: relative;
  height: 24px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(0, 243, 255, 0.2);
}

.score-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #00F3FF, #0099CC);
  border-radius: 12px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
}

.score-bar-text {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
}

.review-text-full {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border-left: 3px solid #00F3FF;
  white-space: pre-wrap;
}

.ai-summary-full {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  padding: 12px;
  background: rgba(185, 103, 255, 0.1);
  border-radius: 8px;
  border-left: 3px solid #B967FF;
  white-space: pre-wrap;
}

.keywords-tags-full {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-tag-large {
  font-size: 12px;
  background: rgba(0, 243, 255, 0.2);
  color: #00F3FF;
  padding: 6px 12px;
  border-radius: 15px;
  border: 1px solid rgba(0, 243, 255, 0.4);
  font-weight: 600;
  text-shadow: 0 0 6px rgba(0, 243, 255, 0.6);
  transition: all 0.3s ease;
}

.keyword-tag-large:hover {
  background: rgba(0, 243, 255, 0.3);
  transform: scale(1.05);
}

/* AI总结样式 */
.ai-summary {
  margin-bottom: 12px;
  padding: 10px;
  background: rgba(185, 103, 255, 0.1);
  border: 1px solid rgba(185, 103, 255, 0.3);
  border-radius: 8px;
}

.ai-label {
  font-size: 11px;
  color: #B967FF;
  font-weight: 700;
  margin-bottom: 5px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.ai-content {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.4;
}

/* 关键词样式 */
.keywords-section {
  margin-bottom: 12px;
}

.keywords-label {
  font-size: 11px;
  color: #00F3FF;
  font-weight: 700;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.keywords-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.keyword-tag {
  font-size: 10px;
  background: rgba(0, 243, 255, 0.2);
  color: #00F3FF;
  padding: 3px 8px;
  border-radius: 12px;
  border: 1px solid rgba(0, 243, 255, 0.4);
  font-weight: 600;
  text-shadow: 0 0 6px rgba(0, 243, 255, 0.6);
}

.review-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.reviewer-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reviewer {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-family: monospace;
}

.chain-badge {
  font-size: 10px;
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.action-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #B967FF, #8A4FFF);
  border: none;
  border-radius: 15px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:hover {
  box-shadow: 0 0 15px rgba(185, 103, 255, 0.5);
  transform: scale(1.05);
}

.action-btn.secondary {
  background: linear-gradient(135deg, #00F3FF, #0099CC);
}

.action-btn.secondary:hover {
  box-shadow: 0 0 15px rgba(0, 243, 255, 0.5);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: rgba(255, 255, 255, 0.6);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 24px;
  margin-bottom: 10px;
  color: #ffffff;
}

.empty-state p {
  font-size: 16px;
  margin-bottom: 30px;
}

.empty-action-btn {
  padding: 15px 30px;
  background: linear-gradient(135deg, #FF2E97, #FF1744);
  border: none;
  border-radius: 25px;
  color: white;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(255, 46, 151, 0.5);
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.empty-action-btn:hover {
  box-shadow: 0 0 30px rgba(255, 46, 151, 0.8);
  transform: translateY(-3px);
}

.btn-arrow {
  transition: transform 0.3s ease;
}

.empty-action-btn:hover .btn-arrow {
  transform: translateX(4px);
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 80px 20px;
  color: rgba(255, 255, 255, 0.6);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 243, 255, 0.2);
  border-top-color: #00F3FF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 地图弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(20px);
  border: 2px solid rgba(255, 46, 151, 0.3);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 0 50px rgba(255, 46, 151, 0.3);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.map-modal {
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 1px solid rgba(255, 46, 151, 0.2);
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
}

.modal-close {
  background: none;
  border: none;
  color: #FF2E97;
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: rgba(255, 46, 151, 0.1);
  transform: scale(1.1);
}

.modal-body {
  padding: 20px 30px;
}

.map-preview-container {
  height: 400px;
  border-radius: 15px;
  overflow: hidden;
  margin-bottom: 20px;
}

#map-preview {
  width: 100%;
  height: 100%;
}

.location-info h4 {
  font-size: 18px;
  color: #ffffff;
  margin-bottom: 8px;
}

.location-info p {
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
}

.coordinates {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-family: monospace;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .results-header {
    padding: 15px 20px;
    flex-direction: column;
    gap: 15px;
  }

  .stats-info {
    gap: 10px;
  }

  .results-main {
    padding: 20px;
  }

  .filter-section {
    flex-direction: column;
    gap: 15px;
  }

  .filter-controls {
    flex-direction: column;
    gap: 10px;
  }

  .review-scores {
    grid-template-columns: repeat(2, 1fr);
  }

  .review-footer {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .modal-content {
    width: 95%;
    max-height: 90vh;
  }

  .map-preview-container {
    height: 300px;
  }
}
</style>

