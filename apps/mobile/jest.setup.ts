// Native modules that have no JS implementation under Jest.
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(() => Promise.resolve({ type: "opened" })) }));
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
    setItemAsync: jest.fn((k: string, v: string) => Promise.resolve(void store.set(k, v))),
    deleteItemAsync: jest.fn((k: string) => Promise.resolve(void store.delete(k))),
  };
});

// Tests run in English unless they pick a locale: the machine's own language must not change what they see.
import { setLocale } from "./src/lib/i18n";
setLocale("en");
