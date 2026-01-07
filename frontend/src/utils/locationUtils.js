/**
 * 地点工具函数
 * 用于按地点分组评论、聚合关键词和AI总结
 */

// 判断两个坐标是否相近（在同一个地点）
const LOCATION_THRESHOLD = 0.001 // 约100米

/**
 * 计算两个坐标的距离（简化计算）
 */
function isNearbyLocation(lat1, lng1, lat2, lng2) {
  const latDiff = Math.abs(lat1 - lat2)
  const lngDiff = Math.abs(lng1 - lng2)
  return latDiff < LOCATION_THRESHOLD && lngDiff < LOCATION_THRESHOLD
}

/**
 * 按地点分组评论
 * @param {Array} reviews 评论列表
 * @returns {Array} 分组后的地点列表，每个地点包含多个评论
 */
export function groupReviewsByLocation(reviews) {
  const locations = []
  
  reviews.forEach(review => {
    let found = false
    
    // 查找是否已有相近的地点
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i]
      const firstReview = location.reviews[0]
      
      if (isNearbyLocation(
        review.latitude,
        review.longitude,
        firstReview.latitude,
        firstReview.longitude
      )) {
        // 添加到现有地点
        location.reviews.push(review)
        found = true
        break
      }
    }
    
    // 如果没有找到相近地点，创建新地点
    if (!found) {
      locations.push({
        id: `location-${review.latitude}-${review.longitude}`,
        latitude: review.latitude,
        longitude: review.longitude,
        address: review.address || '未知地址',
        reviews: [review]
      })
    }
  })
  
  return locations
}

/**
 * 计算地点的平均评分
 */
export function calculateLocationAverageScore(location) {
  if (!location.reviews || location.reviews.length === 0) {
    return {
      night_lighting: 0,
      security_status: 0,
      female_density: 0,
      overall_safety: 0,
      overall: 0
    }
  }
  
  const totals = {
    night_lighting: 0,
    security_status: 0,
    female_density: 0,
    overall_safety: 0
  }
  
  location.reviews.forEach(review => {
    totals.night_lighting += review.night_lighting || 0
    totals.security_status += review.security_status || 0
    totals.female_density += review.female_density || 0
    totals.overall_safety += review.overall_safety || 0
  })
  
  const count = location.reviews.length
  const averages = {
    night_lighting: (totals.night_lighting / count).toFixed(1),
    security_status: (totals.security_status / count).toFixed(1),
    female_density: (totals.female_density / count).toFixed(1),
    overall_safety: (totals.overall_safety / count).toFixed(1),
    overall: ((totals.night_lighting + totals.security_status + totals.female_density + totals.overall_safety) / (count * 4)).toFixed(1)
  }
  
  return averages
}

/**
 * 提取并聚合关键词
 * @param {Array} reviews 评论列表
 * @returns {Array} 高频关键词数组（带频率）
 */
export function aggregateKeywords(reviews) {
  const keywordMap = {}
  
  reviews.forEach(review => {
    if (review.keywords) {
      // 关键词可能是逗号分隔的字符串
      const keywords = review.keywords.split(',').map(k => k.trim()).filter(k => k)
      keywords.forEach(keyword => {
        keywordMap[keyword] = (keywordMap[keyword] || 0) + 1
      })
    }
  })
  
  // 转换为数组并按频率排序
  const keywordArray = Object.entries(keywordMap)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // 取前10个高频关键词
  
  return keywordArray
}

/**
 * 聚合AI总结
 * 如果有多条AI总结，合并它们；如果没有，使用第一条的文字评价
 */
export function aggregateAISummary(reviews) {
  const summaries = reviews
    .map(r => r.ai_summary || r.text_review)
    .filter(s => s && s.trim())
  
  if (summaries.length === 0) {
    return '暂无评价摘要'
  }
  
  if (summaries.length === 1) {
    return summaries[0]
  }
  
  // 如果有多条总结，合并它们
  // 可以简单地连接，或者在前端显示多条
  return summaries.join('\n\n')
}

/**
 * 格式化关键词显示（添加#标签）
 */
export function formatKeywords(keywords) {
  if (!keywords || keywords.length === 0) {
    return []
  }
  
  return keywords.map(k => `#${k.keyword}`)
}

