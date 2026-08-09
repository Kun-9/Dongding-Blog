import { PostList } from "@/components/post/PostList";

export const metadata = {
  title: "Posts",
  alternates: { canonical: "/posts" },
};

export default function Page() {
  return <PostList />;
}
