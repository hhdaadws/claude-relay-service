<template>
  <div class="space-y-3">
    <!-- 标题 -->
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300"> 选择已有代理 </label>

    <!-- 加载状态 -->
    <div v-if="loading" class="py-4 text-center">
      <i class="fas fa-spinner fa-spin text-gray-400 dark:text-gray-600" />
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">加载代理列表...</p>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="availableProxies.length === 0"
      class="rounded-lg border border-gray-300 bg-gray-50 p-4 text-center dark:border-gray-600 dark:bg-gray-700"
    >
      <i class="fas fa-info-circle text-2xl text-gray-400 dark:text-gray-600" />
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">暂无可用代理</p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-500">
        您可以手动配置新代理或从其他账号添加代理后再选择
      </p>
    </div>

    <!-- 代理选择列表 -->
    <div v-else class="space-y-2">
      <!-- 搜索框 -->
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索代理地址..."
          class="form-input w-full border-gray-300 pr-10 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
        />
        <i
          v-if="searchQuery"
          class="fas fa-times absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
          @click="searchQuery = ''"
        />
      </div>

      <!-- 代理卡片列表 -->
      <div class="max-h-96 space-y-2 overflow-y-auto">
        <div
          v-for="proxy in filteredProxies"
          :key="proxy.proxyHash"
          :class="[
            'cursor-pointer rounded-lg border-2 p-3 transition-all',
            selectedProxyHash === proxy.proxyHash
              ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
              : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
          ]"
          @click="selectProxy(proxy)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <!-- 代理类型和地址 -->
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase',
                    getProxyTypeClass(proxy.type)
                  ]"
                >
                  {{ proxy.type }}
                </span>
                <span class="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ proxy.host }}:{{ proxy.port }}
                </span>
              </div>

              <!-- 统计信息 -->
              <div
                class="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400"
              >
                <!-- 账号数量 -->
                <span class="flex items-center gap-1">
                  <i class="fas fa-users" />
                  {{ proxy.accountCount }} 个账号
                </span>

                <!-- 认证标识 -->
                <span v-if="proxy.hasAuth" class="flex items-center gap-1">
                  <i class="fas fa-lock" />
                  需要认证
                  <span v-if="proxy.username" class="ml-1 font-mono text-xs">
                    ({{ proxy.username }})
                  </span>
                </span>

                <!-- 平台类型 -->
                <span class="flex items-center gap-1">
                  <i class="fas fa-tag" />
                  {{ proxy.accountTypes.join(', ') }}
                </span>
              </div>
            </div>

            <!-- 选中图标 -->
            <div
              v-if="selectedProxyHash === proxy.proxyHash"
              class="ml-2 flex-shrink-0 text-blue-600 dark:text-blue-400"
            >
              <i class="fas fa-check-circle text-lg" />
            </div>
          </div>
        </div>
      </div>

      <!-- 未找到结果 -->
      <div
        v-if="filteredProxies.length === 0 && searchQuery"
        class="py-4 text-center text-sm text-gray-600 dark:text-gray-400"
      >
        未找到匹配的代理
      </div>

      <!-- 选中提示 -->
      <div
        v-if="selectedProxy"
        class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/30"
      >
        <p class="text-xs text-blue-700 dark:text-blue-300">
          <i class="fas fa-info-circle mr-1" />
          已选择:
          <span class="font-medium"
            >{{ selectedProxy.type }}://{{ selectedProxy.host }}:{{ selectedProxy.port }}</span
          >
          ({{ selectedProxy.accountCount }} 个账号正在使用)
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { apiClient } from '@/config/api'

const props = defineProps({
  modelValue: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'proxy-selected'])

// 状态
const loading = ref(false)
const availableProxies = ref([])
const selectedProxyHash = ref(props.modelValue)
const searchQuery = ref('')

// 选中的代理对象
const selectedProxy = computed(() => {
  return availableProxies.value.find((p) => p.proxyHash === selectedProxyHash.value) || null
})

// 过滤后的代理列表
const filteredProxies = computed(() => {
  if (!searchQuery.value) {
    return availableProxies.value
  }
  const query = searchQuery.value.toLowerCase()
  return availableProxies.value.filter((proxy) => {
    const address = `${proxy.host}:${proxy.port}`.toLowerCase()
    return address.includes(query) || proxy.type.toLowerCase().includes(query)
  })
})

// 监听外部值变化
watch(
  () => props.modelValue,
  (newVal) => {
    selectedProxyHash.value = newVal
  }
)

// 获取代理列表
async function fetchProxies() {
  loading.value = true
  try {
    const response = await apiClient.get('/admin/proxies')
    if (response.success) {
      availableProxies.value = response.proxies || []
    }
  } catch (error) {
    console.error('Failed to fetch proxies:', error)
  } finally {
    loading.value = false
  }
}

// 选择代理
function selectProxy(proxy) {
  selectedProxyHash.value = proxy.proxyHash
  emit('update:modelValue', proxy.proxyHash)

  // 发送完整的代理配置给父组件（包括密码）
  const proxyConfig = {
    enabled: true,
    type: proxy.type,
    host: proxy.host,
    port: proxy.port,
    username: proxy.username || '',
    password: proxy.password || '' // 返回完整配置，方便管理员复用
  }
  emit('proxy-selected', proxyConfig)
}

// 获取代理类型样式
function getProxyTypeClass(type) {
  const classes = {
    socks5: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    http: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    https: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
  }
  return classes[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

// 组件挂载时加载数据
onMounted(() => {
  fetchProxies()
})
</script>

<style scoped>
/* 自定义滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-800;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  @apply rounded-full bg-gray-300 dark:bg-gray-600;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400 dark:bg-gray-500;
}
</style>
