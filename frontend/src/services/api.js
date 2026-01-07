import axios from 'axios'

// 根据环境自动选择 API 地址
const API_BASE_URL = import.meta.env.PROD 
  ? '/api'  // 生产环境使用相对路径
  : 'http://localhost:5000/api'  // 开发环境使用本地服务器

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 百度地图 API 服务
export const mapAPI = {
  // 搜索位置
  searchLocation(query, region = null, location = null) {
    return api.post('/search_location', {
      query,
      region,
      location
    })
  },

  // 地理编码：地址转经纬度
  geocoding(address) {
    return api.post('/geocoding', {
      address
    })
  },

  // 逆地理编码：经纬度转地址
  reverseGeocoding(latitude, longitude) {
    return api.post('/reverse_geocoding', {
      latitude,
      longitude
    })
  },

  // 获取当前位置信息
  getCurrentLocation(latitude, longitude) {
    return api.post('/get_current_location', {
      latitude,
      longitude
    })
  }
}

// AI 分析服务（可选）
export const aiAPI = {
  // 分析评价文本
  analyzeReview(textReview) {
    return api.post('/analyze_review', {
      text_review: textReview
    })
  }
}

// 健康检查
export const healthCheck = () => {
  return api.get('/health')
}

export default api

