import { requireActiveOrg } from '@/lib/session'
import { PageHeader } from '@/components/dashboard/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SettingsTabs } from '@/components/settings/settings-tabs'
import { ProfileForm } from '@/components/settings/profile-form'

export default async function ProfileSettingsPage() {
  const { user, active } = await requireActiveOrg()

  return (
    <div>
      <PageHeader title="Settings" description="Your personal profile." />
      <SettingsTabs />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you appear to your team in {active.organization.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm member={active} email={user.email ?? ''} />
        </CardContent>
      </Card>
    </div>
  )
}
