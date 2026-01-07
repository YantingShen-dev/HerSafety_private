<template>
  <div class="card">
    <h2>提交安全评价</h2>
    
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>地址 *</label>
        <div style="display: flex; gap: 8px;">
          <input
            v-model="form.address"
            type="text"
            placeholder="请输入地址"
            required
            style="flex: 1;"
          />
          <button
            type="button"
            class="btn btn-secondary"
            @click="searchAddress"
            :disabled="searchingAddress"
          >
            {{ searchingAddress ? '搜索中...' : '搜索' }}
          </button>
        </div>
        <div v-if="addressResults.length > 0" style="margin-top: 8px; max-height: 200px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px; background: white;">
          <div style="padding: 8px; background: #f5f5f5; font-size: 12px; color: #666; border-bottom: 1px solid #e0e0e0;">
            找到 {{ addressResults.length }} 个匹配结果，请选择：
          </div>
          <div
            v-for="(result, index) in addressResults"
            :key="index"
            @click="selectAddress(result)"
            style="padding: 10px; cursor: pointer; border-bottom: 1px solid #f0f0f0; transition: background 0.2s;"
            :style="{ background: selectedAddressIndex === index ? '#e3f2fd' : 'white' }"
            @mouseenter="selectedAddressIndex = index"
            @mouseleave="selectedAddressIndex = -1"
          >
            <div style="font-weight: 500; font-size: 14px; color: #1976d2;">{{ result.name || '未命名地点' }}</div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">{{ result.address || '地址不详' }}</div>
            <div v-if="result.province || result.city || result.district" style="font-size: 11px; color: #999; margin-top: 2px;">
              {{ result.province }} {{ result.city }} {{ result.district }}
            </div>
          </div>
        </div>
      </div>

      <div class="form-group" style="display: none;">
        <!-- 经纬度字段隐藏，但保留用于表单验证 -->
        <input
          v-model.number="form.latitude"
          type="number"
          step="0.000001"
          required
          style="display: none;"
        />
        <input
          v-model.number="form.longitude"
          type="number"
          step="0.000001"
          required
          style="display: none;"
        />
      </div>

      <div class="form-group">
        <label>位置信息 *</label>
        <div style="margin-bottom: 8px;">
          <button
            type="button"
            class="btn btn-secondary"
            @click="getCurrentLocation"
            :disabled="gettingLocation"
            style="width: 100%;"
          >
            {{ gettingLocation ? '获取中...' : '📍 获取当前位置' }}
          </button>
        </div>
        <div style="font-size: 12px; color: #666; margin-bottom: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
          💡 提示：您也可以直接在地图上点击来选择位置
        </div>
        <div v-if="form.latitude && form.longitude" style="margin-top: 8px; font-size: 12px; color: #2e7d32; font-weight: 500;">
          ✅ 已设置位置：{{ form.latitude.toFixed(6) }}, {{ form.longitude.toFixed(6) }}
        </div>
      </div>

      <div class="form-group">
        <label>省份/城市/区县</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
          <input v-model="form.province" type="text" placeholder="省份" />
          <input v-model="form.city" type="text" placeholder="城市" />
          <input v-model="form.district" type="text" placeholder="区县" />
        </div>
      </div>

      <div class="form-group">
        <label>夜间照明评分 (0-5) *</label>
        <div class="score-input">
          <input
            v-model.number="form.night_lighting"
            type="range"
            min="0"
            max="5"
            step="1"
            required
          />
          <span class="score-display">{{ form.night_lighting }}/5</span>
        </div>
      </div>

      <div class="form-group">
        <label>治安状况评分 (0-5) *</label>
        <div class="score-input">
          <input
            v-model.number="form.security_status"
            type="range"
            min="0"
            max="5"
            step="1"
            required
          />
          <span class="score-display">{{ form.security_status }}/5</span>
        </div>
      </div>

      <div class="form-group">
        <label>女性数量评分 (0-5) *</label>
        <div class="score-input">
          <input
            v-model.number="form.female_density"
            type="range"
            min="0"
            max="5"
            step="1"
            required
          />
          <span class="score-display">{{ form.female_density }}/5</span>
        </div>
      </div>

      <div class="form-group">
        <label>总体安全评分 (0-5) *</label>
        <div class="score-input">
          <input
            v-model.number="form.overall_safety"
            type="range"
            min="0"
            max="5"
            step="1"
            required
          />
          <span class="score-display">{{ form.overall_safety }}/5</span>
        </div>
      </div>

      <div class="form-group">
        <label>文字评价</label>
        <textarea
          v-model="form.text_review"
          placeholder="请描述该地点的安全情况..."
          rows="4"
        ></textarea>
      </div>

      <div class="form-group">
        <label>上传图片（可选，0-5张）</label>
        <div class="image-upload-container">
          <input
            ref="imageInput"
            type="file"
            accept="image/*"
            multiple
            @change="handleImageSelect"
            style="display: none;"
          />
          <button
            type="button"
            class="btn btn-secondary"
            @click="triggerImageUpload"
            :disabled="images.length >= 5"
            style="width: 100%; margin-bottom: 12px;"
          >
            📷 {{ images.length >= 5 ? '已达到最大数量（5张）' : `选择图片 (${images.length}/5)` }}
          </button>
          
          <div v-if="images.length > 0" class="image-preview-container">
            <div
              v-for="(image, index) in images"
              :key="index"
              class="image-preview-item"
            >
              <img :src="image.preview" :alt="`图片 ${index + 1}`" />
              <button
                type="button"
                class="remove-image-btn"
                @click="removeImage(index)"
                title="删除此图片"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        class="btn btn-primary"
        :disabled="submitting"
        style="width: 100%; margin-top: 16px;"
      >
        {{ submitting ? '提交中...' : '提交到区块链' }}
      </button>
    </form>
  </div>
</template>

<script>
import { ref, reactive, watch } from 'vue'
import { mapAPI, aiAPI } from '../services/api'

export default {
  name: 'ReviewForm',
  emits: ['submitted', 'location-selected', 'address-lookup-start', 'address-lookup-end'],
  props: {
    mapSelectedLocation: {
      type: Object,
      default: null
    }
  },
  setup(props, { emit }) {
    const form = reactive({
      address: '',
      latitude: 39.9042,
      longitude: 116.4074,
      province: '',
      city: '',
      district: '',
      night_lighting: 3,
      security_status: 3,
      female_density: 3,
      overall_safety: 3,
      text_review: '',
      ai_summary: '',
      keywords: ''
    })

    const submitting = ref(false)
    const message = ref('')
    const messageType = ref('')
    const searchingAddress = ref(false)
    const gettingLocation = ref(false)
    const addressResults = ref([])
    const selectedAddressIndex = ref(-1)
    const imageInput = ref(null)
    const images = ref([]) // 存储图片数据 { file, preview, base64 }

    // 搜索地址
    const searchAddress = async () => {
      if (!form.address.trim()) {
        message.value = '请输入要搜索的地址'
        messageType.value = 'error'
        setTimeout(() => { message.value = '' }, 3000)
        return
      }

      searchingAddress.value = true
      try {
        const response = await mapAPI.searchLocation(form.address)
        if (response.data.success) {
          addressResults.value = response.data.results || []
          if (addressResults.value.length === 0) {
            message.value = '未找到相关地址'
            messageType.value = 'error'
            setTimeout(() => { message.value = '' }, 3000)
          }
        }
      } catch (error) {
        message.value = '搜索失败: ' + (error.response?.data?.error || error.message)
        messageType.value = 'error'
        setTimeout(() => { message.value = '' }, 3000)
      } finally {
        searchingAddress.value = false
      }
    }

    // 选择地址
    const selectAddress = async (result) => {
      form.address = result.address || result.name
      // 格式化经纬度，保留6位小数
      form.latitude = formatCoordinate(result.latitude)
      form.longitude = formatCoordinate(result.longitude)
      
      // 先使用搜索结果中的信息（如果有）
      form.province = result.province || ''
      form.city = result.city || ''
      form.district = result.district || ''
      
      // 如果省份、城市、区县信息不完整，通过逆地理编码获取完整信息
      if (!form.province || !form.city || !form.district) {
        try {
          const response = await mapAPI.getCurrentLocation(
            form.latitude,
            form.longitude
          )
          if (response.data.success) {
            const location = response.data.location
            // 优先使用逆地理编码返回的信息，如果为空则保留搜索结果中的信息
            form.province = location.province || form.province || ''
            form.city = location.city || form.city || ''
            form.district = location.district || form.district || ''
            // 如果地址信息更完整，也可以更新地址
            if (location.address && (!form.address || form.address.length < location.address.length)) {
              form.address = location.address
            }
          }
        } catch (error) {
          console.error('获取地址详细信息失败:', error)
          // 即使获取失败，也保留搜索结果中的信息（如果有）
        }
      }
      
      addressResults.value = []
      message.value = '已选择地址'
      messageType.value = 'success'
      setTimeout(() => { message.value = '' }, 2000)
      
      // 通知父组件更新地图中心
      emit('location-selected', {
        lat: form.latitude,
        lng: form.longitude
      })
    }

    // 格式化经纬度，保留6位小数
    const formatCoordinate = (coord) => {
      return parseFloat(coord.toFixed(6))
    }

    // 触发图片上传
    const triggerImageUpload = () => {
      if (imageInput.value) {
        imageInput.value.click()
      }
    }

    // 处理图片选择
    const handleImageSelect = async (event) => {
      const files = Array.from(event.target.files || [])
      
      if (files.length === 0) return
      
      // 检查总数
      if (images.value.length + files.length > 5) {
        message.value = `最多只能上传5张图片，当前已有 ${images.value.length} 张`
        messageType.value = 'error'
        setTimeout(() => { message.value = '' }, 3000)
        return
      }
      
      // 验证文件类型和大小
      const maxSize = 5 * 1024 * 1024 // 5MB
      const validFiles = files.filter(file => {
        if (!file.type.startsWith('image/')) {
          message.value = `文件 ${file.name} 不是有效的图片格式`
          messageType.value = 'error'
          setTimeout(() => { message.value = '' }, 3000)
          return false
        }
        if (file.size > maxSize) {
          message.value = `图片 ${file.name} 大小超过5MB限制`
          messageType.value = 'error'
          setTimeout(() => { message.value = '' }, 3000)
          return false
        }
        return true
      })
      
      // 处理每个文件
      for (const file of validFiles) {
        try {
          const preview = URL.createObjectURL(file)
          const base64 = await convertToBase64(file)
          images.value.push({
            file,
            preview,
            base64
          })
        } catch (error) {
          console.error('处理图片失败:', error)
          message.value = `处理图片 ${file.name} 失败`
          messageType.value = 'error'
          setTimeout(() => { message.value = '' }, 3000)
        }
      }
      
      // 重置input
      if (imageInput.value) {
        imageInput.value.value = ''
      }
      
      if (validFiles.length > 0) {
        message.value = `成功添加 ${validFiles.length} 张图片`
        messageType.value = 'success'
        setTimeout(() => { message.value = '' }, 2000)
      }
    }

    // 删除图片
    const removeImage = (index) => {
      // 释放预览URL
      if (images.value[index]?.preview) {
        URL.revokeObjectURL(images.value[index].preview)
      }
      images.value.splice(index, 1)
    }

    // 获取当前位置
    const getCurrentLocation = () => {
      gettingLocation.value = true
      message.value = ''
      
      if (!navigator.geolocation) {
        message.value = '浏览器不支持地理位置获取，请使用HTTPS或更新浏览器'
        messageType.value = 'error'
        setTimeout(() => { message.value = '' }, 5000)
        gettingLocation.value = false
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // 格式化经纬度，保留6位小数
            form.latitude = formatCoordinate(position.coords.latitude)
            form.longitude = formatCoordinate(position.coords.longitude)
            
            // 自动查询地址信息
            try {
              const response = await mapAPI.getCurrentLocation(
                form.latitude,
                form.longitude
              )
              if (response.data.success) {
                const location = response.data.location
                form.address = location.address || ''
                form.province = location.province || ''
                form.city = location.city || ''
                form.district = location.district || ''
              }
            } catch (error) {
              console.error('获取地址信息失败:', error)
              // 即使获取地址失败，位置坐标仍然有效
              form.address = `${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`
            }
            
            message.value = '已获取当前位置'
            messageType.value = 'success'
            setTimeout(() => { message.value = '' }, 3000)
            
            // 通知父组件更新地图中心
            emit('location-selected', {
              lat: form.latitude,
              lng: form.longitude
            })
          } catch (error) {
            message.value = '处理位置信息失败: ' + error.message
            messageType.value = 'error'
            setTimeout(() => { message.value = '' }, 5000)
          } finally {
            gettingLocation.value = false
          }
        },
        (error) => {
          let errorMsg = '获取位置失败: '
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMsg += '用户拒绝了位置权限，请在浏览器设置中允许位置访问'
              break
            case error.POSITION_UNAVAILABLE:
              errorMsg += '位置信息不可用，请检查GPS是否开启'
              break
            case error.TIMEOUT:
              errorMsg += '获取位置超时，请重试'
              break
            default:
              errorMsg += error.message
              break
          }
          message.value = errorMsg
          messageType.value = 'error'
          setTimeout(() => { message.value = '' }, 5000)
          gettingLocation.value = false
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000  // 允许使用1分钟内的缓存位置
        }
      )
    }

    // 监听地图点击选择的位置
    const lookingUpAddress = ref(false)
    let lastProcessedLocation = null
    watch(() => props.mapSelectedLocation, async (newLocation) => {
      if (newLocation && newLocation.lat && newLocation.lng) {
        // 避免重复处理相同的位置
        const locationKey = `${newLocation.lat.toFixed(6)},${newLocation.lng.toFixed(6)}`
        if (lastProcessedLocation === locationKey) {
          return
        }
        lastProcessedLocation = locationKey
        
        form.latitude = formatCoordinate(newLocation.lat)
        form.longitude = formatCoordinate(newLocation.lng)
        
        // 通知父组件开始查找地址
        emit('address-lookup-start')
        
        // 自动查询地址信息
        try {
          const response = await mapAPI.getCurrentLocation(
            form.latitude,
            form.longitude
          )
          if (response.data.success) {
            const location = response.data.location
            form.address = location.address || ''
            form.province = location.province || ''
            form.city = location.city || ''
            form.district = location.district || ''
            
            message.value = '✅ 已找到地址信息'
            messageType.value = 'success'
          } else {
            form.address = `${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`
            message.value = '⚠️ 未找到详细地址，已使用坐标'
            messageType.value = 'warning'
          }
        } catch (error) {
          console.error('获取地址信息失败:', error)
          form.address = `${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`
          message.value = '⚠️ 地址查找失败，已使用坐标'
          messageType.value = 'warning'
        } finally {
          lookingUpAddress.value = false
          setTimeout(() => { 
            if (messageType.value !== 'info') {
              message.value = ''
            }
          }, 3000)
        }
        
        // 通知父组件更新地图中心
        emit('location-selected', {
          lat: form.latitude,
          lng: form.longitude
        })
      }
    }, { immediate: false })


    const handleSubmit = async () => {
      submitting.value = true
      message.value = ''
      
      try {
        // 格式化经纬度，保留6位小数
        const submitData = {
          ...form,
          latitude: formatCoordinate(form.latitude),
          longitude: formatCoordinate(form.longitude),
          images: images.value.map(img => img.base64) // 添加图片数据
        }

        // 如果有文字评价，可选：使用 AI 分析
        if (form.text_review && form.text_review.trim()) {
          try {
            const aiResponse = await aiAPI.analyzeReview(form.text_review)
            if (aiResponse.data.success) {
              submitData.ai_summary = aiResponse.data.result.summary || ''
              submitData.keywords = (aiResponse.data.result.keywords || []).join(',')
            }
          } catch (error) {
            console.warn('AI 分析失败，继续提交:', error)
            // AI 分析失败不影响提交
          }
        }

        emit('submitted', submitData)
        
        // 重置表单
        form.address = ''
        form.latitude = 39.9042
        form.longitude = 116.4074
        form.province = ''
        form.city = ''
        form.district = ''
        form.night_lighting = 3
        form.security_status = 3
        form.female_density = 3
        form.overall_safety = 3
        form.text_review = ''
        form.ai_summary = ''
        form.keywords = ''
        addressResults.value = []
        selectedAddressIndex.value = -1
        
        // 清除图片
        images.value.forEach(img => {
          if (img.preview) {
            URL.revokeObjectURL(img.preview)
          }
        })
        images.value = []
        
        message.value = '提交成功！'
        messageType.value = 'success'
        setTimeout(() => { message.value = '' }, 3000)
      } catch (error) {
        message.value = '提交失败: ' + error.message
        messageType.value = 'error'
        setTimeout(() => { message.value = '' }, 5000)
      } finally {
        submitting.value = false
      }
    }

    return {
      form,
      submitting,
      message,
      messageType,
      searchingAddress,
      gettingLocation,
      addressResults,
      selectedAddressIndex,
      imageInput,
      images,
      searchAddress,
      selectAddress,
      getCurrentLocation,
      triggerImageUpload,
      handleImageSelect,
      removeImage,
      handleSubmit
    }
  }
}
</script>

<style scoped>
.message {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

.message.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.message.error {
  background: #ffebee;
  color: #c62828;
}

.message.info {
  background: #e3f2fd;
  color: #1976d2;
  border-left: 4px solid #1976d2;
}

.message.warning {
  background: #fff3e0;
  color: #f57c00;
  border-left: 4px solid #f57c00;
}

.image-upload-container {
  width: 100%;
}

.image-preview-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.image-preview-item {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.remove-image-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 0, 0, 0.8);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-weight: bold;
}

.remove-image-btn:hover {
  background: rgba(255, 0, 0, 1);
  transform: scale(1.1);
}
</style>

