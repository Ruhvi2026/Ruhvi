// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import {
  beforeSendSentry,
  getSentryTracesSampleRate,
} from '@/lib/sentry-ignore';

Sentry.init({
  dsn: 'https://eecdeac600c80b3f7838f9f38c5d3192@o4511965411606528.ingest.de.sentry.io/4511965422288976',

  // Cost guard (Finding B2): 10% sampling in production or configured via SENTRY_TRACES_SAMPLE_RATE
  tracesSampleRate: getSentryTracesSampleRate(),

  beforeSend: beforeSendSentry,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});
