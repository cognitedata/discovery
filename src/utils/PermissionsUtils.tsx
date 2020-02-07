import React from 'react';
import { notification } from 'antd';
import { sdk } from 'utils/SDK';
import store from '../store/index';
import { AppState } from '../modules/app';

const SHOW_INITIAL_MESSAGE = 'shownMissingGroup';

// TODO: We can change this to be a selector
export const checkForAccessPermission = (
  key: string,
  type: string,
  showMessage = false
) => {
  const { groups } = store.getState().app as AppState;
  if (groups.groupsAcl) {
    if (!groups[key] || !groups[key].includes(type)) {
      if (showMessage) {
        notification.error({
          message: `You are missing access ${key}:${type}`,
          description: (
            <p>
              Go to{' '}
              <a
                href={`https://console.cognitedata.com/${sdk.project}/iam`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Console
              </a>{' '}
              and set up any missing permissions or contact your administrator!
            </p>
          ),
        });
      }
      return false;
    }
    return true;
  }
  if (showMessage) {
    if (sessionStorage.getItem(SHOW_INITIAL_MESSAGE) === null) {
      notification.error({
        key: 'group-acl-warning',
        message: `You are missing access to Group:ACL to read permissions`,
        description: (
          <p>
            Go to{' '}
            <a
              href={`https://console.cognitedata.com/${sdk.project}/iam`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Console
            </a>{' '}
            and set up any missing permissions or contact your administrator!
          </p>
        ),
      });
      sessionStorage.setItem(SHOW_INITIAL_MESSAGE, 'true');
    }
    // eslint-disable-next-line no-console
    console.warn(`You are missing access to Group:ACL to read permissions`);
  }
  return true;
};

// Assets
export const canReadAssets = (showMessage = true) => {
  return checkForAccessPermission('assetsAcl', 'READ', showMessage);
};
export const canEditAssets = (showMessage = true) => {
  return checkForAccessPermission('assetsAcl', 'WRITE', showMessage);
};

// Files
export const canReadFiles = (showMessage = true) => {
  return checkForAccessPermission('filesAcl', 'READ', showMessage);
};

export const canEditFiles = (showMessage = true) => {
  return checkForAccessPermission('filesAcl', 'WRITE', showMessage);
};

// Events
export const canReadEvents = (showMessage = true) => {
  return checkForAccessPermission('eventsAcl', 'READ', showMessage);
};

export const canEditEvents = (showMessage = true) => {
  return checkForAccessPermission('eventsAcl', 'WRITE', showMessage);
};

// Timeseries
export const canReadTimeseries = (showMessage = true) => {
  return checkForAccessPermission('timeSeriesAcl', 'READ', showMessage);
};

export const canEditTimeseries = (showMessage = true) => {
  return checkForAccessPermission('timeSeriesAcl', 'WRITE', showMessage);
};

// ThreeD
export const canReadThreeD = (showMessage = true) => {
  return checkForAccessPermission('threedAcl', 'READ', showMessage);
};
export const canEditThreeD = (showMessage = true) => {
  return checkForAccessPermission('threedAcl', 'UPDATE', showMessage);
};
export const canDeleteThreeD = (showMessage = true) => {
  return checkForAccessPermission('threedAcl', 'DELETE', showMessage);
};

// Relationships
export const canReadRelationships = (showMessage = true) => {
  return checkForAccessPermission('relationshipsAcl', 'READ', showMessage);
};

export const canEditRelationships = (showMessage = true) => {
  return checkForAccessPermission('relationshipsAcl', 'WRITE', showMessage);
};

// Types
export const canReadTypes = (showMessage = true) => {
  return checkForAccessPermission('typesAcl', 'READ', showMessage);
};

export const canEditTypes = (showMessage = true) => {
  return checkForAccessPermission('typesAcl', 'WRITE', showMessage);
};
