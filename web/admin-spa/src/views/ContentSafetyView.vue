<template>
  <div class="content-safety-container">
    <div class="card p-6">
      <!-- 页面标题 -->
      <div class="mb-6">
        <h3 class="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
          <i class="fas fa-shield-alt mr-2 text-blue-500"></i>
          内容安全管理
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">敏感词管理和内容审核日志</p>
      </div>

      <!-- 统计卡片 -->
      <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <!-- 敏感词总数 -->
        <div class="stat-card">
          <div class="stat-icon bg-blue-100 dark:bg-blue-900/30">
            <i class="fas fa-list text-blue-600 dark:text-blue-400"></i>
          </div>
          <div class="stat-content">
            <div class="stat-label">敏感词总数</div>
            <div class="stat-value">{{ stats.totalWords || 0 }}</div>
          </div>
        </div>

        <!-- 今日拦截 -->
        <div class="stat-card">
          <div class="stat-icon bg-red-100 dark:bg-red-900/30">
            <i class="fas fa-ban text-red-600 dark:text-red-400"></i>
          </div>
          <div class="stat-content">
            <div class="stat-label">今日拦截</div>
            <div class="stat-value">{{ stats.todayViolations || 0 }}</div>
          </div>
        </div>

        <!-- 本周拦截 -->
        <div class="stat-card">
          <div class="stat-icon bg-yellow-100 dark:bg-yellow-900/30">
            <i class="fas fa-chart-line text-yellow-600 dark:text-yellow-400"></i>
          </div>
          <div class="stat-content">
            <div class="stat-label">本周拦截</div>
            <div class="stat-value">{{ stats.weekViolations || 0 }}</div>
          </div>
        </div>
      </div>

      <!-- 标签栏 -->
      <div class="mb-6">
        <nav class="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
          <button
            :class="[
              'border-b-2 px-4 pb-2 text-sm font-medium transition-colors',
              activeTab === 'words'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            ]"
            @click="activeTab = 'words'"
          >
            <i class="fas fa-list mr-2"></i>
            敏感词管理
          </button>
          <button
            :class="[
              'border-b-2 px-4 pb-2 text-sm font-medium transition-colors',
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            ]"
            @click="activeTab = 'logs'"
          >
            <i class="fas fa-file-alt mr-2"></i>
            违规日志
          </button>
        </nav>
      </div>

      <!-- 敏感词管理标签页 -->
      <div v-show="activeTab === 'words'">
        <!-- 操作按钮栏 -->
        <div class="mb-4 flex flex-wrap gap-2">
          <button class="btn btn-primary" @click="showWordModal = true">
            <i class="fas fa-plus mr-2"></i>
            添加敏感词
          </button>
          <button class="btn btn-secondary" @click="showImportModal = true">
            <i class="fas fa-file-import mr-2"></i>
            批量导入
          </button>
          <button class="btn btn-secondary" @click="exportWords">
            <i class="fas fa-file-export mr-2"></i>
            批量导出
          </button>
          <button class="btn btn-secondary" @click="refreshWordsCache">
            <i class="fas fa-sync-alt mr-2"></i>
            刷新缓存
          </button>
          <button v-if="selectedWords.length > 0" class="btn btn-danger" @click="batchDeleteWords">
            <i class="fas fa-trash mr-2"></i>
            删除选中 ({{ selectedWords.length }})
          </button>
        </div>

        <!-- 敏感词列表 -->
        <div v-if="loading" class="py-12 text-center">
          <div class="loading-spinner mx-auto mb-4"></div>
          <p class="text-gray-500 dark:text-gray-400">正在加载敏感词列表...</p>
        </div>
        <div v-else-if="words.length === 0" class="py-12 text-center">
          <i class="fas fa-inbox mb-4 text-5xl text-gray-300 dark:text-gray-600"></i>
          <p class="text-gray-500 dark:text-gray-400">暂无敏感词</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full">
            <thead class="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th class="w-12 px-4 py-3 text-left">
                  <input
                    v-model="selectAll"
                    type="checkbox"
                    class="rounded border-gray-300 dark:border-gray-600"
                    @change="toggleSelectAll"
                  />
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  敏感词
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  分类
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  匹配方式
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  状态
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  创建者
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr
                v-for="word in words"
                :key="word.id"
                class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="px-4 py-3">
                  <input
                    v-model="selectedWords"
                    type="checkbox"
                    :value="word.id"
                    class="rounded border-gray-300 dark:border-gray-600"
                  />
                </td>
                <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ word.word }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  <span class="category-badge">{{ getCategoryName(word.category) }}</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {{ getMatchTypeName(word.matchType) }}
                </td>
                <td class="px-4 py-3">
                  <span
                    :class="[
                      'status-badge',
                      word.enabled ? 'status-badge-success' : 'status-badge-danger'
                    ]"
                  >
                    {{ word.enabled ? '启用' : '禁用' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {{ word.createdBy || '-' }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex gap-2">
                    <button class="btn-icon btn-icon-primary" @click="editWord(word)" title="编辑">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button
                      class="btn-icon btn-icon-danger"
                      @click="deleteWord(word.id)"
                      title="删除"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 违规日志标签页 -->
      <div v-show="activeTab === 'logs'">
        <!-- 筛选栏 -->
        <div class="mb-4 flex flex-wrap gap-2">
          <input v-model="logFilters.apiKeyId" type="text" placeholder="API Key ID" class="input" />
          <input v-model="logFilters.startDate" type="date" class="input" placeholder="开始日期" />
          <input v-model="logFilters.endDate" type="date" class="input" placeholder="结束日期" />
          <button class="btn btn-primary" @click="loadViolationLogs">
            <i class="fas fa-search mr-2"></i>
            查询
          </button>
          <button class="btn btn-secondary" @click="clearLogFilters">
            <i class="fas fa-times mr-2"></i>
            清除筛选
          </button>
        </div>

        <!-- 违规日志列表 -->
        <div v-if="loadingLogs" class="py-12 text-center">
          <div class="loading-spinner mx-auto mb-4"></div>
          <p class="text-gray-500 dark:text-gray-400">正在加载违规日志...</p>
        </div>
        <div v-else-if="logs.length === 0" class="py-12 text-center">
          <i class="fas fa-inbox mb-4 text-5xl text-gray-300 dark:text-gray-600"></i>
          <p class="text-gray-500 dark:text-gray-400">暂无违规日志</p>
        </div>
        <div v-else>
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    时间
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    API Key
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    匹配词
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    内容预览
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    操作
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr
                  v-for="log in logs"
                  :key="log.id"
                  class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {{ formatDate(log.timestamp) }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {{ log.apiKeyName || '-' }}
                  </td>
                  <td class="px-4 py-3">
                    <span class="category-badge">{{ getMatchedWordsText(log.matchedWords) }}</span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {{ truncateText(log.contentSample, 50) }}
                  </td>
                  <td class="px-4 py-3">
                    <button
                      class="btn-icon btn-icon-primary"
                      @click="viewLogDetail(log)"
                      title="查看详情"
                    >
                      <i class="fas fa-eye"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 分页 -->
          <div
            v-if="logPagination.pages > 1"
            class="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700"
          >
            <div class="text-sm text-gray-600 dark:text-gray-400">
              共 {{ logPagination.total }} 条记录，第 {{ logPagination.page }} /
              {{ logPagination.pages }} 页
            </div>
            <div class="flex gap-2">
              <button
                class="btn btn-secondary"
                :disabled="logPagination.page === 1"
                @click="changePage(logPagination.page - 1)"
              >
                上一页
              </button>
              <button
                class="btn btn-secondary"
                :disabled="logPagination.page >= logPagination.pages"
                @click="changePage(logPagination.page + 1)"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑敏感词对话框 -->
    <el-dialog
      v-model="showWordModal"
      :title="editingWord ? '编辑敏感词' : '添加敏感词'"
      width="500px"
      @close="cancelWordEdit"
    >
      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            敏感词内容 *
          </label>
          <input
            v-model="wordForm.word"
            type="text"
            class="input w-full"
            placeholder="请输入敏感词"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            分类
          </label>
          <select v-model="wordForm.category" class="input w-full">
            <option value="politics">政治敏感</option>
            <option value="violence">暴力</option>
            <option value="pornography">色情</option>
            <option value="advertising">广告</option>
            <option value="abuse">辱骂</option>
            <option value="other">其他</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            匹配方式
          </label>
          <select v-model="wordForm.matchType" class="input w-full">
            <option value="exact">精确匹配</option>
            <option value="fuzzy">模糊匹配</option>
            <option value="regex">正则表达式</option>
          </select>
        </div>
        <div class="flex items-center">
          <input
            v-model="wordForm.enabled"
            type="checkbox"
            id="word-enabled"
            class="mr-2 rounded border-gray-300 dark:border-gray-600"
          />
          <label for="word-enabled" class="text-sm text-gray-700 dark:text-gray-300"> 启用 </label>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="btn btn-secondary" @click="cancelWordEdit">取消</button>
          <button class="btn btn-primary" @click="saveWord">
            {{ editingWord ? '保存' : '添加' }}
          </button>
        </div>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="showImportModal" title="批量导入敏感词" width="600px">
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          每行一个敏感词，格式：敏感词,分类,匹配方式
        </p>
        <p class="text-xs text-gray-500">
          示例：违禁词,politics,exact 或者 直接输入敏感词（使用默认配置）
        </p>
        <textarea
          v-model="importText"
          class="input w-full"
          rows="10"
          placeholder="违禁词1,politics,exact&#10;违禁词2,violence,fuzzy&#10;违禁词3"
        ></textarea>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button class="btn btn-secondary" @click="showImportModal = false">取消</button>
          <button class="btn btn-primary" @click="importWords">导入</button>
        </div>
      </template>
    </el-dialog>

    <!-- 日志详情对话框 -->
    <el-dialog v-model="showLogDetail" title="违规日志详情" width="600px">
      <div v-if="selectedLog" class="space-y-3">
        <div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">时间：</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            {{ formatDate(selectedLog.timestamp) }}
          </div>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">API Key：</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            {{ selectedLog.apiKeyName || '-' }}
          </div>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">匹配的敏感词：</div>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(match, index) in selectedLog.matchedWords"
              :key="index"
              class="category-badge"
            >
              {{ match.word }}
              <span class="text-xs opacity-75">({{ getCategoryName(match.category) }})</span>
            </span>
          </div>
        </div>
        <div>
          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">违规内容：</div>
          <div
            class="mt-1 max-h-60 overflow-y-auto rounded bg-gray-50 p-3 text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          >
            {{ selectedLog.contentSample }}
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-primary" @click="showLogDetail = false">关闭</button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { showToast } from '@/utils/toast'
import { apiClient } from '@/config/api'
import { ElDialog } from 'element-plus'

defineOptions({
  name: 'ContentSafetyView'
})

// 数据状态
const activeTab = ref('words')
const loading = ref(false)
const loadingLogs = ref(false)
const stats = ref({
  totalWords: 0,
  todayViolations: 0,
  weekViolations: 0
})

// 敏感词相关
const words = ref([])
const selectedWords = ref([])
const selectAll = ref(false)
const showWordModal = ref(false)
const editingWord = ref(null)
const wordForm = ref({
  word: '',
  category: 'other',
  matchType: 'exact',
  enabled: true
})

// 批量导入
const showImportModal = ref(false)
const importText = ref('')

// 违规日志相关
const logs = ref([])
const logFilters = ref({
  apiKeyId: '',
  startDate: '',
  endDate: ''
})
const logPagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  pages: 1
})
const showLogDetail = ref(false)
const selectedLog = ref(null)

// 加载统计数据
const loadStats = async () => {
  try {
    // 加载敏感词统计
    const wordsStatsRes = await apiClient.get('/admin/content-security/sensitive-words-stats')
    console.log('[DEBUG] Words stats response:', wordsStatsRes)
    if (wordsStatsRes.success) {
      const totalWords = wordsStatsRes.data.total || 0
      console.log('[DEBUG] Setting totalWords to:', totalWords)
      stats.value.totalWords = totalWords
    }

    // 加载违规统计
    const violationStatsRes = await apiClient.get('/admin/content-security/violation-stats')
    if (violationStatsRes.success) {
      stats.value.todayViolations = violationStatsRes.data.today || 0
      stats.value.weekViolations = violationStatsRes.data.week || 0
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 加载敏感词列表
const loadWords = async () => {
  loading.value = true
  try {
    const response = await apiClient.get('/admin/content-security/sensitive-words')
    console.log('[DEBUG] Words list response:', response)
    if (response.success) {
      const wordsList = response.data || []
      console.log('[DEBUG] Words list length:', wordsList.length)
      console.log('[DEBUG] First 3 words:', wordsList.slice(0, 3))
      words.value = wordsList
      console.log('[DEBUG] After assignment - words.value.length:', words.value.length)
      // 注意: totalWords 由 loadStats() 函数负责更新
    }
  } catch (error) {
    console.error('加载敏感词列表失败:', error)
    showToast('加载敏感词列表失败', 'error')
  } finally {
    loading.value = false
  }
}

// 加载违规日志
const loadViolationLogs = async () => {
  loadingLogs.value = true
  try {
    const params = {
      page: logPagination.value.page,
      limit: logPagination.value.limit
    }
    if (logFilters.value.apiKeyId) params.apiKeyId = logFilters.value.apiKeyId
    if (logFilters.value.startDate) params.startDate = logFilters.value.startDate
    if (logFilters.value.endDate) params.endDate = logFilters.value.endDate

    const response = await apiClient.get('/admin/content-security/violation-logs', { params })
    if (response.success) {
      logs.value = response.data || []
      if (response.pagination) {
        logPagination.value = response.pagination
      }
    }
  } catch (error) {
    console.error('加载违规日志失败:', error)
    showToast('加载违规日志失败', 'error')
  } finally {
    loadingLogs.value = false
  }
}

// 全选/取消全选
const toggleSelectAll = () => {
  if (selectAll.value) {
    selectedWords.value = words.value.map((w) => w.id)
  } else {
    selectedWords.value = []
  }
}

// 编辑敏感词
const editWord = (word) => {
  editingWord.value = word
  wordForm.value = {
    word: word.word,
    category: word.category,
    matchType: word.matchType,
    enabled: word.enabled
  }
  showWordModal.value = true
}

// 取消编辑
const cancelWordEdit = () => {
  showWordModal.value = false
  editingWord.value = null
  wordForm.value = {
    word: '',
    category: 'other',
    matchType: 'exact',
    enabled: true
  }
}

// 保存敏感词
const saveWord = async () => {
  if (!wordForm.value.word.trim()) {
    showToast('请输入敏感词内容', 'error')
    return
  }

  try {
    if (editingWord.value) {
      // 更新
      await apiClient.put(
        `/admin/content-security/sensitive-words/${editingWord.value.id}`,
        wordForm.value
      )
      showToast('更新成功', 'success')
    } else {
      // 创建
      await apiClient.post('/admin/content-security/sensitive-words', wordForm.value)
      showToast('添加成功', 'success')
    }

    // 先关闭对话框
    cancelWordEdit()

    // 然后重新加载数据
    await Promise.all([loadWords(), loadStats()])
  } catch (error) {
    console.error('保存敏感词失败:', error)
    showToast(error.response?.data?.message || '保存失败', 'error')
  }
}

// 删除敏感词
const deleteWord = async (id) => {
  if (!confirm('确定要删除这个敏感词吗？')) return

  try {
    await apiClient.delete(`/admin/content-security/sensitive-words/${id}`)
    showToast('删除成功', 'success')
    await Promise.all([loadWords(), loadStats()])
  } catch (error) {
    console.error('删除敏感词失败:', error)
    showToast('删除失败', 'error')
  }
}

// 批量删除
const batchDeleteWords = async () => {
  if (selectedWords.value.length === 0) return
  if (!confirm(`确定要删除选中的 ${selectedWords.value.length} 个敏感词吗？`)) return

  try {
    await apiClient.post('/admin/content-security/sensitive-words/batch-delete', {
      ids: selectedWords.value
    })
    showToast('批量删除成功', 'success')
    selectedWords.value = []
    selectAll.value = false
    await Promise.all([loadWords(), loadStats()])
  } catch (error) {
    console.error('批量删除失败:', error)
    showToast('批量删除失败', 'error')
  }
}

// 批量导入
const importWords = async () => {
  if (!importText.value.trim()) {
    showToast('请输入要导入的敏感词', 'error')
    return
  }

  const lines = importText.value.trim().split('\n')
  const wordsToImport = lines
    .map((line) => {
      const parts = line.split(',').map((p) => p.trim())
      if (!parts[0]) return null
      return {
        word: parts[0],
        category: parts[1] || 'other',
        matchType: parts[2] || 'exact',
        enabled: true
      }
    })
    .filter((w) => w !== null)

  if (wordsToImport.length === 0) {
    showToast('没有有效的敏感词数据', 'error')
    return
  }

  try {
    const response = await apiClient.post('/admin/content-security/sensitive-words/batch-import', {
      words: wordsToImport
    })
    if (response.success) {
      showToast(response.message || '导入成功', 'success')
      showImportModal.value = false
      importText.value = ''
      await Promise.all([loadWords(), loadStats()])
    }
  } catch (error) {
    console.error('批量导入失败:', error)
    showToast(error.message || '批量导入失败', 'error')
  }
}

// 导出敏感词
const exportWords = () => {
  const lines = words.value.map(
    (w) => `${w.word},${w.category},${w.matchType},${w.enabled ? 'true' : 'false'}`
  )
  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sensitive-words-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
  showToast('导出成功', 'success')
}

// 刷新缓存
const refreshWordsCache = async () => {
  try {
    await apiClient.post('/admin/content-security/sensitive-words/refresh-cache')
    showToast('缓存刷新成功', 'success')
  } catch (error) {
    console.error('刷新缓存失败:', error)
    showToast('刷新缓存失败', 'error')
  }
}

// 查看日志详情
const viewLogDetail = (log) => {
  selectedLog.value = log
  showLogDetail.value = true
}

// 清除日志筛选
const clearLogFilters = () => {
  logFilters.value = {
    apiKeyId: '',
    startDate: '',
    endDate: ''
  }
  logPagination.value.page = 1
  loadViolationLogs()
}

// 切换页码
const changePage = (page) => {
  logPagination.value.page = page
  loadViolationLogs()
}

// 辅助函数
const getCategoryName = (category) => {
  const map = {
    politics: '政治敏感',
    violence: '暴力',
    pornography: '色情',
    advertising: '广告',
    abuse: '辱骂',
    other: '其他'
  }
  return map[category] || category
}

const getMatchTypeName = (type) => {
  const map = {
    exact: '精确匹配',
    fuzzy: '模糊匹配',
    regex: '正则表达式'
  }
  return map[type] || type
}

const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

const truncateText = (text, maxLength) => {
  if (!text) return '-'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const getMatchedWordsText = (matchedWords) => {
  if (!matchedWords || !Array.isArray(matchedWords) || matchedWords.length === 0) {
    return '-'
  }
  return matchedWords.map((match) => match.word || match).join(', ')
}

// 页面加载
onMounted(() => {
  console.log('[ContentSafetyView] 页面已加载')
  loadStats()
  loadWords()
})
</script>

<style scoped>
.content-safety-container {
  max-width: 1400px;
  margin: 0 auto;
}

.stat-card {
  @apply flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all duration-300 hover:scale-105 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800;
}

.stat-icon {
  @apply flex h-12 w-12 items-center justify-center rounded-lg text-xl;
}

.stat-content {
  @apply flex-1;
}

.stat-label {
  @apply mb-1 text-sm text-gray-600 dark:text-gray-400;
}

.stat-value {
  @apply text-2xl font-bold text-gray-900 dark:text-gray-100;
}

.category-badge {
  @apply inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400;
}

.status-badge {
  @apply inline-block rounded-full px-2 py-1 text-xs font-medium;
}

.status-badge-success {
  @apply bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400;
}

.status-badge-danger {
  @apply bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400;
}

.btn-icon {
  @apply flex h-8 w-8 items-center justify-center rounded-lg transition-colors;
}

.btn-icon-primary {
  @apply bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50;
}

.btn-icon-danger {
  @apply bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50;
}
</style>
