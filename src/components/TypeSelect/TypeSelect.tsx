import React, { useState, useEffect } from 'react';
import { Select, Popover } from 'antd';
import { Type, getAllTypes } from '../../modules/types';
import { canReadTypes } from '../../utils/PermissionsUtils';
import { useSelector } from '../../utils/ReduxUtils';

type Props = {
  onTypeSelected: (ids: number[]) => void;
  style?: React.CSSProperties;
  disabled?: boolean;
  multiple?: boolean;
  selectedTypeIds?: number[];
};

const TypeSelect = ({
  onTypeSelected,
  style = { width: '200px' },
  disabled = false,
  multiple = false,
  selectedTypeIds,
}: Props) => {
  const types = useSelector(getAllTypes);
  const [searchResults, setSearchResults] = useState([] as Type[]);
  const [currentSelection, setCurrentSelection] = useState([] as number[]);
  const [query, setQuery] = useState('');

  const setSelectedValue = (ids?: number | number[]) => {
    if (!ids) {
      setCurrentSelection([]);
    } else if (multiple) {
      setCurrentSelection(ids as number[]);
    } else {
      setCurrentSelection([ids as number]);
    }
    setQuery('');
  };

  useEffect(() => {
    const doSearch = async () => {
      setSearchResults(
        types.filter(
          el =>
            !query ||
            query.length === 0 ||
            el.name.toLowerCase().indexOf(query.toLowerCase()) > -1
        )
      );
    };
    doSearch();
  }, [query, types]);

  useEffect(() => {
    if (selectedTypeIds) {
      setCurrentSelection(selectedTypeIds);
    }
  }, [selectedTypeIds]);

  useEffect(() => {
    onTypeSelected(currentSelection);
  }, [currentSelection, onTypeSelected]);

  if (!canReadTypes(false)) {
    return (
      <Popover
        title="Missing TypesAcl.READ"
        content="Go to Console to enable access to TypesAcl.READ"
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
      placeholder="Search for an type"
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

export default TypeSelect;
