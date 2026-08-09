import { ManageScreen } from "@/components/manage/ManageScreen";

export const metadata = { title: "글 관리" };

export default async function Page() {
  return <ManageScreen preset="all" />;
}
