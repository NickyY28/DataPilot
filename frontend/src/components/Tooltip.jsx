import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

const Tooltip = ({ text, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-50 ${positions[position]}`}>
          <div className="bg-gray-900 text-white text-sm rounded-lg py-2 px-3 max-w-xs shadow-lg">
            {text}
            <div className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
              position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
              position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
              'left-[-4px] top-1/2 -translate-y-1/2'
            }`}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export const InfoTooltip = ({ text, position = 'top' }) => {
  return (
    <Tooltip text={text} position={position}>
      <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help inline-block" />
    </Tooltip>
  );
};

export default Tooltip;