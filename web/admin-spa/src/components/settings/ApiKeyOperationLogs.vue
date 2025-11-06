<template>
  <div class="operation-logs-section">
    <!-- 筛选器 -->
    <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <!-- 操作类型筛选 -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          操作类型
        </label>
        <select
          v-model="filters.action"
          class="form-select w-full dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          @change="fetchLogs"
        >
          <option value="">全部</option>
          <option value="create">创建</option>
          <option value="update">修改</option>
          <option value="delete">删除</option>
          <option value="restore">恢复</option>
        </select>
      </div>

      <!-- 操作者筛选 -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          操作者
        </label>
        <input
          v-model="filters.operator"
          type="text"
          class="form-input w-full dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          placeholder="输入用户名"
          @keyup.enter="fetchLogs"
        />
      </div>

      <!-- 起始时间 -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          起始时间
        </label>
        <input
          v-model="filters.startDate"
          type="datetime-local"
          class="form-input w-full dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          @change="fetchLogs"
        />
      </div>

      <!-- 结束时间 -->
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          结束时间
        </label>
        <input
          v-model="filters.endDate"
          type="datetime-local"
          class="form-input w-full dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          @change="fetchLogs"
        />
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="mb-4 flex items-center justify-between">
      <div class="text-sm text-gray-600 dark:text-gray-400">
        共 {{ totalLogs }} 条记录
      </div>
      <div class="flex gap-2">
        <button
          class="btn btn-secondary btn-sm"
          @click="resetFilters"
        >
          <i class="fas fa-undo mr-1"></i>
          重置筛选
        </button>
        <button
          class="btn btn-primary btn-sm"
          @click="fetchLogs"
        >
          <i class="fas fa-search mr-1"></i>
          查询
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="py-12 text-center">
      <div class="loading-spinner mx-auto mb-4"></div>
      <p class="text-gray-500 dark:text-gray-400">正在加载日志...</p>
    </div>

    <!-- 日志列表 -->
    <div v-else-if="logs.length > 0" class="space-y-4">
      <!-- 桌面端表格视图 -->
      <div class="hidden overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 lg:block">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                时间
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                操作类型
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                操作者
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                API Key
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                IP地址
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            <tr
              v-for="log in logs"
              :key="log.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                {{ formatDate(log.timestamp) }}
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span
                  :class="getActionBadgeClass(log.action)"
                  class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
                >
                  <i :class="getActionIcon(log.action)" class="mr-1"></i>
                  {{ getActionText(log.action) }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {{ log.operator }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                <div class="max-w-xs truncate" :title="log.keyName">
                  {{ log.keyName }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ log.keyId }}
                </div>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                {{ log.clientIp }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-sm">
                <button
                  class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  @click="showLogDetails(log)"
                >
                  <i class="fas fa-eye mr-1"></i>
                  详情
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 移动端卡片视图 -->
      <div class="space-y-4 lg:hidden">
        <div
          v-for="log in logs"
          :key="log.id"
          class="card p-4"
        >
          <div class="mb-2 flex items-start justify-between">
            <span
              :class="getActionBadgeClass(log.action)"
              class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
            >
              <i :class="getActionIcon(log.action)" class="mr-1"></i>
              {{ getActionText(log.action) }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ formatDate(log.timestamp) }}
            </span>
          </div>
          <div class="space-y-2 text-sm">
            <div>
              <span class="text-gray-600 dark:text-gray-400">Key:</span>
              <span class="ml-2 font-medium text-gray-900 dark:text-gray-100">{{ log.keyName }}</span>
            </div>
            <div>
              <span class="text-gray-600 dark:text-gray-400">操作者:</span>
              <span class="ml-2 text-gray-900 dark:text-gray-100">{{ log.operator }}</span>
            </div>
            <div>
              <span class="text-gray-600 dark:text-gray-400">IP:</span>
              <span class="ml-2 text-gray-900 dark:text-gray-100">{{ log.clientIp }}</span>
            </div>
          </div>
          <div class="mt-3">
            <button
              class="btn btn-sm btn-secondary w-full"
              @click="showLogDetails(log)"
            >
              <i class="fas fa-eye mr-1"></i>
              查看详情
            </button>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="mt-4 flex items-center justify-between">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          第 {{ currentPage }} 页，共 {{ Math.ceil(totalLogs / pageSize) }} 页
        </div>
        <div class="flex gap-2">
          <button
            :disabled="currentPage === 1"
            class="btn btn-sm btn-secondary"
            @click="goToPage(currentPage - 1)"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          <button
            :disabled="currentPage >= Math.ceil(totalLogs / pageSize)"
            class="btn btn-sm btn-secondary"
            @click="goToPage(currentPage + 1)"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="py-12 text-center">
      <i class="fas fa-clipboard-list mb-4 text-4xl text-gray-400 dark:text-gray-600"></i>
      <p class="text-gray-500 dark:text-gray-400">暂无操作日志</p>
    </div>

    <!-- 日志详情弹窗 -->
    <div
      v-if="showDetailsModal"
      class="modal-backdrop"
      @click.self="closeDetailsModal"
    >
      <div class="modal-content max-w-3xl">
        <!-- 标题 -->
        <div class="mb-4 flex items-start justify-between">
          <div>
            <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">
              操作日志详情
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ formatDate(selectedLog.timestamp) }}
            </p>
          </div>
          <button
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            @click="closeDetailsModal"
          >
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>

        <!-- 基本信息 -->
        <div class="mb-4 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <div>
            <div class="text-xs text-gray-600 dark:text-gray-400">操作类型</div>
            <div class="mt-1">
              <span
                :class="getActionBadgeClass(selectedLog.action)"
                class="inline-flex rounded-full px-2 py-1 text-xs font-semibold"
              >
                <i :class="getActionIcon(selectedLog.action)" class="mr-1"></i>
                {{ getActionText(selectedLog.action) }}
              </span>
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-600 dark:text-gray-400">操作者</div>
            <div class="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ selectedLog.operator }} ({{ selectedLog.operatorType }})
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-600 dark:text-gray-400">API Key名称</div>
            <div class="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ selectedLog.keyName }}
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-600 dark:text-gray-400">Key ID</div>
            <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {{ selectedLog.keyId }}
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-600 dark:text-gray-400">IP地址</div>
            <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {{ selectedLog.clientIp }}
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-600 dark:text-gray-400">操作时间</div>
            <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {{ formatDate(selectedLog.timestamp) }}
            </div>
          </div>
        </div>

        <!-- 创建操作：显示初始化信息 -->
        <div v-if="selectedLog.action === 'create' && selectedLog.initialData" class="space-y-2">
          <h4 class="mb-2 text-sm font-bold text-gray-900 dark:text-gray-100">
            初始化配置
          </h4>
          <div class="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <dl class="space-y-3">
              <div v-for="(value, key) in selectedLog.initialData" :key="key" class="flex justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
                <dt class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {{ getFieldDisplayName(key) }}
                </dt>
                <dd class="text-sm text-gray-900 dark:text-gray-100">
                  {{ formatFieldValue(key, value) }}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- 修改操作：显示变更内容 -->
        <div v-if="selectedLog.action === 'update' && selectedLog.changes" class="space-y-2">
          <h4 class="mb-2 text-sm font-bold text-gray-900 dark:text-gray-100">
            变更内容 ({{ Object.keys(selectedLog.changes).length }} 项)
          </h4>
          <div v-if="Object.keys(selectedLog.changes).length === 0" class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-800">
            <p class="text-sm text-gray-600 dark:text-gray-400">无实际变更</p>
          </div>
          <div v-else class="max-h-96 space-y-3 overflow-y-auto">
            <div
              v-for="(change, field) in selectedLog.changes"
              :key="field"
              class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <div class="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ change.displayName }}
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <div class="mb-1 text-xs text-gray-600 dark:text-gray-400">修改前</div>
                  <div class="rounded bg-red-50 px-2 py-1 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {{ change.before }}
                  </div>
                </div>
                <div>
                  <div class="mb-1 text-xs text-gray-600 dark:text-gray-400">修改后</div>
                  <div class="rounded bg-green-50 px-2 py-1 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    {{ change.after }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 删除和恢复操作：简单提示 -->
        <div v-if="selectedLog.action === 'delete'" class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
          <p class="text-sm text-red-700 dark:text-red-300">
            <i class="fas fa-trash-alt mr-2"></i>
            该 API Key 已被删除
          </p>
        </div>
        <div v-if="selectedLog.action === 'restore'" class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/30">
          <p class="text-sm text-green-700 dark:text-green-300">
            <i class="fas fa-undo mr-2"></i>
            该 API Key 已被恢复
          </p>
        </div>

        <!-- 关闭按钮 -->
        <div class="mt-6 flex justify-end">
          <button
            class="btn btn-secondary"
            @click="closeDetailsModal"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiClient } from '@/config/api'

// 状态
const loading = ref(false)
const logs = ref([])
const totalLogs = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// 筛选器
const filters = ref({
  action: '',
  operator: '',
  keyId: '',
  startDate: '',
  endDate: ''
})

// 详情弹窗
const showDetailsModal = ref(false)
const selectedLog = ref({})

// 获取日志列表
const fetchLogs = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      ...filters.value
    }

    // 移除空值参数
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] == null) {
        delete params[key]
      }
    })

    const response = await apiClient.get('/admin/api-keys/operation-logs', { params })

    if (response.success) {
      logs.value = response.logs
      totalLogs.value = response.total
    }
  } catch (error) {
    console.error('获取操作日志失败:', error)
    // 这里可以添加错误提示
  } finally {
    loading.value = false
  }
}

// 重置筛选
const resetFilters = () => {
  filters.value = {
    action: '',
    operator: '',
    keyId: '',
    startDate: '',
    endDate: ''
  }
  currentPage.value = 1
  fetchLogs()
}

// 翻页
const goToPage = (page) => {
  if (page < 1 || page > Math.ceil(totalLogs.value / pageSize.value)) {
    return
  }
  currentPage.value = page
  fetchLogs()
}

// 显示详情
const showLogDetails = (log) => {
  selectedLog.value = log
  showDetailsModal.value = true
}

// 关闭详情
const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedLog.value = {}
}

// 格式化日期
const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 获取操作类型文本
const getActionText = (action) => {
  const map = {
    create: '创建',
    update: '修改',
    delete: '删除',
    restore: '恢复'
  }
  return map[action] || action
}

// 获取操作图标
const getActionIcon = (action) => {
  const map = {
    create: 'fas fa-plus-circle',
    update: 'fas fa-edit',
    delete: 'fas fa-trash-alt',
    restore: 'fas fa-undo'
  }
  return map[action] || 'fas fa-circle'
}

// 获取操作徽章样式
const getActionBadgeClass = (action) => {
  const map = {
    create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    restore: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
  }
  return map[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

// 获取字段显示名称
const getFieldDisplayName = (field) => {
  // 这里可以根据需要自定义字段显示名称
  return field
}

// 格式化字段值
const formatFieldValue = (field, value) => {
  if (value == null || value === '') {
    return '-'
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '[]'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

// 组件挂载时加载数据
onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
/* 加载动画 */
.loading-spinner {
  border: 3px solid #f3f4f6;
  border-top-color: #3b82f6;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 弹窗样式 */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  max-height: 90vh;
  overflow-y: auto;
  width: 100%;
}

.dark .modal-content {
  background: #1f2937;
}
</style>
