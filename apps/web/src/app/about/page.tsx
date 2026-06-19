import { ShieldCheck, Zap, Users, Globe } from 'lucide-react';

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-gray-900 py-12 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="text-2xl font-bold text-white sm:text-4xl lg:text-5xl">
            About <span className="text-orange-400">ThooviTickets</span>
          </h1>
          <p className="mt-6 text-lg text-gray-300">
            We&apos;re building the most trusted platform for discovering, booking, and managing events.
            From intimate comedy shows to massive music festivals — we connect people with experiences that matter.
          </p>
        </div>
      </div>

      {/* Mission */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Our Mission</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-300 leading-relaxed">
              ThooviTickets was created with a simple goal — make event ticketing seamless for everyone.
              Whether you&apos;re an attendee looking for your next experience or an organiser bringing your
              vision to life, our platform handles the complexity so you can focus on what matters.
            </p>
            <p className="mt-4 text-gray-600 dark:text-gray-300 leading-relaxed">
              We believe every event deserves a fair chance to reach its audience, and every attendee
              deserves a secure, hassle-free booking experience.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">What We Offer</h2>
            <ul className="mt-4 space-y-4">
              <li className="flex gap-3">
                <ShieldCheck className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Secure Transactions</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Every payment is encrypted and verified. No fraud, no fake tickets.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Zap className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Instant Digital Tickets</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get your tickets instantly after payment. No waiting, no printouts needed.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Users className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Organiser Tools</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Powerful dashboard with analytics, ticket management, and real-time sales tracking.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Globe className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Wide Reach</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">List your events and reach thousands of potential attendees across the platform.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* For Organisers CTA */}
      <div className="bg-orange-50 dark:bg-orange-900/20 py-10 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Are You an Event Organiser?</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Join ThooviTickets and start selling tickets for your events. We offer flexible plans
            for organisers of all sizes — from free community events to large-scale festivals.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="/register?role=organiser" className="inline-flex h-11 items-center rounded-md bg-orange-500 px-6 text-sm font-medium text-white hover:bg-orange-600">
              Register as Organiser
            </a>
            <a href="/pricing" className="inline-flex h-11 items-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
              View Pricing
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
