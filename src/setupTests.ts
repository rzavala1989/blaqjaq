import '@testing-library/jest-dom/vitest';

// Node 26 exposes an experimental, disabled global localStorage that shadows
// jsdom's implementation in Vitest. Provide the small Web Storage surface our
// tests use so persistence behaviour remains covered on local and CI runners.
class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(String(key), String(value));
  }
}

const testStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: testStorage,
});
