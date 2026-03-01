'use client';

import type { Metadata } from 'next';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FAQ_ITEMS } from '@/lib/constants';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage(): JSX.Element {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen">
      <section className="py-20 bg-gradient-to-b from-[#FAFAFA] to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1
              className="text-5xl md:text-6xl font-bold text-[#1E3A5F] mb-6"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Get in Touch
            </h1>
            <p className="text-xl text-gray-700 leading-relaxed">
              Have a question? We're here to help. Send us a message and we'll respond within 24 hours.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div>
              <h2
                className="text-3xl font-bold text-[#1E3A5F] mb-6"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Contact Information
              </h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#F4A261]/10 rounded-full">
                    <Mail className="h-6 w-6 text-[#F4A261]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A1A2E] mb-1">Email</h3>
                    <a href="mailto:hello@luxehaven.com" className="text-[#2E86AB] hover:underline">
                      hello@luxehaven.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#F4A261]/10 rounded-full">
                    <Phone className="h-6 w-6 text-[#F4A261]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A1A2E] mb-1">Phone</h3>
                    <p className="text-gray-600">
                      US: +1 (555) 123-4567<br />
                      UK: +44 20 1234 5678
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#F4A261]/10 rounded-full">
                    <MapPin className="h-6 w-6 text-[#F4A261]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A1A2E] mb-1">Support Hours</h3>
                    <p className="text-gray-600">
                      Monday - Friday: 9am - 6pm EST<br />
                      Saturday - Sunday: 10am - 4pm EST
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-6 bg-[#FAFAFA] rounded-lg">
                <h3 className="font-semibold text-[#1A1A2E] mb-3">Quick Response</h3>
                <p className="text-sm text-gray-600">
                  For order-related inquiries, please include your order number in the message.
                  This helps us assist you faster.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-lg border">
              <h2
                className="text-3xl font-bold text-[#1E3A5F] mb-6"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                Send Us a Message
              </h2>

              {isSubmitted ? (
                <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-lg text-center">
                  <h3 className="font-semibold mb-2">Thank You!</h3>
                  <p>Your message has been sent. We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      placeholder="How can we help?"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Message *
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      placeholder="Tell us more about your inquiry..."
                      rows={6}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-[#2E86AB] hover:bg-[#1E3A5F] text-white"
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 bg-[#FAFAFA]">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2
              className="text-4xl font-bold text-center text-[#1E3A5F] mb-12"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              Frequently Asked Questions
            </h2>

            <Accordion type="single" collapsible className="space-y-4">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-white border rounded-lg px-6"
                >
                  <AccordionTrigger className="text-left font-semibold text-[#1A1A2E] hover:text-[#2E86AB]">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </div>
  );
}
