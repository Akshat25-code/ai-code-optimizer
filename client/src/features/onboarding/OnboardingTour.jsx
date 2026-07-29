import React, { useState, useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';

export default function OnboardingTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Only run once per user
    const hasRunTour = localStorage.getItem('has_run_tour');
    if (!hasRunTour) {
      // Small delay so the UI fully loads
      setTimeout(() => setRun(true), 1500);
    }
  }, []);

  const steps = [
    {
      target: '.tour-step-1-code',
      content: 'Welcome! This is where you paste or write your code.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.tour-step-2-config',
      content: 'Select the AI Provider and define your optimization focus (e.g., Performance vs Readability).',
      placement: 'left',
    },
    {
      target: '.tour-step-3-run',
      content: 'Click here to let the AI analyze and optimize your code!',
      placement: 'top',
    },
    {
      target: '.tour-step-4-share',
      content: 'Once you are happy, click Share to generate a secure, read-only link for your team.',
      placement: 'bottom',
    },
  ];

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem('has_run_tour', 'true');
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: '#1e293b',
          backgroundColor: '#1e293b',
          overlayColor: 'rgba(0, 0, 0, 0.7)',
          primaryColor: '#14b8a6', // teal-500
          textColor: '#f8fafc',
          width: 400,
          zIndex: 1000,
        },
        buttonClose: { display: 'none' },
        buttonNext: { outline: 'none' },
        buttonBack: { color: '#94a3b8' },
      }}
    />
  );
}

