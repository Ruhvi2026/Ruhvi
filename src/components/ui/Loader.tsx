'use client';
import React, { useEffect, useState } from 'react';
import styles from './Loader.module.css';

const MESSAGES = [
  'Submitting data…',
  'Verifying request…',
  'Connecting to server…',
  'Processing response…',
  'Finalising…',
];

export default function Loader() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [loaderType, setLoaderType] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Choose a random loader between 1 and 5
    const chosen = Math.floor(Math.random() * 5) + 1;
    setLoaderType(chosen);
  }, []);

  const renderLoaderGraphic = () => {
    switch (loaderType) {
      case 1:
        return <div className={styles.loader1} />;
      case 2:
        return <div className={styles.loader2} />;
      case 3:
        return <div className={styles.loader3} />;
      case 4:
        return <div className={styles.loader4} />;
      case 5:
        return <div className={styles.loader5} />;
      default:
        return <div className={styles.spinner} />;
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div
          style={{
            height: '75px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {renderLoaderGraphic()}
        </div>
        <p className={styles.message}>{MESSAGES[msgIndex]}</p>
      </div>
    </div>
  );
}
