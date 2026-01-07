<template>
  <div class="map-container">
    <div id="map"></div>
  </div>
</template>

<script>
import { onMounted, watch } from 'vue'
import { groupReviewsByLocation, calculateLocationAverageScore, aggregateKeywords, formatKeywords } from '../utils/locationUtils'

export default {
  name: 'MapView',
  props: {
    reviews: {
      type: Array,
      default: () => []
    },
    center: {
      type: Object,
      default: () => ({ lat: 39.9042, lng: 116.4074 }) // 北京
    },
    pinMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['map-click', 'pin-placed', 'location-select'],
  setup(props, { emit }) {
    let map = null
    let markers = []
    let userLocationMarker = null
    let userLocation = null
    let selectedLocationMarker = null
    let pinMarker = null // 图钉标记
    let mapClickHandler = null // 备用点击处理器

    const createMarkerIcon = (color) => {
      // 创建一个简单的 SVG 图标
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
        </svg>
      `
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      return URL.createObjectURL(blob)
    }

    const createUserLocationIcon = () => {
      // 创建用户位置图标（蓝色定位点）
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="#4285F4" stroke="white" stroke-width="3" opacity="0.9"/>
          <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>
      `
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      return URL.createObjectURL(blob)
    }

    const createSelectedLocationIcon = () => {
      // 创建选中位置图标（红色指针/图钉）
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
          <!-- 指针主体 -->
          <path d="M16 0 C10 0, 6 4, 6 10 C6 16, 16 32, 16 32 C16 32, 26 16, 26 10 C26 4, 22 0, 16 0 Z" 
                fill="#FF0000" stroke="white" stroke-width="2"/>
          <!-- 内部圆圈 -->
          <circle cx="16" cy="12" r="6" fill="white" opacity="0.9"/>
          <circle cx="16" cy="12" r="3" fill="#FF0000"/>
        </svg>
      `
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      return URL.createObjectURL(blob)
    }

    const initMap = () => {
      if (typeof BMapGL === 'undefined') {
        console.error('百度地图 API 未加载')
        return
      }

      // 创建地图实例
      map = new BMapGL.Map('map')
      const point = new BMapGL.Point(props.center.lng, props.center.lat)
      map.centerAndZoom(point, 12)
      
      // 默认启用缩放和拖拽，但会根据图钉模式动态调整
      // 在 onMounted 中会根据 pinMode 状态调用 updateMapInteraction() 来设置正确的状态

      // 设置地图样式为深色主题
      map.setMapStyle({
        style: 'dark'
      })

      // 添加控件
      map.addControl(new BMapGL.NavigationControl())
      map.addControl(new BMapGL.ScaleControl())
      
      // 添加地图点击事件（百度地图API）
      const handleMapClickEvent = (e) => {
        if (!e) return
        
        // 如果不在图钉模式且不是普通点击，直接返回
        // 图钉模式下由 handleMapClickDirectly 处理
        
        let lat, lng
        
        // 百度地图GL版本：e.point 可能是墨卡托坐标或经纬度坐标
        if (e.point && typeof BMapGL !== 'undefined') {
          // 先尝试直接读取
          lat = e.point.lat
          lng = e.point.lng
          
          // 检查是否是墨卡托坐标（数值超出经纬度范围）
          if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            // 这是墨卡托坐标，需要转换为经纬度
            const mercatorX = lng
            const mercatorY = lat
            
            // Web Mercator 投影转经纬度公式
            lng = mercatorX / 20037508.34 * 180
            let lat_rad = mercatorY / 20037508.34 * Math.PI
            lat = (Math.atan(Math.exp(lat_rad)) - Math.PI / 4) * 360 / Math.PI
            
            console.log('墨卡托坐标转换:', { mercator: { x: mercatorX, y: mercatorY }, latlng: { lat, lng } })
          }
          
          // 如果转换后还是无效，尝试使用百度地图的转换方法
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
        
        // 最终验证坐标有效性
        if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          console.error('无效的坐标值:', lat, lng)
          return
        }
        
        // 格式化坐标，保留6位小数
        lat = parseFloat(lat.toFixed(6))
        lng = parseFloat(lng.toFixed(6))
        
        // 如果是图钉模式，放置图钉标记（但不阻止事件冒泡，让备用处理器也可以工作）
        if (props.pinMode) {
          console.log('图钉模式：放置图钉', { lat, lng })
          placePin({ lat, lng })
          // 阻止后续处理
          return
        } else {
          // 普通模式，直接触发点击事件
          emit('map-click', { lat, lng })
        }
      }
      
      map.addEventListener('click', handleMapClickEvent)
    }

    // 放置图钉标记
    const placePin = (location) => {
      if (!map) return
      
      // 移除旧的图钉
      if (pinMarker) {
        map.removeOverlay(pinMarker)
        pinMarker = null
      }
      
      // 创建图钉图标（红色图钉）
      const point = new BMapGL.Point(location.lng, location.lat)
      const icon = new BMapGL.Icon(
        createSelectedLocationIcon(),
        new BMapGL.Size(32, 48),
        { anchor: new BMapGL.Size(16, 48) }
      )
      
      // 创建图钉标记
      pinMarker = new BMapGL.Marker(point, { icon })
      map.addOverlay(pinMarker)
      
      // 将地图中心移动到图钉位置
      map.panTo(point)
      
      // 添加信息窗口，显示确认按钮
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
      
      // 等待DOM更新后绑定确认按钮事件
      setTimeout(() => {
        const confirmBtn = document.getElementById('confirmPinBtn')
        if (confirmBtn) {
          confirmBtn.onclick = () => {
            // 关闭信息窗口
            map.closeInfoWindow()
            // 触发图钉放置事件
            emit('pin-placed', { lat: location.lat, lng: location.lng })
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
    
    // 更新地图交互（缩放、拖拽）
    const updateMapInteraction = () => {
      if (!map) return
      
      // 始终启用所有交互功能（缩放、拖拽等）
      map.enableScrollWheelZoom()
      map.enableDragging()
      map.enableDoubleClickZoom()
      map.enablePinchToZoom && map.enablePinchToZoom() // 如果支持，启用双指缩放
      
      if (props.pinMode) {
        // 图钉模式：保持交互功能，但添加图钉样式和点击处理
        const mapElement = document.getElementById('map')
        if (mapElement) {
          mapElement.classList.add('pin-mode')
          // 存储处理器以便后续移除
          mapClickHandler = handleMapClickDirectly
          // 确保点击事件能正常工作：使用捕获阶段监听
          setTimeout(() => {
            mapElement.addEventListener('click', mapClickHandler, true)
          }, 100)
        }
      } else {
        // 普通模式：移除图钉样式
        const mapElement = document.getElementById('map')
        if (mapElement) {
          mapElement.classList.remove('pin-mode')
          // 移除备用点击监听器
          if (mapClickHandler) {
            mapElement.removeEventListener('click', mapClickHandler, true)
            mapClickHandler = null
          }
        }
      }
    }

    // 直接处理地图点击（作为备用方案，当禁用拖拽导致点击事件失效时使用）
    const handleMapClickDirectly = (e) => {
      if (!props.pinMode || !map) return
      
      // 如果点击的是按钮、控件或信息窗口，不处理
      const target = e.target
      if (target.tagName === 'BUTTON' || 
          target.closest('button') || 
          target.closest('.BMap_bubble_content') ||
          target.closest('.anchorBL') ||
          target.closest('.BMap_cpyCtrl') ||
          target.closest('.BMap_stdMpCtrl')) {
        return
      }
      
      // 获取点击位置的像素坐标
      const mapContainer = map.getContainer()
      const rect = mapContainer.getBoundingClientRect()
      const pixelX = e.clientX - rect.left
      const pixelY = e.clientY - rect.top
      
      console.log('图钉模式点击:', { pixelX, pixelY, clientX: e.clientX, clientY: e.clientY })
      
      // 使用百度地图的像素转坐标方法
      try {
        // 方法1：使用 map.pixelToPoint（如果存在）
        if (typeof map.pixelToPoint === 'function') {
          const pixel = new BMapGL.Pixel(pixelX, pixelY)
          const point = map.pixelToPoint(pixel)
          if (point && !isNaN(point.lat) && !isNaN(point.lng)) {
            console.log('使用 pixelToPoint 获取坐标:', point.lat, point.lng)
            placePin({ lat: point.lat, lng: point.lng })
            return
          }
        }
        
        // 方法2：使用投影转换
        const mapType = map.getMapType()
        if (mapType && mapType.getProjection) {
          const projection = mapType.getProjection()
          if (projection && typeof projection.pixelToLngLat === 'function') {
            const pixel = new BMapGL.Pixel(pixelX, pixelY)
            const point = projection.pixelToLngLat(pixel)
            if (point && !isNaN(point.lat) && !isNaN(point.lng)) {
              console.log('使用投影转换获取坐标:', point.lat, point.lng)
              placePin({ lat: point.lat, lng: point.lng })
              return
            }
          }
        }
        
        // 方法3：创建临时点，使用地图中心点偏移计算（备用方案）
        const centerPoint = map.getCenter()
        const zoom = map.getZoom()
        const scale = Math.pow(2, 18 - zoom) // 缩放比例
        const centerPixel = map.pointToPixel(centerPoint)
        const offsetX = (pixelX - centerPixel.x) * scale
        const offsetY = (pixelY - centerPixel.y) * scale
        
        // 计算经纬度偏移（粗略计算）
        const latOffset = offsetY * 0.000001
        const lngOffset = offsetX * 0.000001 / Math.cos(centerPoint.lat * Math.PI / 180)
        
        const calculatedLat = centerPoint.lat - latOffset
        const calculatedLng = centerPoint.lng + lngOffset
        
        console.log('使用偏移计算坐标:', calculatedLat, calculatedLng)
        placePin({ lat: calculatedLat, lng: calculatedLng })
        
      } catch (error) {
        console.error('获取点击坐标失败:', error)
      }
    }

    // 监听图钉模式变化
    watch(() => props.pinMode, (newValue) => {
      updateMapInteraction()
      if (!newValue) {
        // 退出图钉模式时清除图钉
        clearPin()
      }
    })

    // 获取用户当前位置并在地图上显示
    const getUserLocation = () => {
      if (!map) return

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = parseFloat(position.coords.latitude.toFixed(6))
            const lng = parseFloat(position.coords.longitude.toFixed(6))
            userLocation = { lat, lng }

            // 移除旧的用户位置标记
            if (userLocationMarker) {
              map.removeOverlay(userLocationMarker)
            }

            // 添加用户位置标记
            const point = new BMapGL.Point(lng, lat)
            const icon = new BMapGL.Icon(
              createUserLocationIcon(),
              new BMapGL.Size(32, 32),
              { anchor: new BMapGL.Size(16, 16) }
            )
            userLocationMarker = new BMapGL.Marker(point, { icon })
            map.addOverlay(userLocationMarker)

            // 将地图中心移动到用户位置
            map.centerAndZoom(point, 15)

            // 添加信息窗口
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
            // 如果获取位置失败，使用默认中心点
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

    const updateMarkers = () => {
      if (!map) return

      // 清除现有标记
      markers.forEach(marker => map.removeOverlay(marker))
      markers = []

      // 按地点分组评论
      const locations = groupReviewsByLocation(props.reviews)

      // 为每个地点创建一个标记
      locations.forEach(location => {
        const point = new BMapGL.Point(location.longitude, location.latitude)
        
        // 计算该地点的平均评分
        const avgScore = calculateLocationAverageScore(location)
        const overallScore = parseFloat(avgScore.overall)

        let iconColor = '#ff0000' // 红色 - 不安全
        if (overallScore >= 4) {
          iconColor = '#00ff00' // 绿色 - 安全
        } else if (overallScore >= 3) {
          iconColor = '#ffaa00' // 橙色 - 一般
        }

        // 创建自定义图标（使用简单的圆形标记，如果有多条评论，标记稍大）
        const iconSize = location.reviews.length > 1 ? 28 : 24
        const icon = new BMapGL.Icon(
          createMarkerIcon(iconColor),
          new BMapGL.Size(iconSize, iconSize),
          { anchor: new BMapGL.Size(iconSize / 2, iconSize / 2) }
        )

        const marker = new BMapGL.Marker(point, { icon })
        
        // 聚合关键词
        const keywords = aggregateKeywords(location.reviews)
        const keywordTags = formatKeywords(keywords).slice(0, 5).join(' ') // 最多显示5个关键词
        
        // 地图信息窗口只显示平均分和关键标签
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

        // 标记点击事件：显示信息窗口并触发地点选择
        marker.addEventListener('click', () => {
          map.openInfoWindow(infoWindow, point)
          // 触发地点选择事件，传递完整的地点数据
          emit('location-select', location)
        })

        map.addOverlay(marker)
        markers.push(marker)
      })
    }

    onMounted(() => {
      initMap()
      // 延迟更新标记，确保地图已初始化
      setTimeout(() => {
        updateMarkers()
        // 获取并显示用户位置
        getUserLocation()
        // 初始化选中位置标记
        updateSelectedLocationMarker()
        // 初始化地图交互状态
        updateMapInteraction()
      }, 500)
    })

    watch(() => props.reviews, () => {
      updateMarkers()
    }, { deep: true })

    // 更新选中位置的红色指针
    const updateSelectedLocationMarker = () => {
      if (!map) return

      // 移除旧的选中位置标记
      if (selectedLocationMarker) {
        map.removeOverlay(selectedLocationMarker)
        selectedLocationMarker = null
      }

      // 如果center有变化且不是用户位置，添加红色指针
      if (props.center && props.center.lat && props.center.lng) {
        const point = new BMapGL.Point(props.center.lng, props.center.lat)
        
        // 检查是否是用户位置（避免重复标记）
        const isUserLocation = userLocation && 
          Math.abs(userLocation.lat - props.center.lat) < 0.0001 &&
          Math.abs(userLocation.lng - props.center.lng) < 0.0001

        if (!isUserLocation) {
          const icon = new BMapGL.Icon(
            createSelectedLocationIcon(),
            new BMapGL.Size(32, 48),
            { anchor: new BMapGL.Size(16, 48) }
          )
          selectedLocationMarker = new BMapGL.Marker(point, { icon })
          map.addOverlay(selectedLocationMarker)

          // 添加信息窗口
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

    watch(() => props.center, (newCenter) => {
      if (map && newCenter) {
        const point = new BMapGL.Point(newCenter.lng, newCenter.lat)
        map.panTo(point)
        // 更新选中位置标记
        setTimeout(() => {
          updateSelectedLocationMarker()
        }, 100)
      }
    })

    return {
      clearPin
    }
  }
}
</script>

<style scoped>
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

/* 图钉模式下禁用地图拖拽的视觉反馈 */
#map.pin-mode * {
  cursor: inherit !important;
}
</style>

