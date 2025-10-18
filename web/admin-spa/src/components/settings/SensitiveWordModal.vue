<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="$emit('close')">
    <div class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {{ word ? '编辑敏感词' : '添加敏感词' }}
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- 敏感词输入 -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            敏感词 <span class="text-red-500">*</span>
          </label>
          <input v-model="form.word" type="text" required placeholder="输入敏感词" class="form-input w-full" autofocus />
        </div>

        <!-- 分类选择 -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            分类
          </label>
          <select v-model="form.category" class="form-select w-full">
            <option value="nsfw">NSFW/色情</option>
            <option value="violence">暴力</option>
            <option value="politics">政治</option>
            <option value="other">其他</option>
          </select>
        </div>

        <!-- 匹配方式 -->
        <div>
          <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            匹配方式
          </label>
          <select v-model="form.matchType" class="form-select w-full">
            <option value="exact">精确匹配</option>
            <option value="fuzzy">模糊匹配</option>
            <option value="regex">正则表达式</option>
          </select>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            精确匹配：完全匹配词汇 | 模糊匹配：允许中间插入字符 | 正则：使用正则表达式
          </p>
        </div>

        <!-- 启用状态 -->
        <div class="flex items-center">
          <input v-model="form.enabled" type="checkbox" id="enabled" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700" />
          <label for="enabled" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
            启用此敏感词
          </label>
        </div>

        <!-- 按钮 -->
        <div class="flex justify-end gap-2 pt-4">
          <button type="button" @click="$emit('close')" class="btn btn-secondary">
            取消
          </button>
          <button type="submit" class="btn btn-primary">
            {{ word ? '保存修改' : '创建' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  word: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'submit'])

const form = ref({
  word: '',
  category: 'nsfw',
  matchType: 'exact',
  enabled: true
})

// 如果是编辑模式，填充表单数据
watch(() => props.word, (newWord) => {
  if (newWord) {
    form.value = {
      word: newWord.word || '',
      category: newWord.category || 'nsfw',
      matchType: newWord.matchType || 'exact',
      enabled: newWord.enabled !== false
    }
  }
}, { immediate: true })

function handleSubmit() {
  if (!form.value.word.trim()) {
    return
  }
  emit('submit', form.value)
}
</script>

<style scoped>
.form-input,
.form-select {
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
</style>
