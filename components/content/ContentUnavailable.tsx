import type { StoreContact } from '@/lib/publicContent';

export function ContentUnavailable({
  message,
  contact,
}: {
  message: string;
  contact: StoreContact;
}) {
  const phoneHref = contact.phone.replace(/\s/g, '');
  return (
    <div className="rounded-lg bg-gray-50 p-6 text-[#3A3A3A]">
      <p className="leading-relaxed">{message}</p>
      <p className="mt-3 leading-relaxed">
        Contact us at{' '}
        <a href={`mailto:${contact.email}`} className="text-[#FF7A19] underline">{contact.email}</a>
        {' '}or{' '}
        <a href={`tel:${phoneHref}`} className="text-[#FF7A19] underline">{contact.phone}</a>.
      </p>
    </div>
  );
}
