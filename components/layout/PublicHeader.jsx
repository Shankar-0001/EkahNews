import PublicHeaderClient from '@/components/layout/PublicHeaderClient'
import { readNavigation } from '@/lib/navigation-data'

export default async function PublicHeader() {
  let result
  try { result = await readNavigation() } catch { result = { menus:[], available:false } }
  return <PublicHeaderClient navigation={result.menus} available={result.available} />
}
