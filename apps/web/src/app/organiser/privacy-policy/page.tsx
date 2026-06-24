import { ContentPageView } from '@/components/content-page';

export default function OrganiserPrivacyPolicyPage() {
  return <ContentPageView slug="privacy-policy" forceAudience="organiser" backHref="/organiser/profile" backLabel="Back to Profile" />;
}
