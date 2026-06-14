/**
 * 交互事件类型定义
 * 精简至 controls.yaml 中实际匹配到的事件类型
 */

export type InteractionEvent =
  | 'click'
  | 'hover'
  | 'fill' | 'clear' | 'type_char_by_char' | 'paste' | 'submit_on_enter' | 'autocomplete'
  | 'select_single' | 'select_multi' | 'search_and_select' | 'clear_all' | 'deselect'
  | 'open_dropdown' | 'close_dropdown'
  | 'check' | 'uncheck' | 'toggle' | 'turn_on' | 'turn_off'
  | 'set_value' | 'increment' | 'decrement' | 'drag_to'
  | 'dialog_close' | 'dialog_confirm' | 'dialog_cancel'
  | 'expand' | 'collapse' | 'select_item' | 'select_row' | 'select_all'
  | 'sort_by_column' | 'filter_column' | 'resize_column' | 'paginate'
  | 'pick_date' | 'pick_range' | 'date_clear'
  | 'select_file' | 'drag_drop_file' | 'remove_file'
  | 'press_key'
  | 'focus' | 'blur'
  | 'scroll_into_view';

/** 交互参数约束 */
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

/** 元素交互信息（写入 AccTreeNode.interaction） */
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
