import React from 'react';
import { Select } from 'antd';
import {
  AssetViewerType,
  AssetViewerTypeMap,
} from '../containers/AssetPage/AssetCustomSectionView';

const ComponentSelector = ({
  onComponentChange,
}: {
  onComponentChange: (viewType: AssetViewerType) => void;
}) => {
  return (
    <>
      <h3>Select a Component</h3>
      <Select
        style={{ width: '100%' }}
        placeholder="Choose a View"
        onChange={onComponentChange}
      >
        {Object.keys(AssetViewerTypeMap)
          .filter(el => !!el)
          .sort()
          .map(key => (
            <Select.Option key={key} value={key}>
              {AssetViewerTypeMap[key as AssetViewerType]}
            </Select.Option>
          ))}
      </Select>
    </>
  );
};
export default ComponentSelector;
