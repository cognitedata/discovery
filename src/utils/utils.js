export function sleep(timeout) {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

export function arrayToObjectById(array) {
  return array.reduce((obj, item) => {
    obj[item.id] = item;
    return obj;
  }, {});
}

export function createAssetTitle(asset) {
  let assetTitle = asset.name ? asset.name : asset.id;
  if (asset.metadata) {
    const areaKey = Object.keys(asset.metadata).filter(
      key => key.toUpperCase() === 'AREA'
    );
    if (areaKey.length > 0) {
      assetTitle += ` (${asset.metadata[areaKey]})`;
    }
  }

  return assetTitle;
}
