import mixpanel from 'mixpanel-browser';

export const trackUsage = (
  event: string,
  metadata?: { [key: string]: any }
) => {
  mixpanel.track(event, metadata);
};
