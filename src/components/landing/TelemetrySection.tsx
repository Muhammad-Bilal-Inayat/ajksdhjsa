import React from 'react';
import { AnimatedHeroGraphs } from './AnimatedHeroGraphs';

export const TelemetrySection: React.FC = () => {
  return (
    <section id="telemetry" className="py-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimatedHeroGraphs />
    </section>
  );
};

export default TelemetrySection;
