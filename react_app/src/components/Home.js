import React, { useEffect, useState } from 'react';
import Layout from './Layout';
import './Home.css';

function Home() {
  const [currentWord, setCurrentWord] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Create initial event queue with timestamps
    const now = Date.now();
    let time = now;
    const initialEvents = [
      // First cycle - slow
      { type: 'WORD', word: 'RECORD', time: time += 1000 },
      { type: 'WORD', word: 'CLIP', time: time += 1000 },
      { type: 'WORD', word: 'WATCH', time: time += 1000 },
      { type: 'WORD', word: 'ANALYZE', time: time += 1000 },
      { type: 'WORD', word: 'STRATEGIZE', time: time += 1000 },
      { type: 'WORD', word: 'DOMINATE', time: time += 1500 },
      
      // Second cycle - faster
      { type: 'WORD', word: 'RECORD', time: time += 500 },
      { type: 'WORD', word: 'CLIP', time: time += 500 },
      { type: 'WORD', word: 'WATCH', time: time += 500 },
      { type: 'WORD', word: 'ANALYZE', time: time += 500 },
      { type: 'WORD', word: 'STRATEGIZE', time: time += 500 },
      { type: 'WORD', word: 'DOMINATE', time: time += 1500 },
      
      // Third cycle - fastest
      { type: 'WORD', word: 'RECORD', time: time += 250 },
      { type: 'WORD', word: 'CLIP', time: time += 250 },
      { type: 'WORD', word: 'WATCH', time: time += 250 },
      { type: 'WORD', word: 'ANALYZE', time: time += 250 },
      { type: 'WORD', word: 'STRATEGIZE', time: time += 250 },
      { type: 'WORD', word: 'DOMINATE', time: time += 1500 },
      
      // Final
      { type: 'WORD', word: 'DOMINATE', time: time += 1500, isFinal: true },
      { type: 'WELCOME', time: time += 1500 }
    ];

    setEvents(initialEvents);

    // Start the event loop
    const intervalId = setInterval(() => {
      const currentTime = Date.now();
      
      setEvents(prevEvents => {
        // Find all events that should have happened by now
        const [dueEvents, remainingEvents] = prevEvents.reduce(
          ([due, remaining], event) => {
            return event.time <= currentTime
              ? [[...due, event], remaining]
              : [due, [...remaining, event]];
          },
          [[], []]
        );

        // Process due events
        dueEvents.forEach(event => {
          if (event.type === 'WORD') {
            setCurrentWord(prev => ({
              text: event.word,
              isFinal: event.isFinal
            }));
          } else if (event.type === 'WELCOME') {
            setShowWelcome(true);
          }
        });

        // Return remaining events
        return remainingEvents;
      });
    }, 100);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <Layout>
      <div className="space-container">
        <div className="word-container">
          {currentWord && (
            currentWord.text === 'DOMINATE' ? (
              <div className={currentWord.isFinal ? "dominate-text-final" : "dominate-text"}>
                {currentWord.text}
              </div>
            ) : (
              <div className="fade-text">{currentWord.text}</div>
            )
          )}
          {showWelcome && (
            <div className="welcome-text">Welcome to Goalty Remotion</div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Home;
