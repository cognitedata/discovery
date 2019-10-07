import * as mixpanelConfig from 'mixpanel-browser';
import { sdk } from '../index';

const mixpanel = mixpanelConfig.init(
  'fb25742efb56d116b736515a0ad5f6ef',
  {},
  'context'
);

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
