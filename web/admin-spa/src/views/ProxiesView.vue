<template>
  <div>
    <!-- 页面标题和操作栏 -->
    <div class="mb-4 flex items-center justify-between sm:mb-6">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">我的代理</h1>
        <p class="mt-1 text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
          管理和查看所有账户使用的代理配置
        </p>
      </div>
      <button
        class="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        :disabled="loading"
        @click="fetchProxies"
      >
        <i :class="['fas fa-sync-alt', { 'fa-spin': loading }]" />
        <span class="hidden sm:inline">{{ loading ? '加载中...' : '刷新' }}</span>
      </button>
    </div>

    <!-- 统计卡片 -->
    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-400 sm:text-sm">
              代理总数
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
              {{ proxies.length }}
            </p>
          </div>
          <div class="stat-icon flex-shrink-0 bg-gradient-to-br from-purple-500 to-purple-600">
            <i class="fas fa-server" />
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-400 sm:text-sm">
              绑定账号数
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
              {{ totalAccounts }}
            </p>
          </div>
          <div class="stat-icon flex-shrink-0 bg-gradient-to-br from-green-500 to-green-600">
            <i class="fas fa-users" />
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-400 sm:text-sm">
              代理类型
            </p>
            <div class="mt-1 flex items-center gap-2">
              <span
                v-if="proxyTypeStats.socks5 > 0"
                class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              >
                SOCKS5: {{ proxyTypeStats.socks5 }}
              </span>
              <span
                v-if="proxyTypeStats.http > 0"
                class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300"
              >
                HTTP: {{ proxyTypeStats.http }}
              </span>
              <span
                v-if="proxyTypeStats.https > 0"
                class="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300"
              >
                HTTPS: {{ proxyTypeStats.https }}
              </span>
            </div>
          </div>
          <div class="stat-icon flex-shrink-0 bg-gradient-to-br from-indigo-500 to-indigo-600">
            <i class="fas fa-network-wired" />
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && proxies.length === 0" class="py-12 text-center">
      <i class="fas fa-spinner fa-spin text-4xl text-gray-400 dark:text-gray-600" />
      <p class="mt-4 text-gray-600 dark:text-gray-400">加载代理列表...</p>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="!loading && proxies.length === 0"
      class="rounded-lg border-2 border-dashed border-gray-300 py-12 text-center dark:border-gray-700"
    >
      <i class="fas fa-server text-5xl text-gray-400 dark:text-gray-600" />
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">暂无代理配置</h3>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        在添加账户时配置代理后，将在这里显示
      </p>
    </div>

    <!-- 代理列表 -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="proxy in proxies"
        :key="proxy.proxyHash"
        class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 sm:p-5"
      >
        <!-- 代理头部 -->
        <div class="mb-3 flex items-start justify-between">
          <div class="flex-1">
            <!-- 代理类型标签 -->
            <span
              :class="[
                'inline-block rounded-full px-2.5 py-1 text-xs font-semibold uppercase',
                getProxyTypeClass(proxy.type)
              ]"
            >
              {{ proxy.type }}
            </span>

            <!-- 认证标签 -->
            <span
              v-if="proxy.hasAuth"
              class="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300"
            >
              <i class="fas fa-lock text-xs" />
              需要认证
            </span>
          </div>
        </div>

        <!-- 代理地址 -->
        <div class="mb-3">
          <div class="flex items-center gap-2">
            <i class="fas fa-globe text-gray-400 dark:text-gray-500" />
            <p class="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ proxy.host }}:{{ proxy.port }}
            </p>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="mb-4 space-y-2">
          <!-- 账号数量 -->
          <div class="flex items-center gap-2">
            <i class="fas fa-users text-blue-500" />
            <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {{ proxy.accountCount }} 个账号使用中
            </span>
          </div>

          <!-- 平台类型 -->
          <div class="flex flex-wrap items-center gap-1">
            <i class="fas fa-tag text-gray-400 dark:text-gray-500" />
            <span
              v-for="platformType in proxy.accountTypes"
              :key="platformType"
              :class="['rounded px-2 py-0.5 text-xs font-medium', getPlatformClass(platformType)]"
            >
              {{ getPlatformName(platformType) }}
            </span>
          </div>
        </div>

        <!-- 展开按钮 -->
        <button
          class="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          @click="toggleExpand(proxy.proxyHash)"
        >
          <i
            :class="[
              'fas mr-2 transition-transform',
              expandedProxies.has(proxy.proxyHash) ? 'fa-chevron-up' : 'fa-chevron-down'
            ]"
          />
          {{ expandedProxies.has(proxy.proxyHash) ? '收起' : '查看' }}绑定账号
        </button>

        <!-- 绑定账号列表（展开状态） -->
        <transition name="expand">
          <div
            v-if="expandedProxies.has(proxy.proxyHash)"
            class="mt-4 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700"
          >
            <div
              v-for="account in proxy.accounts"
              :key="account.id"
              class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700"
            >
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900 dark:text-gray-100">
                    {{ account.name }}
                  </span>
                  <span
                    :class="[
                      'text-xs font-medium',
                      account.isActive
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    ]"
                  >
                    <i :class="['fas', account.isActive ? 'fa-check-circle' : 'fa-times-circle']" />
                  </span>
                </div>
                <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {{ getPlatformName(account.platform) }}
                </p>
              </div>
              <button
                class="ml-2 rounded p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                title="跳转到账号"
                @click="goToAccount(account)"
              >
                <i class="fas fa-external-link-alt text-sm" />
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/config/api'

const router = useRouter()

// 状态
const loading = ref(false)
const proxies = ref([])
const totalAccounts = ref(0)
const expandedProxies = ref(new Set())

// 计算属性 - 代理类型统计
const proxyTypeStats = computed(() => {
  const stats = { socks5: 0, http: 0, https: 0 }
  proxies.value.forEach((proxy) => {
    if (proxy.type in stats) {
      stats[proxy.type]++
    }
  })
  return stats
})

// 获取代理列表
async function fetchProxies() {
  loading.value = true
  try {
    const response = await apiClient.get('/admin/proxies')
    if (response.success) {
      proxies.value = response.proxies || []
      totalAccounts.value = response.totalAccounts || 0
    }
  } catch (error) {
    console.error('Failed to fetch proxies:', error)
    // 可以添加toast提示
  } finally {
    loading.value = false
  }
}

// 切换展开状态
function toggleExpand(proxyHash) {
  if (expandedProxies.value.has(proxyHash)) {
    expandedProxies.value.delete(proxyHash)
  } else {
    expandedProxies.value.add(proxyHash)
  }
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

// 获取平台样式
function getPlatformClass(platform) {
  const classes = {
    claude: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    'claude-console': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    gemini: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    bedrock: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    'azure-openai': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
    droid: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
    ccr: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    'openai-responses': 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
  }
  return classes[platform] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

// 获取平台显示名称
function getPlatformName(platform) {
  const names = {
    claude: 'Claude',
    'claude-console': 'Claude Console',
    gemini: 'Gemini',
    bedrock: 'Bedrock',
    'azure-openai': 'Azure OpenAI',
    droid: 'Droid',
    ccr: 'CCR',
    'openai-responses': 'OpenAI Responses'
  }
  return names[platform] || platform
}

// 跳转到账号页面
function goToAccount(account) {
  router.push('/accounts')
}

// 组件挂载时加载数据
onMounted(() => {
  fetchProxies()
})
</script>

<style scoped>
/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 1000px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

/* 统计卡片样式 */
.stat-card {
  @apply rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5;
}

.stat-icon {
  @apply flex h-10 w-10 items-center justify-center rounded-lg text-white sm:h-12 sm:w-12;
}

.stat-icon i {
  @apply text-lg sm:text-xl;
}
</style>
