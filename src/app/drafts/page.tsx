/** `/manage` 를 초안 필터만 켜고 여는 프리셋. 별도 화면이 아니다. */
import { ManageScreen } from "@/components/manage/ManageScreen";

export const metadata = { title: "초안" };

export default async function Page() {
  return <ManageScreen preset="draft" />;
}
