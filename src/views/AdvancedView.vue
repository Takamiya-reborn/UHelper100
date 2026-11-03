<template>
  <div class="uh-settings">
    <section class="uh-group">
      <h3 class="uh-group-title">AI 解题</h3>
      <div class="uh-field stack">
        <div class="uh-field-label">
          <label>接口地址</label>
          <p>OpenAI 兼容接口，如 https://api.deepseek.com</p>
        </div>
        <UhInput v-model="settings.aiBaseUrl" placeholder="https://api.deepseek.com" />
      </div>
      <div class="uh-field stack">
        <div class="uh-field-label">
          <label>API Key</label>
          <p>对应服务商控制台的密钥，仅存本地</p>
        </div>
        <UhInput v-model="settings.aiKey" type="password" placeholder="sk-..." />
      </div>
      <div class="uh-field stack">
        <div class="uh-field-label">
          <label>模型名</label>
          <p>请查阅接口文档填写</p>
        </div>
        <UhInput v-model="settings.aiModel" />
      </div>
      <div class="uh-field">
        <div class="uh-field-label">
          <label>测试连接</label>
          <p>{{ testHint }}</p>
        </div>
        <button type="button" class="uh-btn" :disabled="testing" @click="testConnection">测试</button>
      </div>
    </section>
    <section class="uh-group">
      <h3 class="uh-group-title">用量</h3>
      <div class="uh-usage-grid">
        <div class="uh-usage-item">
          <span>请求</span>
          <strong>{{ usage.requests }}</strong>
        </div>
        <div class="uh-usage-item">
          <span>成功</span>
          <strong>{{ usage.success }}</strong>
        </div>
        <div class="uh-usage-item">
          <span>失败</span>
          <strong>{{ usage.failed }}</strong>
        </div>
        <div class="uh-usage-item">
          <span>Token</span>
          <strong>{{ totalTokens }}</strong>
        </div>
      </div>
      <div class="uh-field">
        <div class="uh-field-label">
          <label>统计清零</label>
          <p>清空以上用量统计，不影响设置</p>
        </div>
        <button type="button" class="uh-btn-danger" @click="resetUsage">清零</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import UhInput from '../ui/UhInput.vue';
import { settings } from '../store/settings';
import { usage, resetUsage } from '../store/usage';
import { testAIConnection } from '../utils/ai';

// 输入 + 输出 token 合计
const totalTokens = computed(() => usage.value.promptTokens + usage.value.completionTokens);

// 测试连接：最小请求验证 AI 配置
const testing = ref(false);
const testMessage = ref('');
const testHint = computed(() => (testing.value ? '正在请求 AI…' : testMessage.value || '发送最小请求验证连通性'));

async function testConnection() {
  testing.value = true;
  testMessage.value = '';
  try {
    await testAIConnection();
    testMessage.value = `连接成功（${settings.value.aiModel}）`;
  } catch (error) {
    testMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    testing.value = false;
  }
}
</script>
