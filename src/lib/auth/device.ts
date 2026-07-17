"use client";

const STORAGE_KEY = "makanmate_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id =
      crypto.randomUUID?.() ??
      `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
