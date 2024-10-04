import { useMemo } from 'react';
import Shepherd from 'shepherd.js';

export const useShepherd = () => {
    const tourOptions = {
        useModalOverlay: true,
        defaultStepOptions: {
            classes: 'shadow-md bg-purple-dark',
            scrollTo: true
        }
    };

    const tourObject = useMemo(() => {
        const tour = new Shepherd.Tour(tourOptions);

        const steps = [
            {
                id: 'intro',
                text: 'Welcome to the app! This is where you manage your workspaces.',
                attachTo: {
                    element: '.step-one',
                    on: 'right'
                },
                buttons: [
                    {
                        text: 'Next',
                        action: tour.next
                    }
                ]
            },
            {
                id: 'resources',
                text: 'You can manage your teams, costs and other resources here.',
                attachTo: {
                    element: '.step-two',
                    on: 'right'
                },
                buttons: [
                    {
                        text: 'Back',
                        action: tour.back
                    },
                    {
                        text: 'Next',
                        action: tour.next
                    }
                ]
            },
            {
                id: 'settings',
                text: 'All other account settings are managed here.',
                attachTo: {
                    element: '.step-three',
                    on: 'right'
                },
                classes: 'steps',
                buttons: [
                    {
                        text: 'Back',
                        action: tour.back
                    },
                    {
                        text: 'Next',
                        action: tour.next
                    }
                ]
            },
            {
              id: 'workspaces',
              text: 'Workspaces contain your data and give you a place to organize and explore. You can upload your data, add collaborators, and create workflows here. If you want to get started right away, click on the Default Workspace.',
              attachTo: {
                  element: '.step-four',
                  on: 'right'
              },
              classes: 'steps',
              buttons: [
                  {
                      text: 'Back',
                      action: tour.back
                  },
                  {
                      text: 'Next',
                      action: tour.next
                  }
              ]
          },
          {
            id: 'new-workspace',
            text: 'You can create a new workspace for new data or different collaborators here.',
            attachTo: {
                element: '.step-five',
                on: 'right'
            },
            classes: 'steps',
            buttons: [
                {
                    text: 'Back',
                    action: tour.back
                },
                {
                    text: 'Next',
                    action: tour.next
                }
            ]
        },
          
            
            {
                id: 'end',
                text: 'Click on one of your workspaces to start!',
                buttons: [
                    {
                        text: 'Finish',
                        action: tour.complete
                    }
                ]
            }
        ];

        tour.addSteps(steps);

        return tour;
    }, []);

    return tourObject;
};
