import * as mixpanelConfig from 'mixpanel-browser';
import { sdk } from '../index';
import { PRIVACY_ACCEPT } from '../components/PrivacyDisclaimer';
import { PERMISSIONS } from '../modules/app';

const MIXPANEL_TOKEN = 'fb25742efb56d116b736515a0ad5f6ef';

const mixpanel = mixpanelConfig.init(MIXPANEL_TOKEN, {}, 'context');

export const trackUsage = (
  event: string,
  metadata?: { [key: string]: any }
) => {
  if (
    window.location.host.indexOf('localhost') === -1 &&
    localStorage.getItem(PRIVACY_ACCEPT) === 'true'
  ) {
    mixpanel.track(event, {
      ...metadata,
      project: sdk.project,
      version: 1,
      appVersion: process.env.REACT_APP_VERSION,
      location: window.location.pathname,
      user: PERMISSIONS.email ? PERMISSIONS.email[0] : undefined,
    });
  }
};
