import React, { useState } from 'react';
import { useAuth } from '@clerk/react';
import { useTranslation } from '../context/LanguageContext';
import FeedbackModal from './FeedbackModal';

const FeedbackButton = () => {
  const { isSignedIn } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!isSignedIn) return null;

  return (
    <>
      <button
        className="feedback-fab"
        onClick={() => setOpen(true)}
        title={t('feedbackButton.tooltip')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
};

export default FeedbackButton;
