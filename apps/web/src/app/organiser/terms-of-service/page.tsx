import { ContentPageView } from '@/components/content-page';

export default function OrganiserTermsPage() {
  return <ContentPageView slug="terms-of-service" forceAudience="organiser" backHref="/organiser/profile" backLabel="Back to Profile" />;
}
