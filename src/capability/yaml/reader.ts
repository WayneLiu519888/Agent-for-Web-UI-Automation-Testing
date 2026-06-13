/**
 * YAML 读取器 — 解析测试用例、环境配置、Acc Tree
 */
import * as fs from 'node:fs';
import { load as yamlLoad } from 'js-yaml';
import { resolvePath } from '../../utils/paths.js';
import type { TestCase, EnvironmentConfig, AccTreeDocument, ExecutionPlan } from '../../types/yaml.js';

/** YAML 读取异常 */
class YamlReadError extends Error {
  constructor(message: string, public readonly filePath: string, public readonly cause?: unknown) {
    super(`[YAML] ${message} (file: ${filePath})`);
    this.name = 'YamlReadError';
  }
}

function safeRead(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    throw new YamlReadError('文件不存在', filePath);
  }
  try {
    return yamlLoad(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new YamlReadError('YAML 解析失败', filePath, err);
  }
}

export function readTestCase(filePath: string): TestCase {
  const fullPath = resolvePath('test-cases', filePath);
  const yaml = safeRead(fullPath);
  if (!yaml || typeof yaml !== 'object') throw new YamlReadError('无效的测试用例格式', fullPath);
  return {
    id: yaml.id,
    title: yaml.title,
    priority: yaml.priority,
    tags: yaml.tags,
    author: yaml.author,
    created_at: yaml.created_at,
    environment: yaml.environment,
    account: yaml.account,
    preconditions: yaml.preconditions || '',
    steps: yaml.steps || '',
    expected: yaml.expected || '',
    acc_tree: yaml.acc_tree,
    par_group: yaml.par_group,
    retry: yaml.retry,
    screenshot_on: yaml.screenshot_on,
  };
}

export function readEnvironment(name: string): EnvironmentConfig {
  const fullPath = resolvePath('environments', `${name}.yaml`);
  const yaml = safeRead(fullPath);
  if (!yaml || typeof yaml !== 'object') throw new YamlReadError('无效的环境配置格式', fullPath);
  return yaml as EnvironmentConfig;
}

export function readAccTree(filePath: string): AccTreeDocument {
  const fullPath = resolvePath('acc-trees', filePath);
  const yaml = safeRead(fullPath);
  if (!yaml || typeof yaml !== 'object') throw new YamlReadError('无效的 Acc Tree 格式', fullPath);
  return yaml as AccTreeDocument;
}

export function readExecutionPlan(filePath: string): ExecutionPlan {
  const yaml = safeRead(filePath);
  if (!yaml || typeof yaml !== 'object') throw new YamlReadError('无效的执行计划格式', filePath);
  return yaml as ExecutionPlan;
}

export function readYamlRaw(filePath: string): any {
  return safeRead(filePath);
}
