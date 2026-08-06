import { useEffect, useState, useSyncExternalStore } from "react";
import { browserClient } from "@/lib/supabase-browser";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

/**
 * 로그인한 계정의 이메일 또는 null — 편집 UI(글의 AdminBar 등)를 보여줄지 결정한다.
 *
 * 서버에서 판단하면 ISR 로 캐시된 글 페이지에 특정 사용자의 화면이 굳어버리므로,
 * 마운트 후 클라이언트에서만 확인한다. 잘못 보이더라도 실제 편집은 서버가 막는다.
 */
export function useAuthEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    browserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled && data.session) {
          setEmail(data.session.user.email ?? "");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return email;
}

/** 로그인 여부만 필요할 때. */
export function useAdmin(): boolean {
  return useAuthEmail() !== null;
}
