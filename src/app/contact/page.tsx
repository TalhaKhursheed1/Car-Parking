'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle2, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.subject) newErrors.subject = 'Subject is required';
    if (!formData.message) newErrors.message = 'Message is required';
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      // Handle form submission here
      console.log('Contact Form:', formData);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({ name: '', email: '', subject: '', message: '' });
      }, 3000);
    }
  };

  const contactMethods: {
    icon: LucideIcon;
    title: string;
    content: string;
    link: string;
  }[] = [
    {
      icon: Mail,
      title: 'Email',
      content: 'support@parkspace.com',
      link: 'mailto:support@parkspace.com',
    },
    {
      icon: Phone,
      title: 'Phone',
      content: '+1 (555) 123-4567',
      link: 'tel:+15551234567',
    },
    {
      icon: MapPin,
      title: 'Address',
      content: '123 Parking St, City, State 12345',
      link: '#',
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      content: 'Available 24/7',
      link: '#',
    },
  ];

  return (
    <div className="min-h-screen py-12 sm:py-16 px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 w-full">
      <div className="w-full">
        {/* Hero Section */}
        <section className="text-center animate-fade-in-up" style={{ marginBottom: '3rem' }}>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Get in Touch
          </h1>
          <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            Have questions? We're here to help! Reach out to us and we'll respond as soon as possible.
          </p>
        </section>

        {/* Contact Methods */}
        <section style={{ marginBottom: '3rem' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '1.5rem' }}>
            {contactMethods.map((method, index) => {
              const MethodIcon = method.icon;
              return (
              <Card key={index} hover className="text-center p-4">
                <div className="mb-3 flex justify-center">
                  <MethodIcon className="h-8 w-8 text-white/90" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{method.title}</h3>
                <a
                  href={method.link}
                  className="text-white/80 hover:text-white transition-colors block text-sm leading-relaxed"
                >
                  {method.content}
                </a>
              </Card>
              );
            })}
          </div>
        </section>

        {/* Contact Form */}
        <section className="w-full max-w-2xl mx-auto" style={{ marginBottom: '3rem' }}>
          <Card className="p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 text-center">
              Send Us a Message
            </h2>

            {isSubmitted ? (
              <div className="text-center py-8">
                <div className="mb-4 flex justify-center">
                  <CheckCircle2 className="h-14 w-14 text-emerald-400" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Message Sent!</h3>
                <p className="text-white/80 text-base">
                  Thank you for contacting us. We'll get back to you soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '1.5rem' }}>
                  <Input
                    label="Your Name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={errors.name}
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    error={errors.email}
                  />
                </div>

                <Input
                  label="Subject"
                  type="text"
                  placeholder="What is this regarding?"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  error={errors.subject}
                />

                <div className="w-full">
                  <label className="block text-white/95 text-sm font-semibold mb-2 tracking-wide">
                    Message
                  </label>
                  <textarea
                    rows={6}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 focus:bg-white/15 transition-all duration-300 text-sm resize-none"
                    placeholder="Tell us how we can help..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                  {errors.message && (
                    <p className="mt-3 text-base text-red-200 font-medium flex items-center gap-2">
                      <AlertCircle className="inline-block h-4 w-4 shrink-0" aria-hidden /> {errors.message}
                    </p>
                  )}
                </div>

                <Button type="submit" fullWidth size="lg" className="mt-10">
                  Send Message
                </Button>
              </form>
            )}
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="w-full max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-6">
            Frequently Asked Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              {
                question: 'How do I book a parking space?',
                answer: 'Simply create an account, search for available spaces, and book instantly. You can filter by location, price, and availability.',
              },
              {
                question: 'How do I become a provider?',
                answer: 'Register as a provider, complete your profile with parking space details, and wait for admin approval. Once approved, you can start listing spaces.',
              },
              {
                question: 'What payment methods are accepted?',
                answer: 'We accept all major credit cards, debit cards, and digital payment methods. Payments are processed securely through our platform.',
              },
              {
                question: 'Is my information secure?',
                answer: 'Yes, we use industry-standard encryption to protect your personal and payment information. Your data is safe with us.',
              },
            ].map((faq, index) => (
              <Card key={index} hover className="p-12 lg:p-14">
                <h3 className="text-3xl font-bold text-white mb-6">{faq.question}</h3>
                <p className="text-white/70 text-xl leading-relaxed">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
