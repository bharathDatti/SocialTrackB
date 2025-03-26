import React from 'react';
import { Construction } from 'lucide-react';

const UnderConstruction = ({ title }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <Construction className="w-16 h-16 text-primary-600 mb-4" />
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-600">This feature is coming soon!</p>
    </div>
  );
};

export default UnderConstruction;