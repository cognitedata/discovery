import * as mixpanelConfig from 'mixpanel-browser';
import { sdk } from '../index';

const MIXPANEL_TOKEN = 'fb25742efb56d116b736515a0ad5f6ef';

const mixpanel = mixpanelConfig.init(MIXPANEL_TOKEN, {}, 'context');

export const trackUsage = (
  event: string,
  metadata?: { [key: string]: any }
) => {
  mixpanel.track(event, {
    ...metadata,
    project: sdk.project,
    version: 1,
    appVersion: process.env.REACT_APP_VERSION,
  });
};
export const trackSearchUsage = (
  location: string,
  type: 'ParentFilter' | 'Asset' | 'File' | 'Timeseries',
  metadata?: { [key: string]: any }
) => {
  if (window.location.host.indexOf('localhost') === -1) {
    mixpanel.track('Search', {
      ...metadata,
      project: sdk.project,
      location,
      type,
    });
  }
};
