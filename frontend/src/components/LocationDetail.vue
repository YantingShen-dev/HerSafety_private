<template>
  <div class="location-detail" v-if="location">
    <!-- 关闭按钮 -->
    <button class="close-btn" @click="close" title="关闭">×</button>
    
    <!-- 地点信息 -->
    <div class="location-header">
      <h3>{{ location.address }}</h3>
      <div class="location-meta">
        <span class="review-count">{{ location.reviews.length }} 条评价</span>
        <span class="location-coords">
          {{ location.latitude.toFixed(6) }}, {{ location.longitude.toFixed(6) }}
        </span>
      </div>
    </div>
    
    <!-- 平均评分 -->
    <div class="scores-section">
      <h4>平均评分</h4>
      <div class="scores-grid">
        <div class="score-item">
          <div class="score-label">夜间照明</div>
          <div class="score-value">{{ averageScore.night_lighting }}/5</div>
        </div>
        <div class="score-item">
          <div class="score-label">治安状况</div>
          <div class="score-value">{{ averageScore.security_status }}/5</div>
        </div>
        <div class="score-item">
          <div class="score-label">女性数量</div>
          <div class="score-value">{{ averageScore.female_density }}/5</div>
        </div>
        <div class="score-item">
          <div class="score-label">总体安全</div>
          <div class="score-value">{{ averageScore.overall_safety }}/5</div>
        </div>
        <div class="score-item overall">
          <div class="score-label">综合评分</div>
          <div class="score-value">{{ averageScore.overall }}/5</div>
        </div>
      </div>
    </div>
    
    <!-- AI总结 -->
    <div class="summary-section" v-if="aggregatedSummary">
      <h4>AI总结</h4>
      <div class="summary-text">{{ aggregatedSummary }}</div>
    </div>
    
    <!-- 关键词标签 -->
    <div class="keywords-section" v-if="keywords.length > 0">
      <h4>关键词标签</h4>
      <div class="keywords-container">
        <span
          v-for="(tag, index) in keywords"
          :key="index"
          class="keyword-tag"
        >
          {{ tag }}
        </span>
      </div>
    </div>
    
    <!-- 详细评价列表 -->
    <div class="reviews-section">
      <h4>详细评价 ({{ location.reviews.length }})</h4>
      <div class="reviews-list">
        <div
          v-for="(review, index) in sortedReviews"
          :key="review.id || index"
          class="review-item"
        >
          <div class="review-header">
            <div class="review-time">{{ formatTime(review.timestamp) }}</div>
            <div class="review-scores-mini">
              <span>照明:{{ review.night_lighting || 0 }}</span>
              <span>治安:{{ review.security_status || 0 }}</span>
              <span>女性:{{ review.female_density || 0 }}</span>
              <span>总体:{{ review.overall_safety || 0 }}</span>
            </div>
          </div>
          <div class="review-content" v-if="review.text_review">
            {{ review.text_review }}
          </div>
          <div class="review-ai-summary" v-if="review.ai_summary">
            <strong>AI总结：</strong>{{ review.ai_summary }}
          </div>
          <div class="review-keywords" v-if="review.keywords">
            <span
              v-for="(keyword, idx) in formatReviewKeywords(review.keywords)"
              :key="idx"
              class="keyword-tag small"
            >
              {{ keyword }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import {
  calculateLocationAverageScore,
  aggregateKeywords,
  aggregateAISummary,
  formatKeywords
} from '../utils/locationUtils'

export default {
  name: 'LocationDetail',
  props: {
    location: {
      type: Object,
      default: null
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const averageScore = computed(() => {
      if (!props.location) return { night_lighting: 0, security_status: 0, female_density: 0, overall_safety: 0, overall: 0 }
      return calculateLocationAverageScore(props.location)
    })
    
    const keywords = computed(() => {
      if (!props.location || !props.location.reviews) return []
      const keywordData = aggregateKeywords(props.location.reviews)
      return formatKeywords(keywordData)
    })
    
    const aggregatedSummary = computed(() => {
      if (!props.location || !props.location.reviews) return ''
      return aggregateAISummary(props.location.reviews)
    })
    
    const sortedReviews = computed(() => {
      if (!props.location || !props.location.reviews) return []
      return [...props.location.reviews].sort((a, b) => {
        const timeA = a.timestamp || 0
        const timeB = b.timestamp || 0
        return timeB - timeA // 最新的在前
      })
    })
    
    const formatTime = (timestamp) => {
      if (!timestamp) return '未知时间'
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN')
    }
    
    const formatReviewKeywords = (keywordsStr) => {
      if (!keywordsStr) return []
      return keywordsStr.split(',').map(k => `#${k.trim()}`).filter(k => k !== '#')
    }
    
    const close = () => {
      emit('close')
    }
    
    return {
      averageScore,
      keywords,
      aggregatedSummary,
      sortedReviews,
      formatTime,
      formatReviewKeywords,
      close
    }
  }
}
</script>

<style scoped>
.location-detail {
  position: fixed;
  bottom: 0;
  right: 0;
  width: 400px;
  max-height: 80vh;
  background: white;
  border-top-left-radius: 12px;
  box-shadow: -2px -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow-y: auto;
  padding: 20px;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e0e0e0;
  transform: scale(1.1);
}

.location-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.location-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #333;
}

.location-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.review-count {
  font-weight: 500;
  color: #1976d2;
}

.scores-section {
  margin-bottom: 20px;
}

.scores-section h4,
.summary-section h4,
.keywords-section h4,
.reviews-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #555;
  font-weight: 600;
}

.scores-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.score-item {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  text-align: center;
}

.score-item.overall {
  grid-column: 1 / -1;
  background: #e3f2fd;
  border: 2px solid #1976d2;
}

.score-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.score-value {
  font-size: 18px;
  font-weight: bold;
  color: #1976d2;
}

.summary-section {
  margin-bottom: 20px;
}

.summary-text {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #555;
  white-space: pre-wrap;
}

.keywords-section {
  margin-bottom: 20px;
}

.keywords-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-tag {
  display: inline-block;
  padding: 4px 10px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.keyword-tag.small {
  font-size: 11px;
  padding: 2px 8px;
}

.reviews-section {
  margin-bottom: 20px;
}

.reviews-list {
  max-height: 300px;
  overflow-y: auto;
}

.review-item {
  padding: 12px;
  margin-bottom: 12px;
  background: #fafafa;
  border-radius: 6px;
  border-left: 3px solid #1976d2;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.review-time {
  font-size: 11px;
  color: #999;
}

.review-scores-mini {
  display: flex;
  gap: 6px;
  font-size: 11px;
  color: #666;
}

.review-content {
  font-size: 13px;
  color: #555;
  line-height: 1.5;
  margin-bottom: 8px;
}

.review-ai-summary {
  font-size: 12px;
  color: #1976d2;
  font-style: italic;
  margin-bottom: 8px;
  padding: 8px;
  background: #e3f2fd;
  border-radius: 4px;
}

.review-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

@media (max-width: 768px) {
  .location-detail {
    width: 100%;
    max-height: 70vh;
  }
}
</style>

