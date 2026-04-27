/**
 * Bookmarks (Linkroll) — port of project/page-extras.jsx#BookmarksPage.
 */
import { getAllBookmarks } from "@/lib/bookmarks";
import { BookmarkList } from "@/components/bookmarks/BookmarkList";

export const metadata = {
  title: "Linkroll",
};

export default function Page() {
  const items = getAllBookmarks();

  return (
    <main className="mx-auto max-w-[760px] px-8 pt-16">
      <header className="mb-8">
        <div className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          LINKROLL
        </div>
        <h1 className="m-0 font-sans text-[40px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink">
          읽고 좋았던 글
        </h1>
        <p className="mt-3 max-w-[540px] text-[15px] leading-[1.6] text-ink-muted">
          남이 잘 정리해 둔 글을 다시 쓰는 건 시간 낭비예요. 대신 추천만 합니다.
        </p>
      </header>

      <BookmarkList items={items} />
    </main>
  );
}
