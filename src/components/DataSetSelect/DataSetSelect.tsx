import React, { useState, useEffect } from 'react';
import { Select, Popover } from 'antd';
import { canReadDataSets } from 'utils/PermissionsUtils';
import { useSelector, useDispatch } from 'utils/ReduxUtils';
import { list, selectAllDataSets, DataSet } from 'modules/datasets';

type Props = {
  onDataSetSelected: (ids: number[]) => void;
  style?: React.CSSProperties;
  disabled?: boolean;
  multiple?: boolean;
  selectedDataSetIds?: number[];
};

const DataSetSelect = ({
  onDataSetSelected,
  style = { width: '200px' },
  disabled = false,
  multiple = false,
  selectedDataSetIds,
}: Props) => {
  const dispatch = useDispatch();
  const datasets = useSelector(selectAllDataSets);
  const [searchResults, setSearchResults] = useState([] as DataSet[]);
  const [currentSelection, setCurrentSelection] = useState([] as number[]);
  const [query, setQuery] = useState('');

  const setSelectedValue = (ids?: number | number[]) => {
    if (!ids) {
      setCurrentSelection([]);
      onDataSetSelected([]);
    } else if (multiple) {
      setCurrentSelection(ids as number[]);
      onDataSetSelected(ids as number[]);
    } else {
      setCurrentSelection([ids as number]);
      onDataSetSelected([ids as number]);
    }
    setQuery('');
  };

  useEffect(() => {
    setSearchResults(
      datasets.filter(
        el =>
          !query ||
          query.length === 0 ||
          el.name.toLowerCase().indexOf(query.toLowerCase()) > -1
      )
    );
  }, [query, datasets]);

  useEffect(() => {
    if (selectedDataSetIds) {
      setCurrentSelection(selectedDataSetIds);
    }
  }, [selectedDataSetIds]);

  useEffect(() => {
    dispatch(list());
  }, [dispatch]);

  if (!canReadDataSets(false)) {
    return (
      <Popover
        title="Missing DataSetAcl.READ"
        content="Go to Console to enable access to DataSetAcl.READ"
      >
        <Select style={style} disabled />
      </Popover>
    );
  }
  return (
    <Select
      showSearch
      style={style}
      disabled={disabled}
      mode={multiple ? 'multiple' : 'default'}
      placeholder="Search for an data set"
      value={multiple ? currentSelection : currentSelection[0]}
      onChange={(id: any) => {
        setSelectedValue(id);
      }}
      onSearch={setQuery}
      filterOption={false}
      allowClear
    >
      {searchResults.map(asset => (
        <Select.Option key={asset.id} value={asset.id}>
          <span>{asset.name}</span>
          <span style={{ color: '#ababab', marginLeft: '4px' }}>
            ({asset.id})
          </span>
        </Select.Option>
      ))}
    </Select>
  );
};

export default DataSetSelect;
