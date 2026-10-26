export function ContentHtml({ html }: { html: string }) {
  return (
    <div
      className="prose prose-neutral max-w-3xl text-[#3A3A3A] prose-headings:text-[#1A1A1A] prose-p:leading-relaxed prose-a:text-[#FF7A19] prose-a:underline hover:prose-a:text-[#E66600] prose-img:h-auto prose-img:max-w-full prose-img:rounded-lg [&_iframe]:my-6 [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:max-w-full"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
