<template>
  <div class="content-safety-manager">
    <h1>内容安全管理 - 测试版本</h1>
    <p>如果您能看到这个内容，说明组件已经成功加载！</p>
    <div style="padding: 20px; background: #f0f0f0; border-radius: 8px;">
      <h2>功能正在开发中...</h2>
      <p>敏感词管理和违规日志功能即将上线。</p>
    </div>
  </div>
</template>

<script setup>
console.log('[ContentSafety-Simple] 简单组件已加载！')
import { onMounted } from 'vue'

onMounted(() => {
  console.log('[ContentSafety-Simple] 简单组件已挂载！')
})
</script>