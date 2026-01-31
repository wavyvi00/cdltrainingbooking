import { FloatingHeader } from '@/components/FloatingHeader';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Testimonials } from '@/components/landing/Testimonials';
import { GallerySection } from '@/components/landing/GallerySection';
import { Pricing } from '@/components/landing/Pricing';
import { Footer } from '@/components/landing/Footer';
import { getHeroStats } from '@/lib/landing';

export default async function Home() {
  const heroStats = await getHeroStats();

  return (
    <main className="min-h-screen relative overflow-x-hidden">


      {/* Floating Header (Hides on scroll) - Kept for UserMenu/Auth access */}
      <FloatingHeader />

      {/* Main Scrollable Content */}
      <div className="relative z-10 space-y-24 md:space-y-32 pb-0">
        <Hero stats={heroStats} />
        <Features />
        <Testimonials />
        <GallerySection />
        <Pricing />
        <Footer />
      </div>
    </main>
  );
}
