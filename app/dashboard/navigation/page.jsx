import { requireAdmin } from '@/lib/auth-utils'
import NavigationManager from '@/components/dashboard/NavigationManager'
export default async function Page() {
  await requireAdmin()
  return <NavigationManager/>
}
