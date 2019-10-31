import React, { Component } from 'react';
import { Select, Spin } from 'antd';
import { Asset as CogniteAsset } from '@cognite/sdk';
import { sdk } from '../index';

type Props = {
  style: React.CSSProperties;
  onAssetSelected: (id: number) => void;
  rootOnly: boolean;
};
type State = {
  fetching: boolean;
  searchResults: CogniteAsset[];
  rootSearchResults: CogniteAsset[];
  selectedId?: number;
};
class AssetSelect extends Component<Props, State> {
  readonly state: Readonly<State> = {
    fetching: false,
    searchResults: [],
    rootSearchResults: [],
    selectedId: undefined,
  };

  searchId = 0;

  public static defaultProps = {
    style: { width: '200px' },
    onAssetSelected: () => {},
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
      sdk.post(`/api/playground/projects/${sdk.project}/assets/search`, {
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
            sdk.post(`/api/playground/projects/${sdk.project}/assets/search`, {
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

  setSelectedValue = (id: number) => {
    this.setState({ selectedId: id });
    this.props.onAssetSelected(id);
  };

  render() {
    const { style } = this.props;
    const {
      fetching,
      searchResults,
      rootSearchResults,
      selectedId,
    } = this.state;
    return (
      <Select
        showSearch
        style={style}
        placeholder="Search for an asset"
        value={selectedId}
        notFoundContent={fetching ? <Spin size="small" /> : null}
        onSelect={(id: any) => this.setSelectedValue(id)}
        onChange={(id: any) => {
          if (!id) {
            this.setSelectedValue(id);
          }
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
