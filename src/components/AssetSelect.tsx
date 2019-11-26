import React, { Component } from 'react';
import { Select, Spin } from 'antd';
import { Asset as CogniteAsset } from '@cognite/sdk';
import { sdk } from '../index';

type Props = {
  style: React.CSSProperties;
  onAssetSelected: (ids: number[]) => void;
  rootOnly: boolean;
  multiple: boolean;
};
type State = {
  fetching: boolean;
  searchResults: CogniteAsset[];
  rootSearchResults: CogniteAsset[];
  selectedIds: number[];
};
class AssetSelect extends Component<Props, State> {
  readonly state: Readonly<State> = {
    fetching: false,
    searchResults: [],
    rootSearchResults: [],
    selectedIds: [],
  };

  searchId = 0;

  public static defaultProps = {
    style: { width: '200px' },
    onAssetSelected: () => {},
    multiple: false,
    rootOnly: false,
  };

  componentDidMount() {
    this.doSearch('');
  }

  doSearch = async (query: string) => {
    const { rootOnly } = this.props;
    this.searchId += 1;
    const searchIndex = this.searchId;
    this.setState({ fetching: true });
    const [rootSearchResults, searchResults] = await Promise.all([
      sdk.post(`/api/v1/projects/${sdk.project}/assets/search`, {
        data: {
          search: { ...(query.length > 0 && { query }) },
          filter: {
            root: true,
          },
          limit: 100,
        },
      }),
      ...(!rootOnly
        ? [
            sdk.post(`/api/v1/projects/${sdk.project}/assets/search`, {
              data: {
                search: { ...(query.length > 0 && { query }) },
                limit: 100,
              },
            }),
          ]
        : []),
    ]);
    if (searchIndex === this.searchId) {
      this.setState({
        ...(!rootOnly
          ? {
              searchResults: searchResults.data.items.filter(
                (el: CogniteAsset) => el.rootId !== el.id
              ),
            }
          : { searchResults: [] }),
        rootSearchResults: rootSearchResults.data.items,
        fetching: false,
      });
    }
  };

  setSelectedValue = (ids?: number | number[]) => {
    if (!ids) {
      this.setState({ selectedIds: [] }, () =>
        this.props.onAssetSelected(this.state.selectedIds)
      );
    } else if (this.props.multiple) {
      this.setState({ selectedIds: ids as number[] }, () =>
        this.props.onAssetSelected(this.state.selectedIds)
      );
    } else {
      this.setState({ selectedIds: [ids as number] }, () =>
        this.props.onAssetSelected(this.state.selectedIds)
      );
    }
    this.doSearch('');
  };

  render() {
    const { style, multiple } = this.props;
    const {
      fetching,
      searchResults,
      rootSearchResults,
      selectedIds,
    } = this.state;
    return (
      <Select
        showSearch
        style={style}
        mode={multiple ? 'multiple' : 'default'}
        placeholder="Search for an asset"
        value={multiple ? selectedIds : selectedIds[0]}
        notFoundContent={fetching ? <Spin size="small" /> : null}
        onChange={(id: any) => {
          this.setSelectedValue(id);
        }}
        onSearch={this.doSearch}
        filterOption={false}
        allowClear
      >
        {rootSearchResults.length !== 0 && (
          <Select.OptGroup label="Root Assets" key="root">
            {rootSearchResults.map(asset => (
              <Select.Option key={asset.id} value={asset.id}>
                <span>{asset.name}</span>
                <span style={{ color: '#ababab', marginLeft: '4px' }}>
                  ({asset.id})
                </span>
              </Select.Option>
            ))}
          </Select.OptGroup>
        )}
        {searchResults.length !== 0 && (
          <Select.OptGroup label="All Assets" key="assets">
            {searchResults.map(asset => (
              <Select.Option key={asset.id} value={asset.id}>
                <span>{asset.name}</span>
                <span style={{ color: '#ababab', marginLeft: '4px' }}>
                  ({asset.id})
                </span>
              </Select.Option>
            ))}
          </Select.OptGroup>
        )}
      </Select>
    );
  }
}

export default AssetSelect;
