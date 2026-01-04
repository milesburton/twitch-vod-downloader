type TestFn = (name: string, fn: () => void | Promise<void>) => void;
const gTest = (globalThis as { test?: TestFn }).test;
const dTest = (globalThis as { Deno?: { test?: TestFn } }).Deno?.test;
export const test: TestFn = (gTest ?? dTest)!;
