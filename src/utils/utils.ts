import { Asset, InternalId } from '@cognite/sdk';

export function sleep(timeout: number) {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

interface Generic {
  id: number | string;
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

export const isInternalId = (p: any): p is InternalId => !!p.id;

export const stripWhitespace = (text: string) => text.replace(/\s/g, '');
