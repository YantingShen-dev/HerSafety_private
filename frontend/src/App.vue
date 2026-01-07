<template>
  <div id="app">
    <!-- 首页 -->
    <HomePage
      v-if="currentPage === 'home'"
      :key="`home-${pageKey}`"
      :is-connected="isConnected"
      :account="account"
      :token-balance="tokenBalance"
      :token-symbol="tokenSymbol"
      @navigate="handleNavigate"
      @wallet-connected="handleWalletConnected"
    />
    
    <!-- 结果查看页面 -->
    <ResultsPage
      v-else-if="currentPage === 'results'"
      :key="`results-${pageKey}`"
      :selected-region="selectedRegion"
      :is-connected="isConnected"
      :account="account"
      @navigate="handleNavigate"
    />
    
    <!-- 地图页面 -->
    <MapPage
      v-else
      :key="`map-${pageKey}`"
      :is-connected="isConnected"
      :account="account"
      :token-balance="tokenBalance"
      :token-symbol="tokenSymbol"
      :selected-region="selectedRegion"
      @navigate="handleNavigate"
      @wallet-connected="handleWalletConnected"
    />
  </div>
</template>

<script>
import { ref } from 'vue'
import HomePage from './components/HomePage.vue'
import MapPage from './components/MapPage.vue'
import ResultsPage from './components/ResultsPage.vue'

export default {
  name: 'App',
  components: {
    HomePage,
    MapPage,
    ResultsPage
  },
  setup() {
    const currentPage = ref('home') // 默认显示首页
    const pageKey = ref(0) // 用于强制重新渲染的 key
    const isConnected = ref(false)
    const account = ref(null)
    const tokenBalance = ref(null)
    const tokenSymbol = ref('SAFE')
    const selectedRegion = ref(null) // 选中的地区

    const handleNavigate = (page, data) => {
      console.log('导航到页面:', page, data)
      console.log('当前页面:', currentPage.value)
      
      if (page === 'submit') {
        // 提交跳转到地图页面
        currentPage.value = 'map'
        selectedRegion.value = data?.region || null // 保存选中的城市信息
        pageKey.value++
      } else if (page === 'results') {
        // 结果查看跳转到结果页面
        currentPage.value = 'results'
        selectedRegion.value = data?.region || null
        pageKey.value++
      } else if (page === 'home') {
        // 返回首页
        currentPage.value = 'home'
        selectedRegion.value = null
        pageKey.value++
      } else {
        currentPage.value = page || 'home'
        pageKey.value++
      }
      console.log('更新后的页面:', currentPage.value)
      console.log('页面 key:', pageKey.value)
    }

    const handleWalletConnected = (walletInfo) => {
      isConnected.value = walletInfo.address !== null
      account.value = walletInfo.address
      tokenBalance.value = walletInfo.tokenBalance
      tokenSymbol.value = walletInfo.tokenSymbol || 'SAFE'
    }

    return {
      currentPage,
      pageKey,
      isConnected,
      account,
      tokenBalance,
      tokenSymbol,
      selectedRegion,
      handleNavigate,
      handleWalletConnected
    }
  }
}
</script>

<style>
/* 样式在 style.css 中 */
</style>

