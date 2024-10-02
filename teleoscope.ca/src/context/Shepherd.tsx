import React, { createContext, useContext, useState, ReactNode } from 'react';
import Shepherd from 'shepherd.js';

// Shepherd context
interface ShepherdContextType {
  startTour: () => void;
  cancelTour: () => void;
}

const ShepherdContext = createContext<ShepherdContextType | undefined>(undefined);

interface ShepherdProviderProps {
  children: ReactNode;  // Correct typing for children
}

const ShepherdProvider: React.FC<ShepherdProviderProps> = ({ children }) => {
  const [tour, setTour] = useState<Shepherd.Tour | null>(null);

  const steps = [
    {
      id: 'intro',
      text: 'Welcome to the app! This is your first stop.',
      attachTo: {
        element: '.step-one',
        on: 'right'
      },
      buttons: [
        {
          text: 'Next',
          action: tour?.next
        }
      ]
    },
    {
      id: 'feature',
      text: 'This is an important feature to know.',
      attachTo: {
        element: '.step-two',
        on: 'left'
      },
      buttons: [
        {
          text: 'Back',
          action: tour?.back
        },
        {
          text: 'Next',
          action: tour?.next
        }
      ]
    },
    {
      id: 'end',
      text: 'And that’s it! Thanks for taking the tour.',
      buttons: [
        {
          text: 'Finish',
          action: tour?.complete
        }
      ]
    }
  ];

  const initializeTour = () => {
    const shepherdTour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: {
          enabled: true
        },
        classes: 'shepherd-theme-arrows',
        scrollTo: { behavior: 'smooth', block: 'center' }
      }
    });
    shepherdTour.addSteps(steps);
    setTour(shepherdTour);
  };

  const startTour = () => {
    if (!tour) {
      initializeTour();
    }
    tour?.start();
  };

  const cancelTour = () => {
    tour?.cancel();
  };

  return (
    <ShepherdContext.Provider value={{ startTour, cancelTour }}>
      {children}
    </ShepherdContext.Provider>
  );
};

// Custom hook for using the Shepherd context
export const useShepherd = () => {
  const context = useContext(ShepherdContext);
  if (!context) {
    throw new Error('useShepherd must be used within a ShepherdProvider');
  }
  return context;
};

export default ShepherdProvider;
