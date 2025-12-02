import { NextResponse } from 'next/server';
import { VITAMINS } from '@/lib/vitamins';

export async function GET() {
  try {
    return NextResponse.json({ status: 200, message: 'Vitamins list', data: VITAMINS }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ status: 500, message: e?.message || 'Failed to fetch vitamins list', data: {} }, { status: 500 });
  }
}
