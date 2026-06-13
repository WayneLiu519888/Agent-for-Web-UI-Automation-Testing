/**
 * 交互事件类型定义
 * 与 dictionaries/base/events.yaml + controls.yaml 配合使用
 */

export type InteractionEvent =
  | 'click' | 'dblclick' | 'right_click' | 'long_press'
  | 'hover' | 'hover_tooltip' | 'hover_dropdown'
  | 'fill' | 'clear' | 'type_char_by_char' | 'paste' | 'submit_on_enter' | 'autocomplete'
  | 'select_single' | 'select_multi' | 'search_and_select' | 'clear_all' | 'deselect'
  | 'open_dropdown' | 'close_dropdown' | 'filter_options'
  | 'check' | 'uncheck' | 'toggle' | 'turn_on' | 'turn_off'
  | 'set_value' | 'increment' | 'decrement' | 'drag_to'
  | 'dialog_open' | 'dialog_close' | 'dialog_confirm' | 'dialog_cancel' | 'dialog_dismiss'
  | 'expand' | 'collapse' | 'select_item' | 'select_row' | 'select_all'
  | 'sort_by_column' | 'filter_column' | 'resize_column' | 'drag_row' | 'paginate'
  | 'pick_date' | 'pick_time' | 'pick_range' | 'date_clear' | 'date_today'
  | 'select_file' | 'drag_drop_file' | 'remove_file'
  | 'drag_start' | 'drag_end' | 'drop'
  | 'play' | 'pause' | 'stop' | 'seek' | 'volume' | 'fullscreen'
  | 'press_key' | 'press_shortcut'
  | 'focus' | 'blur'
  | 'scroll_to' | 'scroll_into_view';

export interface InteractionConstraints {
  min?: number | null;
  max?: number | null;
  step?: number | null;
  maxLength?: number | null;
  inputType?: string | null;
  maxSelection?: number | null;
  acceptTypes?: string[] | null;
  allowCustomInput?: boolean | null;
  dateFormat?: string | null;
}

export interface InteractionInfo {
  events: InteractionEvent[];
  actionable: boolean;
  scrollNeeded: boolean;
  obscured: boolean;
  currentValue?: string | number | boolean | string[] | null;
  options?: string[] | null;
  checked?: boolean | 'mixed' | null;
  constraints?: InteractionConstraints | null;
}

export interface MatchCondition {
  tagName?: string;
  role?: string;
  classContains?: string;
  componentContains?: string;
  domHasAttr?: string;
  domAttr?: Record<string, string>;
  a11yAttr?: Record<string, unknown>;
  all?: MatchCondition[];
  any?: MatchCondition[];
}

export interface ControlRule {
  id: string;
  priority: number;
  match: MatchCondition;
  events: string[];
  conditional_events?: Array<{ when: MatchCondition; events: string[] }>;
}

export interface EventDef {
  id: string;
  category: string;
  description: string;
}

export interface ComponentDiscovery {
  id: string;
  prefix: string | null;
  known: boolean;
  matchBaseRule: string | null;
  samples: ComponentSample[];
  usageCount: number;
  pages: string[];
  suggestedExtraEvents: string[];
  status: 'known' | 'pending_review';
}

export interface ComponentSample {
  id: string;
  prefix: string | null;
  tagName: string;
  role: string;
  fullClasses: string[];
  dataAttrs: string[];
  page: string;
  boundingBox: { w: number; h: number } | null;
  childrenCount: number;
  observedBehaviors: string[];
}
