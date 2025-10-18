<template>
  <div class="content-safety-manager space-y-8">
    <!-- 敏感词管理部分 -->
    <section class="rounded-lg bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            <i class="fas fa-shield-alt mr-2 text-red-500"></i>
            敏感词管理
          </h4>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            管理系统的敏感词库，自动过滤包含敏感内容的请求
          </p>
        </div>
        <div class="flex gap-2">
          <button @click="showAddModal = true" class="btn btn-primary">
            <i class="fas fa-plus mr-2"></i>添加敏感词
          </button>
          <button @click="showImportModal = true" class="btn btn-secondary">
            <i class="fas fa-file-import mr-2"></i>批量导入
          </button>
        </div>
      </div>

      <!-- 统计信息 -->
      <div v-if="stats" class="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <div class="text-sm text-gray-600 dark:text-gray-400">总数</div>
          <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ stats.total }}</div>
        </div>
        <div class="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
          <div class="text-sm text-gray-600 dark:text-gray-400">启用</div>
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">
            {{ stats.enabled }}
          </div>
        </div>
        <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/20">
          <div class="text-sm text-gray-600 dark:text-gray-400">禁用</div>
          <div class="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {{ stats.disabled }}
          </div>
        </div>
        <div class="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
          <div class="text-sm text-gray-600 dark:text-gray-400">NSFW</div>
          <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {{ stats.byCategory?.nsfw || 0 }}
          </div>
        </div>
      </div>

      <!-- 敏感词表格 -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                敏感词
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                分类
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                匹配方式
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                状态
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                创建时间
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            <tr v-if="loadingWords" class="text-center">
              <td colspan="6" class="px-4 py-8">
                <div class="loading-spinner mx-auto mb-2"></div>
                <p class="text-gray-500 dark:text-gray-400">加载中...</p>
              </td>
            </tr>
            <tr v-else-if="sensitiveWords.length === 0" class="text-center">
              <td colspan="6" class="px-4 py-8 text-gray-500 dark:text-gray-400">
                <i class="fas fa-inbox mb-2 text-4xl"></i>
                <p>暂无敏感词，点击"添加敏感词"开始配置</p>
              </td>
            </tr>
            <tr
              v-for="word in sensitiveWords"
              :key="word.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <td class="px-4 py-3">
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ word.word }}</span>
              </td>
              <td class="px-4 py-3">
                <span
                  :class="getCategoryClass(word.category)"
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                >
                  {{ getCategoryLabel(word.category) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {{ getMatchTypeLabel(word.matchType) }}
              </td>
              <td class="px-4 py-3">
                <span
                  :class="
                    word.enabled
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  "
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                >
                  {{ word.enabled ? '启用' : '禁用' }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                {{ formatDate(word.createdAt) }}
              </td>
              <td class="px-4 py-3 text-right text-sm font-medium">
                <button
                  @click="editWord(word)"
                  class="mr-3 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <i class="fas fa-edit"></i> 编辑
                </button>
                <button
                  @click="deleteWord(word)"
                  class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  <i class="fas fa-trash"></i> 删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 违规日志部分 -->
    <section class="rounded-lg bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:bg-gray-800/80">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            <i class="fas fa-exclamation-triangle mr-2 text-orange-500"></i>
            违规日志
          </h4>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            查看被敏感词过滤拦截的请求记录
          </p>
        </div>
        <div class="flex gap-2">
          <select
            v-model="filterApiKeyId"
            @change="loadViolationLogs"
            class="form-select rounded-lg border-gray-300 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            <option value="">所有 API Key</option>
            <option v-for="key in apiKeys" :key="key.id" :value="key.id">
              {{ key.name }}
            </option>
          </select>
          <button @click="loadViolationLogs" class="btn btn-secondary">
            <i class="fas fa-sync-alt mr-2"></i>刷新
          </button>
        </div>
      </div>

      <!-- 违规日志表格 -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                时间
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                API Key
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                命中敏感词
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                内容片段
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                IP地址
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            <tr v-if="loadingLogs" class="text-center">
              <td colspan="6" class="px-4 py-8">
                <div class="loading-spinner mx-auto mb-2"></div>
                <p class="text-gray-500 dark:text-gray-400">加载中...</p>
              </td>
            </tr>
            <tr v-else-if="violationLogs.length === 0" class="text-center">
              <td colspan="6" class="px-4 py-8 text-gray-500 dark:text-gray-400">
                <i class="fas fa-check-circle mb-2 text-4xl text-green-500"></i>
                <p>暂无违规记录</p>
              </td>
            </tr>
            <tr
              v-for="log in violationLogs"
              :key="log.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {{ formatDateTime(log.timestamp) }}
              </td>
              <td class="px-4 py-3">
                <span class="font-medium text-gray-900 dark:text-gray-100">{{
                  log.apiKeyName
                }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="(match, idx) in log.matchedWords.slice(0, 3)"
                    :key="idx"
                    class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  >
                    {{ match.word }}
                  </span>
                  <span
                    v-if="log.matchedWords.length > 3"
                    class="text-xs text-gray-500 dark:text-gray-400"
                  >
                    +{{ log.matchedWords.length - 3 }}
                  </span>
                </div>
              </td>
              <td class="max-w-xs truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {{ log.contentSample }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {{ log.clientIp }}
              </td>
              <td class="px-4 py-3 text-right text-sm font-medium">
                <button
                  @click="showLogDetail(log)"
                  class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <i class="fas fa-info-circle"></i> 详情
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="logPagination.total > 0" class="mt-4 flex items-center justify-between">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          共 {{ logPagination.total }} 条记录，第 {{ logPagination.page }} /
          {{ logPagination.pages }} 页
        </div>
        <div class="flex gap-2">
          <button
            @click="changePage(logPagination.page - 1)"
            :disabled="logPagination.page <= 1"
            class="btn btn-secondary"
            :class="{ 'cursor-not-allowed opacity-50': logPagination.page <= 1 }"
          >
            <i class="fas fa-chevron-left"></i> 上一页
          </button>
          <button
            @click="changePage(logPagination.page + 1)"
            :disabled="logPagination.page >= logPagination.pages"
            class="btn btn-secondary"
            :class="{ 'cursor-not-allowed opacity-50': logPagination.page >= logPagination.pages }"
          >
            下一页 <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </section>

    <!-- 敏感词编辑弹窗 -->
    <SensitiveWordModal
      v-if="showAddModal || editingWord"
      :word="editingWord"
      @close="closeWordModal"
      @submit="handleWordSubmit"
    />

    <!-- 违规日志详情弹窗 -->
    <ViolationDetailModal v-if="selectedLog" :log="selectedLog" @close="selectedLog = null" />

    <!-- 批量导入弹窗（简化版） -->
    <div
      v-if="showImportModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showImportModal = false"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
        <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">批量导入敏感词</h3>
        <textarea
          v-model="importText"
          rows="10"
          placeholder="每行一个敏感词"
          class="form-input w-full dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        ></textarea>
        <div class="mt-4 flex justify-end gap-2">
          <button @click="showImportModal = false" class="btn btn-secondary">取消</button>
          <button @click="handleBatchImport" class="btn btn-primary">导入</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiClient } from '@/config/api'
import { showToast } from '@/utils/toast'
import SensitiveWordModal from './SensitiveWordModal.vue'
import ViolationDetailModal from './ViolationDetailModal.vue'

// 敏感词相关状态
const sensitiveWords = ref([])
const loadingWords = ref(false)
const showAddModal = ref(false)
const editingWord = ref(null)
const stats = ref(null)
const showImportModal = ref(false)
const importText = ref('')

// 违规日志相关状态
const violationLogs = ref([])
const loadingLogs = ref(false)
const selectedLog = ref(null)
const filterApiKeyId = ref('')
const apiKeys = ref([])
const logPagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0
})

// 加载敏感词
async function loadSensitiveWords() {
  loadingWords.value = true
  try {
    const response = await apiClient.get('/admin/content-security/sensitive-words')
    sensitiveWords.value = response.data.data

    // 加载统计信息
    const statsResponse = await apiClient.get('/admin/content-security/sensitive-words-stats')
    stats.value = statsResponse.data.data
  } catch (error) {
    showToast('加载敏感词失败：' + (error.response?.data?.message || error.message), 'error')
  } finally {
    loadingWords.value = false
  }
}

// 加载违规日志
async function loadViolationLogs(page = 1) {
  loadingLogs.value = true
  try {
    const params = {
      page,
      limit: logPagination.value.limit
    }
    if (filterApiKeyId.value) {
      params.apiKeyId = filterApiKeyId.value
    }

    const response = await apiClient.get('/admin/content-security/violation-logs', { params })
    violationLogs.value = response.data.data
    logPagination.value = response.data.pagination
  } catch (error) {
    showToast('加载违规日志失败：' + (error.response?.data?.message || error.message), 'error')
  } finally {
    loadingLogs.value = false
  }
}

// 加载API Keys列表
async function loadApiKeys() {
  try {
    const response = await apiClient.get('/admin/api-keys')
    apiKeys.value = response.data.data || []
  } catch (error) {
    console.error('Failed to load API keys:', error)
  }
}

// 编辑敏感词
function editWord(word) {
  editingWord.value = word
}

// 删除敏感词
async function deleteWord(word) {
  if (!confirm(`确定要删除敏感词"${word.word}"吗？`)) {
    return
  }

  try {
    await apiClient.delete(`/admin/content-security/sensitive-words/${word.id}`)
    showToast('删除成功', 'success')
    await loadSensitiveWords()
  } catch (error) {
    showToast('删除失败：' + (error.response?.data?.message || error.message), 'error')
  }
}

// 关闭敏感词弹窗
function closeWordModal() {
  showAddModal.value = false
  editingWord.value = null
}

// 提交敏感词
async function handleWordSubmit(wordData) {
  try {
    if (editingWord.value) {
      await apiClient.put(
        `/admin/content-security/sensitive-words/${editingWord.value.id}`,
        wordData
      )
      showToast('更新成功', 'success')
    } else {
      await apiClient.post('/admin/content-security/sensitive-words', wordData)
      showToast('创建成功', 'success')
    }

    closeWordModal()
    await loadSensitiveWords()
  } catch (error) {
    showToast('操作失败：' + (error.response?.data?.message || error.message), 'error')
  }
}

// 批量导入
async function handleBatchImport() {
  const lines = importText.value.split('\n').filter((line) => line.trim())
  if (lines.length === 0) {
    showToast('请输入敏感词', 'error')
    return
  }

  const words = lines.map((line) => ({
    word: line.trim(),
    category: 'nsfw',
    matchType: 'exact',
    enabled: true
  }))

  try {
    const response = await apiClient.post('/admin/content-security/sensitive-words/batch-import', {
      words
    })
    showToast(
      `导入成功 ${response.data.data.success} 个，失败 ${response.data.data.failed} 个`,
      'success'
    )
    showImportModal.value = false
    importText.value = ''
    await loadSensitiveWords()
  } catch (error) {
    showToast('批量导入失败：' + (error.response?.data?.message || error.message), 'error')
  }
}

// 显示违规日志详情
function showLogDetail(log) {
  selectedLog.value = log
}

// 切换页码
function changePage(page) {
  if (page >= 1 && page <= logPagination.value.pages) {
    loadViolationLogs(page)
  }
}

// 工具函数
function getCategoryLabel(category) {
  const labels = {
    nsfw: 'NSFW/色情',
    violence: '暴力',
    politics: '政治',
    other: '其他'
  }
  return labels[category] || category
}

function getCategoryClass(category) {
  const classes = {
    nsfw: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    violence: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    politics: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
  }
  return classes[category] || classes.other
}

function getMatchTypeLabel(matchType) {
  const labels = {
    exact: '精确匹配',
    fuzzy: '模糊匹配',
    regex: '正则表达式'
  }
  return labels[matchType] || matchType
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 初始化
onMounted(async () => {
  await Promise.all([loadSensitiveWords(), loadViolationLogs(), loadApiKeys()])
})
</script>

<style scoped>
.form-input {
  @apply w-full rounded-lg border border-gray-300 px-4 py-2 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200;
}

.btn {
  @apply inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500;
}

.btn-secondary {
  @apply bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600;
}

.loading-spinner {
  @apply h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600;
}
</style>
