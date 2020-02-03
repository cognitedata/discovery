import React, { Component } from 'react';
import { Select, Spin } from 'antd';
import { Asset as CogniteAsset, AssetSearchFilter } from '@cognite/sdk';
import { sdk } from 'modules/app';

type Props = {
  style: React.CSSProperties;
  onAssetSelected: (ids: number[]) => void;
  rootOnly: boolean;
  disabled: boolean;
  multiple: boolean;
  selectedAssetIds?: number[];
  filter: AssetSearchFilter;
};
type State = {
  fetching: boolean;
  searchResults: CogniteAsset[];
  rootSearchResults: CogniteAsset[];
  selectedIds: number[];
};
class AssetSelect extends Component<Props, State> {
  searchId = 0;

  public static defaultProps = {
    style: { width: '200px' },
    onAssetSelected: () => {},
    multiple: false,
    rootOnly: false,
    disabled: false,
    filter: {},
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      fetching: false,
      searchResults: [],
      rootSearchResults: [],
      selectedIds: props.selectedAssetIds || [],
    };
  }

  componentDidMount() {
    this.doSearch('');
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.selectedAssetIds &&
      prevProps.selectedAssetIds !== this.props.selectedAssetIds
    ) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ selectedIds: this.props.selectedAssetIds });
    }
    if (this.props.filter !== prevProps.filter) {
      this.doSearch('');
    }
  }

  doSearch = async (query: string) => {
    const { rootOnly } = this.props;
    this.searchId += 1;
    const searchIndex = this.searchId;
    this.setState({ fetching: true });
    const [rootSearchResults, searchResults] = await Promise.all([
      sdk.assets.search({
        ...this.props.filter,
        search: { ...(query.length > 0 && { query }) },
        filter: {
          ...this.props.filter.filter,
          root: true,
        },
        limit: 100,
      }),
      ...(!rootOnly
        ? [
            sdk.assets.search({
              ...this.props.filter,
              search: { ...(query.length > 0 && { query }) },
              limit: 100,
            }),
          ]
        : []),
    ]);
    if (searchIndex === this.searchId) {
      this.setState({
        ...(!rootOnly
          ? {
              searchResults: searchResults.filter(
                (el: CogniteAsset) => el.rootId !== el.id
              ),
            }
          : { searchResults: [] }),
        rootSearchResults,
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
    const { style, multiple, disabled } = this.props;
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
        disabled={disabled}
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
