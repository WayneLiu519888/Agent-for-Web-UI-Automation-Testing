/**
 * 组件分析器 — 对照 base/controls.yaml 标记已知/未知
 */
import { InteractionInferrer } from './interaction-inferrer.js';
import type { ComponentDiscovery, ComponentSample } from '../types/interaction-events.js';
import type { ControlRule } from '../types/interaction-events.js';

export class ComponentAnalyzer {
  private inferrer: InteractionInferrer;
  private baseRuleIds: Set<string> = new Set();

  constructor(inferrer: InteractionInferrer) {
    this.inferrer = inferrer;
  }

  analyze(sample: ComponentSample, rules: ControlRule[]): ComponentDiscovery {
    let known = false;
    let matchRule: string | null = null;
    const suggestedEvents: string[] = [];

    // 对照 base rules
    for (const rule of rules) {
      const match = rule.match;
      if (match.tagName && match.tagName !== sample.tagName) continue;
      if (match.role && match.role !== sample.role) continue;
      // 简化匹配
      known = true;
      matchRule = rule.id;
      this.baseRuleIds.add(rule.id);
      break;
    }

    return {
      id: sample.id,
      prefix: sample.prefix,
      known,
      matchBaseRule: matchRule,
      samples: [sample],
      usageCount: 1,
      pages: [sample.page],
      suggestedExtraEvents: suggestedEvents,
      status: known ? 'known' : 'pending_review',
    };
  }

  mergeDiscoveries(discoveries: ComponentDiscovery[]): ComponentDiscovery[] {
    const map = new Map<string, ComponentDiscovery>();
    for (const d of discoveries) {
      const key = d.id;
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.samples.push(...d.samples);
        existing.usageCount += d.usageCount;
        existing.pages = [...new Set([...existing.pages, ...d.pages])];
        existing.status = d.status === 'known' ? existing.status : d.status;
      } else {
        map.set(key, d);
      }
    }
    return [...map.values()];
  }
}
