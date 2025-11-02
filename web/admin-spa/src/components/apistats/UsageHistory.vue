<template>
  <div class="usage-history">
    <h3 class="mb-4 flex items-center text-lg font-semibold text-gray-800 dark:text-gray-200 md:mb-6 md:text-xl">
      <i class="fas fa-history mr-2 text-orange-500 md:mr-3" />
      使用历史记录（最近7天）
      <span
        class="ml-2 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/30 dark:text-blue-400 md:ml-3 md:px-3 md:py-1"
      >
        BETA
      </span>
    </h3>

    <!-- Beta 提示 -->
    <div
      class="mb-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 backdrop-blur-sm dark:border-blue-500/20 dark:bg-blue-500/5 md:mb-6 md:p-4"
    >
      <div class="flex items-start gap-2">
        <i class="fas fa-info-circle mt-0.5 text-blue-500 dark:text-blue-400" />
        <div class="flex-1 text-xs text-blue-700 dark:text-blue-300 md:text-sm">
          <strong>Beta 测试状态：</strong>
          该功能正在测试中，数据可能存在偏差。实际用量请以总用量数据为准。
        </div>
      </div>
    </div>

    <!-- 加载中状态 -->
    <div
      v-if="loading"
      class="flex items-center justify-center rounded-xl bg-white/50 p-8 backdrop-blur-sm dark:bg-gray-800/50"
    >
      <i class="fas fa-spinner fa-spin mr-2 text-blue-500" />
      <span class="text-sm text-gray-600 dark:text-gray-400">加载历史数据中...</span>
    </div>

    <!-- 错误状态 -->
    <div
      v-else-if="error"
      class="rounded-xl border border-red-500/30 bg-red-500/20 p-4 backdrop-blur-sm dark:border-red-500/20 dark:bg-red-500/10"
    >
      <div class="flex items-center">
        <i class="fas fa-exclamation-circle mr-2 text-red-500" />
        <span class="text-sm text-red-700 dark:text-red-300">{{ error }}</span>
      </div>
    </div>

    <!-- 历史数据展示 -->
    <div v-else-if="historyData" class="space-y-4 md:space-y-6">
      <!-- 7天以前汇总 -->
      <div
        v-if="historyData.before7Days && historyData.before7Days.requests > 0"
        class="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-4 backdrop-blur-sm dark:border-gray-600 dark:from-gray-700/50 dark:to-gray-600/50 md:p-5"
      >
        <div class="mb-3 flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
          <span class="font-medium text-gray-700 dark:text-gray-300">
            <i class="fas fa-clock mr-1 text-gray-500" />
            7天以前（汇总）
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            总活跃天数: {{ historyData.summary.totalDaysUsed || '未知' }} 天
          </span>
        </div>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="mb-1 text-xs text-gray-600 dark:text-gray-400">请求数</div>
            <div class="text-lg font-semibold text-gray-900 dark:text-gray-100 md:text-xl">
              {{ formatNumber(historyData.before7Days.requests) }}
            </div>
          </div>
          <div>
            <div class="mb-1 text-xs text-gray-600 dark:text-gray-400">Token</div>
            <div class="text-lg font-semibold text-gray-900 dark:text-gray-100 md:text-xl">
              {{ formatTokenCount(historyData.before7Days.tokens) }}
            </div>
          </div>
          <div>
            <div class="mb-1 text-xs text-gray-600 dark:text-gray-400">费用</div>
            <div class="text-lg font-semibold text-orange-600 dark:text-orange-400 md:text-xl">
              {{ historyData.before7Days.formattedCost }}
            </div>
          </div>
        </div>
      </div>

      <!-- 最近7天详细数据表格 -->
      <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table class="w-full text-sm">
          <thead class="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th
                class="px-3 py-3 text-left font-medium text-gray-700 dark:text-gray-300 md:px-4 md:py-3"
              >
                日期
              </th>
              <th
                class="px-3 py-3 text-right font-medium text-gray-700 dark:text-gray-300 md:px-4 md:py-3"
              >
                请求数
              </th>
              <th
                class="px-3 py-3 text-right font-medium text-gray-700 dark:text-gray-300 md:px-4 md:py-3"
              >
                Token
              </th>
              <th
                class="px-3 py-3 text-right font-medium text-gray-700 dark:text-gray-300 md:px-4 md:py-3"
              >
                费用
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="day in historyData.detailedHistory"
              :key="day.date"
              class="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
              :class="{
                'bg-blue-50 dark:bg-blue-900/10': day.requests > 0
              }"
            >
              <td class="px-3 py-3 text-gray-900 dark:text-gray-100 md:px-4 md:py-3">
                <div class="flex items-center">
                  <i
                    v-if="day.requests > 0"
                    class="fas fa-circle mr-2 text-xs text-green-500"
                  />
                  <span class="font-medium">{{ day.label }}</span>
                </div>
              </td>
              <td class="px-3 py-3 text-right text-gray-900 dark:text-gray-100 md:px-4 md:py-3">
                {{ formatNumber(day.requests) }}
              </td>
              <td class="px-3 py-3 text-right text-gray-900 dark:text-gray-100 md:px-4 md:py-3">
                {{ formatTokenCount(day.tokens) }}
              </td>
              <td
                class="px-3 py-3 text-right font-medium text-orange-600 dark:text-orange-400 md:px-4 md:py-3"
              >
                {{ day.formattedCost }}
              </td>
            </tr>
          </tbody>
          <tfoot class="border-t-2 border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700">
            <tr>
              <td
                class="px-3 py-3 font-semibold text-gray-700 dark:text-gray-300 md:px-4 md:py-3"
              >
                最近7天合计
              </td>
              <td
                class="px-3 py-3 text-right font-semibold text-gray-900 dark:text-gray-100 md:px-4 md:py-3"
              >
                {{ formatNumber(historyData.summary.last7Days.totalRequests) }}
              </td>
              <td
                class="px-3 py-3 text-right font-semibold text-gray-900 dark:text-gray-100 md:px-4 md:py-3"
              >
                {{ formatTokenCount(historyData.summary.last7Days.totalTokens) }}
              </td>
              <td
                class="px-3 py-3 text-right font-semibold text-orange-600 dark:text-orange-400 md:px-4 md:py-3"
              >
                {{ historyData.summary.last7Days.formattedCost }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- 统计摘要 -->
      <div v-if="historyData.summary" class="grid grid-cols-2 gap-4 md:gap-6">
        <div
          class="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4 dark:border-blue-700 dark:from-blue-900/20 dark:to-blue-800/20 md:p-5"
        >
          <div class="mb-2 text-sm text-gray-600 dark:text-gray-400">日均请求数</div>
          <div class="text-2xl font-bold text-blue-600 dark:text-blue-400 md:text-3xl">
            {{ formatNumber(Math.round(historyData.summary.averages.dailyRequests)) }}
          </div>
        </div>
        <div
          class="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-4 dark:border-orange-700 dark:from-orange-900/20 dark:to-orange-800/20 md:p-5"
        >
          <div class="mb-2 text-sm text-gray-600 dark:text-gray-400">日均费用</div>
          <div class="text-2xl font-bold text-orange-600 dark:text-orange-400 md:text-3xl">
            {{ historyData.summary.averages.formattedDailyCost }}
          </div>
        </div>
      </div>
    </div>

    <!-- 无数据状态 -->
    <div
      v-else
      class="flex items-center justify-center rounded-xl bg-white/50 p-8 backdrop-blur-sm dark:bg-gray-800/50"
    >
      <span class="text-sm text-gray-500 dark:text-gray-400">暂无历史数据</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { apiClient } from '@/config/api'

const props = defineProps({
  apiKeyId: {
    type: String,
    required: true
  },
  apiKeyValue: {
    type: String,
    required: true
  }
})

const historyData = ref(null)
const loading = ref(false)
const error = ref(null)

// 格式化数字
const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return num.toLocaleString('zh-CN')
}

// 格式化Token数量（使用K/M单位）
const formatTokenCount = (count) => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M'
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K'
  }
  return count.toString()
}

// 加载历史数据
const loadUsageHistory = async () => {
  if (!props.apiKeyValue) return

  loading.value = true
  error.value = null

  try {
    // 使用公开的 API 端点，通过 x-api-key 认证
    const response = await fetch('/api/v1/usage/history', {
      headers: {
        'x-api-key': props.apiKeyValue,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    if (response.ok && data.success) {
      historyData.value = data.data
    } else {
      error.value = data.error || '加载历史数据失败'
    }
  } catch (err) {
    console.error('Failed to load usage history:', err)
    error.value = err.message || '加载历史数据失败'
  } finally {
    loading.value = false
  }
}

// 监听 apiKeyValue 变化
watch(
  () => props.apiKeyValue,
  (newKey) => {
    if (newKey) {
      loadUsageHistory()
    } else {
      historyData.value = null
      error.value = null
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.usage-history {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
