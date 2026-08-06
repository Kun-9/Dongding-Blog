/**
 * Footer — copyright + social links.
 * Port of components.jsx#Footer.
 */
import { EmailCopy } from "@/components/ui/EmailCopy";
import { getSite } from "@/lib/site-db";

export async function Footer() {
  const site = await getSite();

  return (
    <footer className="mx-auto mt-20 flex max-w-[1180px] flex-wrap items-center justify-between gap-4 border-t border-border-token px-8 py-8 font-sans text-[13px] text-ink-muted">
      <div>{site.copyright}</div>
      <div className="flex items-center gap-[18px]">
        <a
          href={`https://${site.social.github}`}
          className="text-ink-muted no-underline hover:text-ink"
        >
          GitHub
        </a>
        <EmailCopy email={site.social.email} />
      </div>
    </footer>
  );
}
