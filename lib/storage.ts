"use client";

import { initialState } from "@/lib/mock-data";
import { AppState } from "@/lib/types";

const STORAGE_KEY = "coordi-closet-state";
const DB_NAME = "coordi-closet-db";
const STORE_NAME = "app-state";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readLegacyLocalStorage(): AppState | null {
  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return null;
  }

  try {
    return JSON.parse(saved) as AppState;
  } catch {
    return null;
  }
}

async function writeIndexedDbState(state: AppState) {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.put(state, STORAGE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

  database.close();
}

export async function loadState(): Promise<AppState> {
  if (typeof window === "undefined") {
    return initialState;
  }

  try {
    const database = await openDatabase();
    const indexedState = await new Promise<AppState | undefined>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(STORAGE_KEY);

      request.onsuccess = () => resolve(request.result as AppState | undefined);
      request.onerror = () => reject(request.error);
    });

    database.close();

    if (indexedState) {
      return indexedState;
    }
  } catch {
    // IndexedDB unavailable: fall back to localStorage.
  }

  const legacyState = readLegacyLocalStorage();

  if (legacyState) {
    try {
      await writeIndexedDbState(legacyState);
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Keep using the legacy state in memory if migration fails.
    }

    return legacyState;
  }

  return initialState;
}

export async function saveState(state: AppState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await writeIndexedDbState(state);
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors so the app keeps running even if persistence fails.
    }
  }
}
