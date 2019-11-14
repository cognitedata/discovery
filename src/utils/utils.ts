import { Asset } from '@cognite/sdk';
import { message } from 'antd';

export function sleep(timeout: number) {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

interface Generic {
  id: number;
}

export function arrayToObjectById<T extends Generic>(
  array: T[]
): { [key: string]: T } {
  return array.reduce((obj: { [key: string]: T }, item: T) => {
    // eslint-disable-next-line no-param-reassign
    obj[item.id] = item;
    return obj;
  }, {});
}

export function createAssetTitle(asset: Asset) {
  let assetTitle: string = asset.name ? asset.name : `${asset.id}`;
  if (asset.metadata) {
    const areaKey = Object.keys(asset.metadata).filter(
      key => key.toUpperCase() === 'AREA'
    );
    if (areaKey.length > 0) {
      assetTitle += ` (${asset.metadata[areaKey[0]]})`;
    }
  }

  return assetTitle;
}

export const checkForAccessPermission = (
  groups: { [key: string]: string[] },
  key: string,
  type: string,
  showMessage = false
) => {
  if (groups.groupsAcl) {
    if (!groups[key] || !groups[key].includes(type)) {
      if (showMessage) {
        message.error(`You are missing access ${key}:${type}`);
      }
      return false;
    }
  }
  return true;
};
