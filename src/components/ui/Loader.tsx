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

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.spinner} />
        <p className={styles.message}>{MESSAGES[msgIndex]}</p>
      </div>
    </div>
  );
}
