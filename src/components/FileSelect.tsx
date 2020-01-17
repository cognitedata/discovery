import React, { Component } from 'react';
import { Select, Spin } from 'antd';
import { FilesSearchFilter, FilesMetadata } from '@cognite/sdk';
import { sdk } from '../index';

type Props = {
  style: React.CSSProperties;
  onFileSelected: (ids: number[]) => void;
  disabled: boolean;
  multiple: boolean;
  selectedFileIds?: number[];
  filter: FilesSearchFilter;
};
type State = {
  fetching: boolean;
  searchResults: FilesMetadata[];
  selectedIds: number[];
};
class FileSelect extends Component<Props, State> {
  searchId = 0;

  public static defaultProps = {
    style: { width: '200px' },
    onFileSelected: () => {},
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
      selectedIds: props.selectedFileIds || [],
    };
  }

  componentDidMount() {
    this.doSearch('');
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.selectedFileIds &&
      prevProps.selectedFileIds !== this.props.selectedFileIds
    ) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ selectedIds: this.props.selectedFileIds });
    }
    if (this.props.filter !== prevProps.filter) {
      this.doSearch('');
    }
  }

  doSearch = async (query: string) => {
    this.searchId += 1;
    const searchIndex = this.searchId;
    this.setState({ fetching: true });
    const searchResults = await sdk.files.search({
      ...this.props.filter,
      search: { ...(query.length > 0 && { name: query }) },
      filter: {
        ...this.props.filter.filter,
      },
      limit: 100,
    });
    if (searchIndex === this.searchId) {
      this.setState({
        searchResults,
        fetching: false,
      });
    }
  };

  setSelectedValue = (ids?: number | number[]) => {
    if (!ids) {
      this.setState({ selectedIds: [] }, () =>
        this.props.onFileSelected(this.state.selectedIds)
      );
    } else if (this.props.multiple) {
      this.setState({ selectedIds: ids as number[] }, () =>
        this.props.onFileSelected(this.state.selectedIds)
      );
    } else {
      this.setState({ selectedIds: [ids as number] }, () =>
        this.props.onFileSelected(this.state.selectedIds)
      );
    }
    this.doSearch('');
  };

  render() {
    const { style, multiple, disabled } = this.props;
    const { fetching, searchResults, selectedIds } = this.state;
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
  }
}

export default FileSelect;
