import { NextResponse } from 'next/server'
import { readNavigation } from '@/lib/navigation-data'

export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const result = await readNavigation()
    return NextResponse.json(result, {status:result.available ? 200 : 503,headers:{'Cache-Control':'no-store'}})
  } catch {
    return NextResponse.json({menus:[],available:false}, {status:503})
  }
}
