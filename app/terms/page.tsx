import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'LuxeHaven Terms of Service. Read our terms and conditions for using our e-commerce platform and purchasing products.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage(): JSX.Element {
  const lastUpdated = 'March 1, 2026';

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1
          className="text-5xl font-bold text-[#1E3A5F] mb-4"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          Terms of Service
        </h1>
        <p className="text-gray-600 mb-12">Last updated: {lastUpdated}</p>

        <div className="prose prose-lg max-w-none">
          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Agreement to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using LuxeHaven ("the Website"), you agree to be bound by these Terms of Service
              and all applicable laws and regulations. If you do not agree with any of these terms, you are
              prohibited from using this site.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Use License</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Permission is granted to temporarily access the materials on LuxeHaven for personal,
              non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">Under this license, you may not:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Modify or copy the materials</li>
              <li>Use the materials for commercial purposes</li>
              <li>Attempt to reverse engineer any software on the Website</li>
              <li>Remove copyright or proprietary notations</li>
              <li>Transfer the materials to another person</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Product Information & Pricing</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We strive to provide accurate product descriptions and pricing. However:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Colors may vary slightly due to screen settings</li>
              <li>Prices are subject to change without notice</li>
              <li>We reserve the right to limit quantities</li>
              <li>All prices are in USD or GBP as displayed</li>
              <li>We are not responsible for typographical errors</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Orders & Payment</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              By placing an order, you agree that:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>You are legally capable of entering into binding contracts</li>
              <li>All information provided is accurate and complete</li>
              <li>Your payment method is authorized for the purchase amount</li>
              <li>We reserve the right to refuse or cancel orders at our discretion</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Payment is processed securely through Stripe. We never store your full credit card information.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Shipping & Delivery</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Shipping times and costs vary by location:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Standard shipping: 7-12 business days</li>
              <li>Express shipping: 3-5 business days (where available)</li>
              <li>Free shipping on orders over $50 (USD) or £40 (GBP)</li>
              <li>UK orders include all customs duties</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              We are not responsible for delays caused by customs, weather, or carrier issues beyond our control.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Returns & Refunds</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We offer a 30-day return policy:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Items must be unused and in original packaging</li>
              <li>Return shipping is free for UK and US customers</li>
              <li>Refunds processed within 5-7 business days of receipt</li>
              <li>Original shipping costs are non-refundable</li>
              <li>Sale items may be final sale (indicated at purchase)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              To initiate a return, contact us at <a href="mailto:returns@luxehaven.com" className="text-[#2E86AB] hover:underline">returns@luxehaven.com</a>
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Intellectual Property</h2>
            <p className="text-gray-700 leading-relaxed">
              All content on this website, including text, graphics, logos, images, and software, is the
              property of LuxeHaven or its content suppliers and is protected by international copyright laws.
              Unauthorized use is prohibited.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed">
              LuxeHaven shall not be liable for any damages arising from the use or inability to use our
              website or products, including but not limited to direct, indirect, incidental, or consequential
              damages. Maximum liability is limited to the amount paid for the product in question.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These terms are governed by the laws of the United Kingdom and the United States, depending on
              your location. Any disputes shall be resolved in the appropriate jurisdiction.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these terms at any time. Changes will be posted on this page
              with an updated revision date. Continued use of the website after changes constitutes acceptance
              of the new terms.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-semibold text-[#1E3A5F] mb-4">Contact Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              For questions about these Terms of Service, contact us:
            </p>
            <div className="bg-[#FAFAFA] p-6 rounded-lg">
              <p className="text-gray-700"><strong>Email:</strong> <a href="mailto:legal@luxehaven.com" className="text-[#2E86AB] hover:underline">legal@luxehaven.com</a></p>
              <p className="text-gray-700 mt-2"><strong>Support:</strong> <a href="mailto:hello@luxehaven.com" className="text-[#2E86AB] hover:underline">hello@luxehaven.com</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
