import { NextResponse } from 'next/server';
import DIETARY from '@/lib/dietary';

export async function GET() {
  try {
    return NextResponse.json({ status: 200, message: 'Dietary list', data: DIETARY }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ status: 500, message: e?.message || 'Failed to fetch dietary list', data: {} }, { status: 500 });
  }
}
