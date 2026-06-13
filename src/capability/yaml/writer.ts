/**
 * YAML 写入器 — Acc Tree 序列化、执行计划写入、配置生成
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { dump as yamlDump } from 'js-yaml';
import { resolveDir } from '../../utils/paths.js';
import type { AccTreeDocument, ExecutionPlan, TestReport } from '../../types/yaml.js';
import type { ComponentDiscovery } from '../../types/interaction-events.js';

export function writeAccTree(doc: AccTreeDocument, outputDir?: string): string {
  const dir = outputDir || resolveDir('acc-trees');
  const host = new URL(doc.page.url).hostname;
  const hash = Buffer.from(doc.page.url).toString('base64url').slice(0, 12);
  const outDir = path.join(dir, host);
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `${hash}.yaml`);
  const yaml = yamlDump(doc, { noRefs: true, lineWidth: 200 });
  fs.writeFileSync(filePath, yaml, 'utf8');
  return filePath;
}

export function writeExecutionPlan(plan: ExecutionPlan, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${plan.caseId}.plan.yaml`);
  fs.writeFileSync(filePath, yamlDump(plan, { noRefs: true }), 'utf8');
  return filePath;
}

export function writeComponentsYaml(
  project: string,
  components: ComponentDiscovery[],
  outputDir: string
): string {
  const dir = path.join(outputDir, project);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'components.yaml');
  const yaml = yamlDump({
    project,
    generated_at: new Date().toISOString(),
    components: components.map(c => ({
      id: c.id,
      prefix: c.prefix,
      known: c.known,
      status: c.status,
      usage: c.usageCount,
      pages: c.pages.slice(0, 5),
      suggested_events: c.suggestedExtraEvents,
    })),
  }, { noRefs: true });
  fs.writeFileSync(filePath, yaml, 'utf8');
  return filePath;
}

export function writeTestReport(report: TestReport, outputDir: string): string {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `report-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
  return filePath;
}
