/**
 * 交互事件推断器（内联映射版）
 * 从三级字典(624行)精简为内联 role→events 映射表(~50行)
 */
import type { AccTreeNode } from '../../types/yaml.js';
import type { InteractionEvent, InteractionInfo, InteractionConstraints } from '../../types/interaction-events.js';

/** ARIA role → 交互事件映射表（约 16 个核心 role） */
const ROLE_EVENT_MAP: Record<string, InteractionEvent[]> = {
  'button':     ['click', 'focus', 'blur'],
  'link':       ['click', 'focus', 'blur'],
  'textbox':    ['fill', 'clear', 'focus', 'blur', 'press_key'],
  'searchbox':  ['fill', 'clear', 'type_char_by_char', 'focus', 'blur', 'press_key'],
  'combobox':   ['open_dropdown', 'close_dropdown', 'select_single', 'focus', 'blur'],
  'listbox':    ['open_dropdown', 'close_dropdown', 'select_single', 'focus', 'blur'],
  'checkbox':   ['check', 'uncheck', 'toggle', 'focus', 'blur', 'press_key'],
  'radio':      ['check', 'toggle', 'focus', 'blur', 'press_key'],
  'switch':     ['turn_on', 'turn_off', 'toggle', 'focus', 'blur'],
  'slider':     ['set_value', 'drag_to', 'increment', 'decrement', 'focus', 'blur'],
  'spinbutton': ['set_value', 'increment', 'decrement', 'focus', 'blur'],
  'tab':        ['click', 'focus', 'blur'],
  'treeitem':   ['expand', 'collapse', 'select_item', 'click'],
  'menuitem':   ['click', 'select_item', 'hover', 'focus', 'blur'],
  'menuitemcheckbox': ['click', 'select_item', 'hover', 'focus', 'blur'],
  'menuitemradio':    ['click', 'select_item', 'hover', 'focus', 'blur'],
  'option':     ['click', 'select_single'],
  'gridcell':   ['click', 'focus'],
  'rowheader':  ['click', 'focus'],
  'columnheader': ['click', 'focus', 'blur'],
};

/** 组件类型 → 额外事件（基于 componentPrefix / className 追加） */
const COMPONENT_EXTRA_EVENTS: Record<string, InteractionEvent[]> = {
  'pagination': ['paginate'],
  'picker':     ['pick_date'],
  'date-picker': ['pick_date'],
  'cascader':   ['expand', 'collapse'],
  'select':     ['search_and_select'],
};

/** 可交互的 ARIA role 集合 */
const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'textbox', 'searchbox', 'combobox',
  'checkbox', 'radio', 'menuitem', 'menuitemcheckbox',
  'menuitemradio', 'option', 'switch', 'tab', 'slider',
  'spinbutton', 'listbox', 'gridcell', 'rowheader', 'columnheader',
  'treeitem',
]);

export class InteractionInferrer {
  /** 根据 ARIA role + 组件类型 推断交互事件列表 */
  infer(role: string, componentType: string | null): InteractionEvent[] {
    const events = new Set<InteractionEvent>();

    // 基础 role 映射
    const baseEvents = ROLE_EVENT_MAP[role];
    if (baseEvents) {
      for (const e of baseEvents) events.add(e);
    }

    // 组件类型追加事件
    if (componentType) {
      const ctLower = componentType.toLowerCase();
      for (const [key, extra] of Object.entries(COMPONENT_EXTRA_EVENTS)) {
        if (ctLower.includes(key)) {
          for (const e of extra) events.add(e);
        }
      }
    }

    // 所有可交互元素自动加上 scroll_into_view
    if (events.size > 0) {
      events.add('scroll_into_view');
    }

    return [...events];
  }

  /** 判定元素是否可交互 */
  isActionable(node: AccTreeNode): boolean {
    return (
      INTERACTIVE_ROLES.has(node.a11y.role ?? '') &&
      node.geometry.isVisible === true &&
      node.a11y.disabled !== true &&
      node.geometry.boundingBox !== null
    );
  }

  /** 丰富交互信息（事件推断 + 可交互判定 + 值/约束提取） */
  enrichInteraction(node: AccTreeNode): InteractionInfo {
    const ct = node.dom.componentPrefix
      ? node.dom.className?.split(/\s+/).find(c => c.startsWith(node.dom.componentPrefix!)) ?? null
      : null;
    const events = this.infer(node.a11y.role, ct);
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
    return node.dom.attributes?.value || null;
  }

  private extractConstraints(node: AccTreeNode): InteractionConstraints | null {
    const a = node.dom.attributes;
    if (!a) return null;
    if (!a.type) return null;
    return { inputType: a.type };
  }
}
