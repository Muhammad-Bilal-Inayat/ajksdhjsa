import React from 'react';
import { Layers } from 'lucide-react';
import { AnimatedFeatureCards } from './AnimatedFeatureCards';

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
          <Layers className="w-3.5 h-3.5" />
          <span>Complete Architecture</span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
          BUILT FOR PHARMACIES THAT CAN NEVER STOP
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Every module engineered to prevent theft, eliminate expired medicine losses, and bill customers with zero delay.
        </p>
      </div>

      <AnimatedFeatureCards />
    </section>
  );
};

export default FeaturesSection;
