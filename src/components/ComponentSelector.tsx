import React from 'react';
import { Select } from 'antd';
import { ViewerTypeMap, ViewerType } from '../containers/AssetViewer';

export const ViewerTypeCategory: { [key in ViewerType]: string } = {
  none: 'None',
  threed: '3D',
  pnid: 'Deprecated',
  vx: 'Asset',
  network: 'Asset',
  relationship: 'Beta',
  file: 'Files',
  assetbreadcrumbs: 'Asset',
};

const ComponentSelector = ({
  onComponentChange,
}: {
  onComponentChange: (viewType: ViewerType) => void;
}) => {
  const views = Object.keys(ViewerTypeMap).reduce(
    (prev: { [key: string]: ViewerType[] }, key: string) => {
      const viewKey = key as ViewerType;
      if (!prev[ViewerTypeCategory[viewKey]]) {
        // eslint-disable-next-line no-param-reassign
        prev[ViewerTypeCategory[viewKey]] = [];
      }
      prev[ViewerTypeCategory[viewKey]].push(viewKey);
      return prev;
    },
    {} as { [key: string]: ViewerType[] }
  );
  return (
    <>
      <h3>Select a Component</h3>
      <Select
        style={{ width: '100%' }}
        placeholder="Choose a View"
        onChange={onComponentChange}
      >
        {Object.keys(views)
          .sort()
          .map(key => (
            <Select.OptGroup label={key} key={key}>
              {views[key].map(viewType => (
                <Select.Option key={viewType} value={viewType}>
                  {`${ViewerTypeMap[viewType as ViewerType]}`}
                </Select.Option>
              ))}
            </Select.OptGroup>
          ))}
      </Select>
    </>
  );
};
export default ComponentSelector;
