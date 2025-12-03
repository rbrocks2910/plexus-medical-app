/**
 * @file LoadingOverlay.tsx
 * @description Defines a full-screen loading overlay component.
 * This is a crucial UI element for providing feedback to the user during long-running asynchronous operations,
 * such as generating a new case or analyzing feedback. It prevents the user from interacting with the app
 * while a background process is running and reassures them that the application is still working.
 */
import React, { useState, useEffect } from 'react';

// Defines the props required by the component.
interface LoadingOverlayProps {
  title: string; // The main heading for the loading screen (e.g., "Generating Case").
  messages: string[]; // An array of tips or quotes to cycle through.
}

// A purely decorative SVG component that creates a moving ECG wave background.
// This enhances the visual appeal of the loading screen and reinforces the medical theme.
const EcgWave: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 40">
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      // This path creates a repeating ECG-like pattern.
      d="M0 20h20l5-10 5 15 5-10 5 10h155"
    />
  </svg>
);


export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ title, messages = [] }) => {
  // State to track the index of the currently displayed message.
  const [messageIndex, setMessageIndex] = useState(0);

  // This effect hook manages the cycling of messages.
  // It's a key UX feature that makes waiting less tedious by providing engaging or informative content.
  useEffect(() => {
    // No need to cycle if there's only one or zero messages.
    if (messages.length <= 1) return;

    // Start with a random message so the user doesn't always see the same one first.
    setMessageIndex(Math.floor(Math.random() * messages.length));

    // Set up an interval to change the message every 8 seconds.
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => {
        let newIndex;
        // This loop ensures that the next message is always different from the current one.
        do {
          newIndex = Math.floor(Math.random() * messages.length);
        } while (newIndex === prevIndex);
        return newIndex;
      });
    }, 8000); // A slower interval is used for better readability and a calmer feel.

    // Cleanup function to clear the interval when the component unmounts, preventing memory leaks.
    return () => clearInterval(interval);
  }, [messages]);

  // Determine the current message to display.
  const currentMessage = messages.length > 0 ? messages[messageIndex] : "Loading...";

  return (
    // The main overlay container, which covers the entire screen.
    // It uses a semi-transparent, blurred background to obscure the content underneath.
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-50 animate-fade-in">
        {/* Container for the animated background effect. */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute top-1/2 -translate-y-1/2 w-[200%] h-24">
                {/* The ECG wave is animated to scroll horizontally, creating a continuous "heartbeat" effect. */}
                <EcgWave className="w-full h-full text-green-500/30 animate-wave"/>
            </div>
        </div>
        {/* Container for the main text content, kept in the foreground. */}
        <div className="relative text-center">
            <h2 className="text-3xl font-bold text-white mb-4 animate-text-fade">{title}</h2>
            {/* This div ensures a fixed height for the message area, preventing layout shifts as messages with different lengths are displayed. */}
            <div className="mt-6 h-12 flex items-center justify-center">
              {/* The key prop is used here to force a re-render of the <p> tag when the message changes, which re-triggers the text-fade animation. */}
              <p key={messageIndex} className="text-slate-300 animate-text-fade text-lg max-w-lg">
                {currentMessage}
              </p>
            </div>
        </div>
    </div>
  );
};