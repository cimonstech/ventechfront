'use client';

import React from 'react';
import Image from 'next/image';
import { 
  Target, 
  TrendingUp,
  Users,
  GraduationCap,
  Briefcase,
  Lightbulb,
  Laptop
} from 'lucide-react';

export function AboutContent() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="about-hero-section relative bg-gradient-to-b from-[#FF7A19] via-[#FF8C3A] to-[#D2691E] text-white py-20 md:py-28 overflow-hidden">
        {/* Background Image Overlay */}
        <div className="absolute inset-0">
          <Image
            src="/affiliatepageimage.webp"
            alt="About VENTECH"
            fill
            className="object-cover opacity-30"
            priority
            sizes="100vw"
          />
          {/* Gradient Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#FF7A19]/90 via-[#FF8C3A]/85 to-[#D2691E]/90"></div>
        </div>
        {/* Texture Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Heading */}
            <h1 
              className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold mb-6 tracking-wide uppercase drop-shadow-lg"
              style={{ color: '#ffffff !important' }}
            >
              ABOUT VENTECH
            </h1>
            
            {/* Tagline - Large, Bold White Text with proper spacing */}
            <div className="space-y-2 md:space-y-3 mb-6">
              <p 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight drop-shadow-lg"
                style={{ color: '#ffffff !important' }}
              >
                Trusted Technology.
              </p>
              <p 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight drop-shadow-lg"
                style={{ color: '#ffffff !important' }}
              >
                Built for Performance.
              </p>
              <p 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight drop-shadow-lg"
                style={{ color: '#ffffff !important' }}
              >
                Priced for Access.
              </p>
            </div>
            
            {/* Description Paragraph */}
            <p 
              className="text-base sm:text-lg md:text-xl leading-relaxed max-w-3xl mx-auto font-light mb-8 drop-shadow-md"
              style={{ color: '#ffffff !important' }}
            >
              VENTECH Gadgets is a Ghana-based technology brand delivering high-quality laptops and gadgets engineered for work, learning, and innovation.
            </p>
          </div>
        </div>
      </section>

      {/* Intro Section with Image and Text */}
      <section className="container mx-auto px-4 py-12 md:py-16 bg-white rounded-t-3xl -mt-10 md:-mt-16 relative z-20">
        <div className="max-w-4xl mx-auto">
          {/* Mobile: Side by side */}
          <div className="grid md:grid-cols-1 gap-8 md:gap-12">
            {/* Image - Centered on desktop */}
            <div className="relative w-full h-64 md:h-96 mx-auto max-w-2xl rounded-xl overflow-hidden bg-gradient-to-br from-orange-50 to-gray-50">
              <Image
                src="/aboutlaptop.jpeg"
                alt="VENTECH Products"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 80vw"
                priority
              />
            </div>
            
            {/* Text Content - Left aligned on mobile, centered on desktop */}
            <div className="text-left md:text-center">
              <p className="text-[#3A3A3A] text-sm md:text-base leading-relaxed max-w-2xl md:mx-auto">
                <strong className="text-[#1A1A1A]">VENTECH Gadgets</strong> is a modern technology brand focused on making quality laptops and gadgets accessible in Ghana. We provide reliable, high-performance devices for learning, work, and innovation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* OUR MISSION Section */}
      <section className="bg-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-4 md:gap-6">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <Target className="text-[#FF7A19]" size={24} />
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 mb-3">
                  <span className="text-[#FF7A19] font-bold text-sm md:text-base uppercase">OUR MISSION</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-4">
                  Technology for Everyone
                </h2>
                <p className="text-[#3A3A3A] text-sm md:text-base leading-relaxed">
                  At VENTECH, we believe that everyone deserves access to quality technology. We&apos;re committed to removing barriers to technology by offering authentic, high-quality laptops and gadgets at competitive prices, backed by honest service and dependable support.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OUR VISION Section */}
      <section className="bg-gray-50 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-4 md:gap-6">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="text-[#FF7A19]" size={24} />
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 mb-3">
                  <span className="text-[#FF7A19] font-bold text-sm md:text-base uppercase">OUR VISION</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-4">
                  Powering Ghana&apos;s Digital Future
                </h2>
                <p className="text-[#3A3A3A] text-sm md:text-base leading-relaxed">
                  We envision a Ghana where students, professionals, and innovators have easy access to the tools they need to compete, create, and lead in the digital economy. Through quality products and exceptional service, we&apos;re building a foundation for technological advancement across the nation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO WE SERVE Section */}
      <section className="bg-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-[#FF7A19] font-bold text-lg md:text-xl uppercase mb-6">WHO WE SERVE</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <Briefcase className="text-[#FF7A19]" size={20} />
                  <span className="text-[#1A1A1A] text-base md:text-lg">Professionals</span>
                </div>
                <div className="flex items-center gap-3">
                  <GraduationCap className="text-[#FF7A19]" size={20} />
                  <span className="text-[#1A1A1A] text-base md:text-lg">Students</span>
                </div>
                <div className="flex items-center gap-3">
                  <Lightbulb className="text-[#FF7A19]" size={20} />
                  <span className="text-[#1A1A1A] text-base md:text-lg">Entrepreneurs</span>
                </div>
                <div className="flex items-center gap-3">
                  <Laptop className="text-[#FF7A19]" size={20} />
                  <span className="text-[#1A1A1A] text-base md:text-lg">Tech Enthusiasts</span>
                </div>
              </div>
              
              <p className="text-[#1A1A1A] text-base md:text-lg font-medium">
                Serious about growth? VENTECH is built for you.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

