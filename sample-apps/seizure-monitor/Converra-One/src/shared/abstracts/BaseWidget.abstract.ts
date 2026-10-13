/**
 * Base Abstract Class for Converra One Dashboard & UI Widgets
 */
export abstract class BaseWidget<TData = unknown> {
  public abstract readonly id: string;
  public abstract readonly title: string;
  public abstract readonly description: string;
  public abstract readonly icon: string;

  /**
   * Render widget state payload
   */
  public abstract getData(): Promise<TData>;
}
