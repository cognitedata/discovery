import mixpanel from 'mixpanel-browser';
import { sdk } from '../index';

export const trackUsage = (
  event: string,
  metadata?: { [key: string]: any }
) => {
  mixpanel.track(event, { ...metadata, project: sdk.project });
};
export const trackSearchUsage = (
  location: string,
  type: 'ParentFilter' | 'Asset' | 'File',
  metadata?: { [key: string]: any }
) => {
  mixpanel.track('Search', {
    ...metadata,
    project: sdk.project,
    location,
    type,
  });
};
