import { Link } from 'react-router-dom';
import {
  PenTool,
  FileText,
  Download,
  Brain,
  Sparkles,
  Shield,
  ArrowRight,
  CheckCircle,
  Clock,
  Globe,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const features = [
  {
    icon: PenTool,
    title: 'Personalized Handwriting',
    description: 'Upload one page of your handwriting and our AI creates a unique profile that captures your letter shapes, spacing, slant, and natural variations.',
  },
  {
    icon: Brain,
    title: 'AI Answer Generation',
    description: 'Enter your questions and get accurate, well-structured answers powered by advanced LLMs. Choose from short, medium, or detailed answer lengths.',
  },
  {
    icon: FileText,
    title: 'Realistic Notebook Pages',
    description: 'Answers are rendered on realistic ruled notebook paper with proper margins, line spacing, and automatic page breaks for long assignments.',
  },
  {
    icon: Download,
    title: 'PDF & DOCX Export',
    description: 'Download your completed assignments as high-quality PDF documents or Word files with preserved handwriting appearance and notebook backgrounds.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your handwriting samples and assignments are stored securely. We never share your data or use it to train other models.',
  },
  {
    icon: Sparkles,
    title: 'Continuous Improvement',
    description: 'Update your handwriting profile anytime. The system learns from corrections and gets better at matching your unique style.',
  },
];

const stats = [
  { value: '10K+', label: 'Assignments Generated' },
  { value: '99.2%', label: 'Handwriting Accuracy' },
  { value: '50K+', label: 'Active Students' },
  { value: '4.9/5', label: 'User Rating' },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'University Student',
    content: 'This saved me hours on my thesis assignments. The handwriting looks exactly like mine - my professor couldn\'t tell the difference!',
    avatar: 'SC',
  },
  {
    name: 'Marcus Johnson',
    role: 'High School Senior',
    content: 'Finally, an AI tool that actually understands my handwriting style. The notebook paper rendering is incredibly realistic.',
    avatar: 'MJ',
  },
  {
    name: 'Emily Rodriguez',
    role: 'College Junior',
    content: 'The PDF export feature is perfect for submitting assignments. Everything looks professional and maintains the handwritten feel.',
    avatar: 'ER',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-notebook-paper-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-notebook-blue-50 via-white to-notebook-purple-50" />
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-notebook-blue-100/50 to-transparent" />

        {/* Decorative elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-notebook-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-notebook-purple-200/30 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-notebook-blue-100 text-notebook-blue-700 text-sm font-medium mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              <span>New: Handwriting Profile v2.0 with stroke-level synthesis</span>
            </div>

            <h1 className="font-heading text-5xl lg:text-7xl text-notebook-ink-50 mb-6 animate-slide-up">
              Create Assignments in{' '}
              <span className="text-gradient">Your Own Handwriting</span>
            </h1>

            <p className="text-lg lg:text-xl text-notebook-blue-600 mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '100ms' }}>
              Upload one page of your handwriting. Our AI analyzes your unique style and generates
              complete assignments that look authentically handwritten by you.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Button size="xl" asChild>
                <Link to="/register">
                  <span>Start Free</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-notebook-blue-500 animate-fade-in" style={{ animationDelay: '300ms' }}>
              No credit card required · 14-day free trial · Cancel anytime
            </p>
          </div>

          {/* Hero Illustration */}
          <div className="mt-16 relative animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="max-w-4xl mx-auto">
              <div className="notebook-cover p-8 relative">
                <div className="absolute top-4 left-4 paper-clip" />
                <div className="sticky-note" />

                <div className="handwriting-preview space-y-4">
                  <p className="question-text">Q: Explain the process of photosynthesis in plants.</p>
                  <p className="answer-text">
                    Photosynthesis in plants is a vital biological process where green plants convert light energy
                    into chemical energy. During this process, plants absorb sunlight using chlorophyll in their
                    leaves and use it to transform carbon dioxide and water into glucose and oxygen.
                  </p>
                  <p className="answer-text">
                    The process occurs in two main stages: the light-dependent reactions and the Calvin cycle.
                    In the light-dependent reactions, chlorophyll captures photons and uses the energy to split
                    water molecules, releasing oxygen and producing ATP and NADPH.
                  </p>
                </div>

                <div className="absolute bottom-4 right-4 flex items-center gap-2 text-white/70 text-sm">
                  <span>Page 1 of 3</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y border-notebook-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="text-4xl lg:text-5xl font-heading text-gradient mb-2">{stat.value}</div>
                <div className="text-notebook-blue-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-4xl lg:text-5xl text-notebook-ink-50 mb-4">
              Everything You Need for{' '}
              <span className="text-gradient">Perfect Assignments</span>
            </h2>
            <p className="text-lg text-notebook-blue-600">
              Powerful features designed to make assignment creation effortless while maintaining
              the authentic look of your handwriting.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={feature.title} variant="hover" padding="lg" className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="w-12 h-12 rounded-xl bg-notebook-blue-100 text-notebook-blue-600 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-xl text-notebook-ink-50 mb-2">{feature.title}</h3>
                <p className="text-notebook-blue-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white border-y border-notebook-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-4xl lg:text-5xl text-notebook-ink-50 mb-4">
              How It Works in <span className="text-gradient">3 Simple Steps</span>
            </h2>
            <p className="text-lg text-notebook-blue-600">
              Get from blank page to completed assignment in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Upload Handwriting',
                description: 'Take a photo or upload a scan of one full page of your handwritten notes. Our AI analyzes letter shapes, spacing, slant, and natural variations.',
                icon: <PenTool className="w-8 h-8" />,
              },
              {
                step: '02',
                title: 'Enter Questions',
                description: 'Type your questions, paste from a document, or upload question papers. Select your subject, academic level, and desired answer length.',
                icon: <FileText className="w-8 h-8" />,
              },
              {
                step: '03',
                title: 'Generate & Download',
                description: 'Review the AI-generated answers in your handwriting preview. Make edits if needed, then download as PDF or DOCX with realistic notebook pages.',
                icon: <Download className="w-8 h-8" />,
              },
            ].map((item, index) => (
              <div key={item.step} className="relative animate-fade-in" style={{ animationDelay: `${index * 150}ms` }}>
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-notebook-blue-500 to-notebook-purple-600 flex items-center justify-center text-white shadow-lg">
                  {item.icon}
                </div>
                <div className="pt-20 text-center">
                  <div className="text-sm font-medium text-notebook-blue-500 mb-2">{item.step}</div>
                  <h3 className="font-heading text-xl text-notebook-ink-50 mb-3">{item.title}</h3>
                  <p className="text-notebook-blue-600">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-notebook-blue-300 to-notebook-purple-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading text-4xl lg:text-5xl text-notebook-ink-50 mb-4">
              Trusted by <span className="text-gradient">Students Worldwide</span>
            </h2>
            <p className="text-lg text-notebook-blue-600">
              Join thousands of students who have transformed their assignment workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={testimonial.name} variant="hover" padding="lg" className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <CheckCircle key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-notebook-blue-600 mb-6 italic">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-notebook-blue-500 to-notebook-purple-600 flex items-center justify-center text-white font-medium">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-notebook-ink-50">{testimonial.name}</p>
                    <p className="text-sm text-notebook-blue-500">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-notebook-blue-700 via-notebook-blue-900 to-notebook-purple-900 rounded-3xl mx-4 lg:mx-0 mt-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2036v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%206V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" />

        <div className="relative max-w-4xl mx-auto px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Ready to transform your assignments?</span>
          </div>

          <h2 className="font-heading text-4xl lg:text-5xl text-white mb-6">
            Start Creating Handwritten Assignments Today
          </h2>

          <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto">
            Join 50,000+ students who trust HandwriteAI for authentic, personalized handwritten assignments.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="xl" variant="secondary" asChild className="bg-white text-notebook-blue-600 hover:bg-white/90">
              <Link to="/register">
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild className="border-white text-white hover:bg-white/10">
              <Link to="/login">Sign In to Your Account</Link>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>14-Day Free Trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>Cancel Anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-notebook-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link to="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-notebook-blue-600 to-notebook-purple-600 flex items-center justify-center">
                  <PenTool className="w-5 h-5 text-white" />
                </div>
                <span className="font-heading text-xl text-notebook-blue-800">HandwriteAI</span>
              </Link>
              <p className="text-notebook-blue-500 text-sm">
                Create authentic handwritten assignments with AI-powered personalization.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-notebook-ink-50 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-notebook-blue-500">
                <li><Link to="/create-assignment" className="hover:text-notebook-blue-700">Create Assignment</Link></li>
                <li><Link to="/handwriting-profile" className="hover:text-notebook-blue-700">Handwriting Profile</Link></li>
                <li><Link to="/my-assignments" className="hover:text-notebook-blue-700">My Assignments</Link></li>
                <li><Link to="/assignment-preview" className="hover:text-notebook-blue-700">Preview & Export</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-notebook-ink-50 mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-notebook-blue-500">
                <li><Link to="/docs" className="hover:text-notebook-blue-700">Documentation</Link></li>
                <li><Link to="/api-docs" className="hover:text-notebook-blue-700">API Reference</Link></li>
                <li><Link to="/blog" className="hover:text-notebook-blue-700">Blog</Link></li>
                <li><Link to="/help" className="hover:text-notebook-blue-700">Help Center</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-notebook-ink-50 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-notebook-blue-500">
                <li><Link to="/about" className="hover:text-notebook-blue-700">About Us</Link></li>
                <li><Link to="/careers" className="hover:text-notebook-blue-700">Careers</Link></li>
                <li><Link to="/privacy" className="hover:text-notebook-blue-700">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-notebook-blue-700">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-notebook-blue-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-notebook-blue-500">
              © 2024 HandwriteAI. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-notebook-blue-500 hover:text-notebook-blue-700" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
              </a>
              <a href="#" className="text-notebook-blue-500 hover:text-notebook-blue-700" aria-label="GitHub">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" className="text-notebook-blue-500 hover:text-notebook-blue-700" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}