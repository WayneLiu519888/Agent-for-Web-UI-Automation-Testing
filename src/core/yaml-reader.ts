/**
 * YAML 读取器 — 解析测试用例、环境配置、Acc Tree
 */
import * as fs from 'node:fs';
import { load as yamlLoad } from 'js-yaml';
import { resolvePath } from '../utils/paths.js';
import type { TestCase, EnvironmentConfig, AccTreeDocument, ExecutionPlan } from '../types/yaml.js';

export function readTestCase(filePath: string): TestCase {
  const yaml = yamlLoad(fs.readFileSync(resolvePath('test-cases', filePath), 'utf8')) as any;
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
  const yaml = yamlLoad(fs.readFileSync(resolvePath('environments', `${name}.yaml`), 'utf8')) as any;
  return yaml as EnvironmentConfig;
}

export function readAccTree(filePath: string): AccTreeDocument {
  const yaml = yamlLoad(fs.readFileSync(resolvePath('acc-trees', filePath), 'utf8')) as any;
  return yaml as AccTreeDocument;
}

export function readExecutionPlan(filePath: string): ExecutionPlan {
  const yaml = yamlLoad(fs.readFileSync(filePath, 'utf8')) as any;
  return yaml as ExecutionPlan;
}

export function readYamlRaw(filePath: string): any {
  return yamlLoad(fs.readFileSync(filePath, 'utf8'));
}
