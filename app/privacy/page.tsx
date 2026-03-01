import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'LuxeHaven Privacy Policy. Learn how we collect, use, and protect your personal information in compliance with GDPR and CCPA.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage(): JSX.Element {
  const lastUpdated = 'March 1, 2026';

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1
          className="text-5xl font-bold text-[#1E3A5F] mb-4"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          Privacy Policy
        </h1>
        <p className="text-gray-600 mb-12">Last updated: {lastUpdated}</p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Introduction</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              LuxeHaven ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you visit our website
              and use our services.
            </p>
            <p className="text-gray-700 leading-relaxed">
              This policy complies with the General Data Protection Regulation (GDPR) for UK and EU users,
              and the California Consumer Privacy Act (CCPA) for California residents.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Information We Collect</h2>

            <h3 className="text-2xl font-semibold text-[#1A1A2E] mb-3 mt-6">Personal Information</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Name, email address, phone number, and shipping address</li>
              <li>Payment information (processed securely by Stripe)</li>
              <li>Order history and preferences</li>
              <li>Communications with customer support</li>
            </ul>

            <h3 className="text-2xl font-semibold text-[#1A1A2E] mb-3 mt-6">Automatically Collected Information</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              When you access our website, we automatically collect:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>IP address, browser type, and device information</li>
              <li>Pages visited, time spent, and referring URLs</li>
              <li>Location data (country/region for shipping and currency)</li>
              <li>Cookie data (see our Cookie Policy below)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Process and fulfill your orders</li>
              <li>Send order confirmations, shipping updates, and customer service communications</li>
              <li>Improve our website, products, and services</li>
              <li>Send marketing communications (with your consent)</li>
              <li>Detect and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Sharing Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Service Providers:</strong> Payment processors (Stripe), shipping partners, email service providers</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, sale, or asset transfer</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Your Rights (GDPR & CCPA)</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
              <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails at any time</li>
              <li><strong>Non-Discrimination:</strong> Exercise your rights without discrimination (CCPA)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              To exercise these rights, contact us at <a href="mailto:privacy@luxehaven.com" className="text-[#2E86AB] hover:underline">privacy@luxehaven.com</a>
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Cookies</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use cookies and similar tracking technologies to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Remember your preferences (currency, language)</li>
              <li>Analyze website traffic and user behavior</li>
              <li>Provide personalized content and advertising</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              You can control cookies through your browser settings. Note that disabling cookies may limit
              website functionality.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Data Security</h2>
            <p className="text-gray-700 leading-relaxed">
              We implement industry-standard security measures to protect your data, including SSL encryption,
              secure payment processing via PCI-compliant providers, and regular security audits. However, no
              method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">International Data Transfers</h2>
            <p className="text-gray-700 leading-relaxed">
              Your information may be transferred to and processed in countries outside your country of residence.
              We ensure appropriate safeguards are in place to protect your data in compliance with GDPR.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our services are not directed to individuals under 16. We do not knowingly collect personal
              information from children. If you believe we have collected such information, please contact us
              immediately.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes
              by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about this Privacy Policy or wish to exercise your rights, contact us:
            </p>
            <div className="bg-[#FAFAFA] p-6 rounded-lg">
              <p className="text-gray-700"><strong>Email:</strong> <a href="mailto:privacy@luxehaven.com" className="text-[#2E86AB] hover:underline">privacy@luxehaven.com</a></p>
              <p className="text-gray-700 mt-2"><strong>Data Protection Officer:</strong> <a href="mailto:dpo@luxehaven.com" className="text-[#2E86AB] hover:underline">dpo@luxehaven.com</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
