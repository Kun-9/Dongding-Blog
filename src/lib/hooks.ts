import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

const isDev = process.env.NODE_ENV === "development";
const getAdminClientSnapshot = () => isDev;
const getAdminServerSnapshot = () => false;

export function useAdmin(): boolean {
  return useSyncExternalStore(
    subscribe,
    getAdminClientSnapshot,
    getAdminServerSnapshot,
  );
}
