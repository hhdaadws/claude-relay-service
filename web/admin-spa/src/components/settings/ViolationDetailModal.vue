<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="$emit('close')">
    <div class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          <i class="fas fa-exclamation-triangle mr-2 text-orange-500"></i>
          违规日志详情
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>

      <div class="space-y-4">
        <!-- 时间 -->
        <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
          <div class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            时间
          </div>
          <div class="text-sm text-gray-900 dark:text-gray-100">
            {{ formatDateTime(log.timestamp) }}
          </div>
        </div>

        <!-- API Key信息 -->
        <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
          <div class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            API Key
          </div>
          <div class="text-sm text-gray-900 dark:text-gray-100">
            {{ log.apiKeyName }}
          </div>
          <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            ID: {{ log.apiKeyId }}
          </div>
        </div>

        <!-- 客户端信息 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
            <div class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              IP地址
            </div>
            <div class="text-sm text-gray-900 dark:text-gray-100">
              {{ log.clientIp }}
            </div>
          </div>
          <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
            <div class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              请求路径
            </div>
            <div class="text-sm text-gray-900 dark:text-gray-100">
              {{ log.requestPath }}
            </div>
          </div>
        </div>

        <!-- User-Agent -->
        <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
          <div class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            User-Agent
          </div>
          <div class="break-all text-xs text-gray-700 dark:text-gray-300">
            {{ log.userAgent }}
          </div>
        </div>

        <!-- 命中的敏感词 -->
        <div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <div class="mb-2 text-xs font-medium uppercase tracking-wide text-red-700 dark:text-red-400">
            命中的敏感词
          </div>
          <div class="flex flex-wrap gap-2">
            <div v-for="(match, index) in log.matchedWords" :key="index" class="rounded-lg bg-red-100 px-3 py-2 dark:bg-red-900/40">
              <div class="font-medium text-red-900 dark:text-red-200">{{ match.word }}</div>
              <div class="mt-1 text-xs text-red-700 dark:text-red-400">
                分类: {{ getCategoryLabel(match.category) }}
                <span v-if="match.position >= 0" class="ml-2">位置: {{ match.position }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 内容片段 -->
        <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
          <div class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            内容片段
          </div>
          <div class="whitespace-pre-wrap rounded bg-white p-3 text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            {{ log.contentSample }}
          </div>
          <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            仅显示前 200 个字符
          </div>
        </div>

        <!-- 其他详情 -->
        <div v-if="log.details" class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
          <div class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            其他信息
          </div>
          <div class="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <div v-if="log.details.method">
              <span class="text-gray-500 dark:text-gray-400">请求方法:</span>
              {{ log.details.method }}
            </div>
            <div v-if="log.details.model">
              <span class="text-gray-500 dark:text-gray-400">模型:</span>
              {{ log.details.model }}
            </div>
            <div v-if="log.details.messageCount !== undefined">
              <span class="text-gray-500 dark:text-gray-400">消息数量:</span>
              {{ log.details.messageCount }}
            </div>
            <div v-if="log.requestId">
              <span class="text-gray-500 dark:text-gray-400">请求ID:</span>
              <code class="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">{{ log.requestId }}</code>
            </div>
          </div>
        </div>
      </div>

      <!-- 关闭按钮 -->
      <div class="mt-6 flex justify-end">
        <button @click="$emit('close')" class="btn btn-primary">
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  log: {
    type: Object,
    required: true
  }
})

defineEmits(['close'])

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function getCategoryLabel(category) {
  const labels = {
    nsfw: 'NSFW/色情',
    violence: '暴力',
    politics: '政治',
    other: '其他'
  }
  return labels[category] || category
}
</script>

<style scoped>
.btn {
  @apply inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500;
}
</style>
