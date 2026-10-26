import { timingSafeEqual } from 'crypto';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_PATHS = new Set([
  '/faq',
  '/terms',
  '/privacy',
  '/returns',
  '/shipping',
  '/laptop-banking',
  '/laptop-banking/terms',
]);

function secretsMatch(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  const provided = request.headers.get('x-revalidate-secret') || '';
  if (!expected || !secretsMatch(provided, expected)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { paths?: unknown } | null;
  const requested = Array.isArray(body?.paths) ? body.paths : [];
  const paths = requested.filter((path): path is string => typeof path === 'string' && ALLOWED_PATHS.has(path));

  if (paths.length === 0) {
    return NextResponse.json({ success: false, message: 'No paths to revalidate' }, { status: 400 });
  }

  paths.forEach((path) => revalidatePath(path));
  return NextResponse.json({ success: true, revalidated: paths });
}
