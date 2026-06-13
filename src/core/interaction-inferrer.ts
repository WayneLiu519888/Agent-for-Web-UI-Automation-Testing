/**
 * 交互事件推断器（配置驱动）
 * 三级优先级: _overrides.yaml > components.yaml > base/controls.yaml
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolvePath } from '../utils/paths.js';
import type { AccTreeNode } from '../types/yaml.js';
import type { InteractionEvent, InteractionInfo, ControlRule, InteractionConstraints } from '../types/interaction-events.js';
import { load as yamlLoad } from 'js-yaml';

export class InteractionInferrer {
  private baseControls: ControlRule[] = [];
  private projectComponents: Map<string, string[]> = new Map();
  private removeEvents: Map<string, Set<string>> = new Map();
  private overrideComponents: Map<string, string[]> = new Map();
  private interactiveRoles: Set<string> = new Set([
    'button', 'link', 'textbox', 'searchbox', 'combobox',
    'checkbox', 'radio', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'option', 'switch', 'tab', 'slider',
    'spinbutton', 'listbox', 'gridcell', 'rowheader', 'columnheader',
    'treeitem',
  ]);

  constructor(dictDir?: string, projectName?: string) {
    const dir = dictDir || path.join(process.cwd(), 'dictionaries');
    this.loadBaseControls(path.join(dir, 'base'));
    if (projectName) {
      this.loadProjectDict(path.join(dir, 'projects', projectName));
    }
  }

  private loadBaseControls(baseDir: string) {
    try {
      const raw = yamlLoad(fs.readFileSync(path.join(baseDir, 'controls.yaml'), 'utf8')) as any;
      if (raw?.rules) this.baseControls = raw.rules;
    } catch { /* base dict not critical */ }
  }

  private loadProjectDict(projectDir: string) {
    try {
      // components.yaml
      const compRaw = yamlLoad(fs.readFileSync(path.join(projectDir, 'components.yaml'), 'utf8')) as any;
      if (compRaw?.components) {
        for (const c of compRaw.components) {
          if (c.events) this.projectComponents.set(c.id, c.events);
        }
      }
      // _overrides.yaml
      const ov = yamlLoad(fs.readFileSync(path.join(projectDir, '_overrides.yaml'), 'utf8')) as any;
      if (ov?.override) {
        for (const o of ov.override) this.overrideComponents.set(o.component, o.events);
      }
      if (ov?.add_events) {
        for (const a of ov.add_events) {
          const ev = this.projectComponents.get(a.component) || [];
          this.projectComponents.set(a.component, [...ev, ...a.events]);
        }
      }
      if (ov?.remove_events) {
        for (const r of ov.remove_events) {
          this.removeEvents.set(r.component, new Set(r.events));
        }
      }
    } catch { /* project dict optional */ }
  }

  infer(node: AccTreeNode): InteractionEvent[] {
    const events = new Set<InteractionEvent>();
    const ct = node.framework?.componentType;

    // Step 1: _overrides override (highest)
    if (ct && this.overrideComponents.has(ct)) {
      return [...this.overrideComponents.get(ct)!] as InteractionEvent[];
    }

    // Step 2: project components
    if (ct && this.projectComponents.has(ct)) {
      for (const e of this.projectComponents.get(ct)!) events.add(e as InteractionEvent);
      if (this.removeEvents.has(ct)) {
        for (const e of this.removeEvents.get(ct)!) events.delete(e as InteractionEvent);
      }
    }

    // Step 3: base controls rules (sorted by priority descending)
    const sortedRules = [...this.baseControls].sort((a, b) => b.priority - a.priority);
    for (const rule of sortedRules) {
      if (this.evaluateMatch(node, rule.match)) {
        for (const e of rule.events) events.add(e as InteractionEvent);
        if (rule.conditional_events) {
          for (const ce of rule.conditional_events) {
            if (this.evaluateMatch(node, ce.when)) {
              for (const e of ce.events) events.add(e as InteractionEvent);
            }
          }
        }
      }
    }

    // scroll_into_view for all actionable
    if (events.size > 0) {
      events.add('scroll_into_view' as InteractionEvent);
    }

    return [...events];
  }

  isActionable(node: AccTreeNode): boolean {
    return (
      this.interactiveRoles.has(node.a11y?.role ?? '') &&
      node.geometry?.isVisible === true &&
      node.a11y?.disabled !== true &&
      node.geometry?.boundingBox !== null
    );
  }

  private evaluateMatch(node: AccTreeNode, cond: any): boolean {
    if (!cond) return true;
    const d = node.dom;
    const a = node.a11y;
    const ct = node.framework?.componentType ?? '';

    if (cond.tagName && d?.tagName !== cond.tagName) return false;
    if (cond.role && a?.role !== cond.role) return false;
    if (cond.classContains && !d?.className?.includes(cond.classContains)) return false;
    if (cond.componentContains && !ct.includes(cond.componentContains)) return false;
    if (cond.domHasAttr && !(d?.attributes as any)?.[cond.domHasAttr]) return false;

    if (cond.domAttr) {
      for (const [k, v] of Object.entries(cond.domAttr)) {
        if (k === 'tagName' && d?.tagName !== v) return false;
        if ((d?.attributes as any)?.[k] !== v) return false;
      }
    }

    if (cond.a11yAttr) {
      for (const [k, v] of Object.entries(cond.a11yAttr)) {
        if ((a as any)?.[k] !== v) return false;
      }
    }

    if (cond.all) return cond.all.every((c: any) => this.evaluateMatch(node, c));
    if (cond.any) return cond.any.some((c: any) => this.evaluateMatch(node, c));

    return true;
  }

  enrichInteraction(node: AccTreeNode): InteractionInfo {
    const events = this.infer(node);
    const actionable = this.isActionable(node);
    return {
      events,
      actionable,
      scrollNeeded: actionable && !node.geometry.isInViewport,
      obscured: false,
      currentValue: this.extractValue(node),
      options: null,
      checked: node.a11y.checked || null,
      constraints: this.extractConstraints(node),
    };
  }

  private extractValue(node: AccTreeNode): string | null {
    return node.dom?.attributes?.value || null;
  }

  private extractConstraints(node: AccTreeNode): InteractionConstraints | null {
    const a = node.dom?.attributes;
    if (!a) return null;
    if (!a.min && !a.max && !a.step && !a.maxlength && !a.type) return null;
    return {
      min: a.min ? Number(a.min) : undefined,
      max: a.max ? Number(a.max) : undefined,
      step: a.step ? Number(a.step) : undefined,
      maxLength: a.maxlength ? Number(a.maxlength) : undefined,
      inputType: a.type || undefined,
    };
  }
}
