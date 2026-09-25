/** Minimal typed event: systems expose signals, the scene wires them together. */
export class Signal<T = void> {
  private listeners: ((value: T) => void)[] = [];

  add(fn: (value: T) => void): () => void {
    this.listeners.push(fn);
    return () => this.remove(fn);
  }

  remove(fn: (value: T) => void): void {
    const i = this.listeners.indexOf(fn);
    if (i >= 0) this.listeners.splice(i, 1);
  }

  emit(value: T): void {
    for (let i = 0; i < this.listeners.length; i++) this.listeners[i](value);
  }

  clear(): void {
    this.listeners.length = 0;
  }
}
