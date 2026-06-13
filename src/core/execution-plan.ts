/**
 * 执行计划生成器 — Phase 1 LLM 推理产出
 */
import type { ExecutionPlan, ExecutionStep, TestCase } from '../types/yaml.js';

/**
 * 从测试用例 + 可选的 Acc Tree 生成执行计划
 * 实际推理由 LLM 完成，这里提供数据结构 + 序列化
 */
export function createExecutionPlan(
  testCase: TestCase,
  planMode: 'sprint' | 'strict' | 'hybrid',
  accTreeText?: string,
): ExecutionPlan {
  return {
    caseId: testCase.id,
    title: testCase.title,
    priority: testCase.priority,
    preconditions: testCase.preconditions,
    steps: [],
    expected: testCase.expected,
    environment: testCase.environment,
    accTreeRef: testCase.acc_tree,
    parGroup: testCase.par_group,
    generatedAt: new Date().toISOString(),
    planMode,
  };
}

/**
 * 执行步骤模板
 */
export function createStep(
  index: number,
  actionType: string,
  description: string,
  locators: ExecutionStep['locators'],
  opts?: { value?: string; waitAfter?: ExecutionStep['waitAfter']; screenshot?: boolean },
): ExecutionStep {
  return {
    index,
    action: { type: actionType, description },
    locators,
    value: opts?.value,
    waitAfter: opts?.waitAfter,
    screenshot: opts?.screenshot,
  };
}

/**
 * 从 LLM 输出的执行计划文本中解析步骤列表
 * LLM 输出格式: "步骤X: [action](selector) -> value"
 */
export function parseLLMPlan(llmOutput: string): ExecutionStep[] {
  const steps: ExecutionStep[] = [];
  const lines = llmOutput.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const match = line.match(/步骤(\d+):\s*(\w+)\((.+?)\)(?:\s*->\s*(.+))?/);
    if (match) {
      steps.push({
        index: parseInt(match[1]),
        action: { type: match[2], description: line },
        locators: [{ strategy: 'getByRole', args: [match[3]] }],
        value: match[4]?.trim(),
      });
    }
  }
  return steps;
}
