<template>
  <div class="uh-task">
    <template v-if="questions.length > 0">
      <div class="uh-task-head">
        <span class="uh-task-icon">
          <svg viewBox="0 0 24 24">
            <path v-if="runtime.task.video.status" d="M8 5v14l11-7z" />
            <path v-else d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13zM4 19.5V20h16v-3" />
          </svg>
        </span>
        <div class="uh-task-title">
          <span>当前任务</span>
          <h2>{{ waiting ? '等待任务加载' : runtime.task.name }}</h2>
        </div>
        <span class="uh-task-badge" :class="{ 'is-waiting': waiting }">
          {{ waiting ? '等待中' : '进行中' }}
        </span>
      </div>

      <div class="uh-task-stats">
        <span>已处理 {{ completed }} / {{ runtime.count }} 题</span>
        <span>已作答 {{ answered }} 题</span>
      </div>
      <div
        class="uh-progress"
        role="progressbar"
        aria-label="题目处理进度"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span class="uh-progress-bar" :style="{ width: `${percent}%` }" />
      </div>

      <article class="uh-question">
        <div class="uh-question-head">
          <span class="uh-question-no">第 {{ inx + 1 }} 题</span>
          <span class="uh-answer-status" :class="current?.status">{{ statusText }}</span>
        </div>
        <h3>{{ current?.question }}</h3>
        <div class="uh-question-answer">
          <span>答案</span>
          <pre v-if="current?.answer">{{ answerText(current.answer) }}</pre>
          <p v-else>正在询问 AI，请稍候…</p>
        </div>
      </article>

      <!-- 考试不开放题号导航（与 study 的 TaskPanel 一致） -->
      <section v-if="runtime.task.name !== '考试'" class="uh-question-nav">
        <span>题号</span>
        <div class="uh-question-nav-grid">
          <button
            v-for="(question, index) in questions"
            :key="index"
            type="button"
            :class="[question.status, { 'is-current': inx === index }]"
            :aria-label="`查看第 ${index + 1} 题`"
            :aria-current="inx === index ? 'true' : undefined"
            @click="selectQuestion(index)"
          >
            {{ index + 1 }}
          </button>
        </div>
      </section>
    </template>

    <div v-else class="uh-task-empty">
      <span class="uh-task-empty-icon">
        <svg viewBox="0 0 24 24">
          <path v-if="runtime.task.video.status" d="M8 5v14l11-7z" />
          <path v-else d="M12 22a10 10 0 1 1 10-10 10 10 0 0 1-10 10zm0-18a8 8 0 1 0 8 8 8 8 0 0 0-8-8zm1 5h-2v4H7v2h4v4h2v-4h4v-2h-4z" />
        </svg>
      </span>
      <h3>{{ runtime.task.video.status ? '正在完成视频任务' : '准备就绪，等待任务' }}</h3>
      <p>{{ runtime.task.video.status ? '视频运行状态可在本页查看。' : '进入章节、作业或考试页面后，任务进度会显示在这里。' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { runtime, selectQuestion, type TaskQuestion } from '../store/runtime';

const questions = computed(() => runtime.task.work.questionList);
const inx = computed(() => runtime.task.work.inx);
const current = computed<TaskQuestion | undefined>(() => questions.value[inx.value]);
const waiting = computed(() => runtime.task.name === '暂未加载');

// 已处理 = 有状态标记的题；已作答 = AI 成功给出并填入答案的题
const completed = computed(() => questions.value.filter((q) => q.status).length);
const answered = computed(() => questions.value.filter((q) => q.status === 'primary').length);
const percent = computed(() =>
  runtime.count ? Math.min(100, Math.round((completed.value / runtime.count) * 100)) : 0,
);

const statusText = computed(() =>
  current.value?.status === 'primary' ? '已作答' : current.value?.status === 'danger' ? '作答失败' : '正在作答',
);

function answerText(answer: TaskQuestion['answer']) {
  return Array.isArray(answer) ? answer.join('\n') : String(answer || '');
}
</script>
