/**
 * YAML 写入器 — Acc Tree 序列化、执行计划写入、配置生成
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { dump as yamlDump } from 'js-yaml';
import { resolveDir } from '../../utils/paths.js';
import { FileWriteError } from '../../types/errors.js';
import type { AccTreeDocument, ExecutionPlan, TestReport } from '../../types/yaml.js';
import type { ComponentDiscovery } from '../../types/interaction-events.js';

export function writeAccTree(doc: AccTreeDocument, outputDir?: string): string {
  try {
    const dir = outputDir || resolveDir('acc-trees');
    const host = new URL(doc.page.url).hostname;
    const hash = Buffer.from(doc.page.url).toString('base64url').slice(0, 12);
    const outDir = path.join(dir, host);
    fs.mkdirSync(outDir, { recursive: true });
    const filePath = path.join(outDir, `${hash}.yaml`);
    const yaml = yamlDump(doc, { noRefs: true, lineWidth: 200 });
    fs.writeFileSync(filePath, yaml, 'utf8');
    return filePath;
  } catch (err: unknown) {
    const target = outputDir || resolveDir('acc-trees');
    throw new FileWriteError(
      `写入 AccTree 失败 (${doc?.page?.url}): ${(err as Error)?.message || String(err)}`,
      target,
    );
  }
}

export function writeExecutionPlan(plan: ExecutionPlan, outputDir: string): string {
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `${plan.caseId}.plan.yaml`);
    fs.writeFileSync(filePath, yamlDump(plan, { noRefs: true }), 'utf8');
    return filePath;
  } catch (err: unknown) {
    throw new FileWriteError(
      `写入执行计划失败 (${plan?.caseId}): ${(err as Error)?.message || String(err)}`,
      outputDir,
    );
  }
}

export function writeComponentsYaml(
  project: string,
  components: ComponentDiscovery[],
  outputDir: string
): string {
  try {
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
  } catch (err: unknown) {
    throw new FileWriteError(
      `写入组件配置失败 (${project}/components.yaml): ${(err as Error)?.message || String(err)}`,
      outputDir,
    );
  }
}

export function writeTestReport(report: TestReport, outputDir: string): string {
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `report-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
    return filePath;
  } catch (err: unknown) {
    throw new FileWriteError(
      `写入测试报告失败: ${(err as Error)?.message || String(err)}`,
      outputDir,
    );
  }
}
