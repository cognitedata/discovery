import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, Popover, Checkbox, Input, Icon } from 'antd';
import { push } from 'connected-react-router';
import styled from 'styled-components';
import AssetSelect from 'components/AssetSelect';
import { InternalId } from '@cognite/sdk';
import { addAssetsToState } from '../../modules/assets';
import { RootState } from '../../reducers/index';
import {
  setSearchLoading,
  setAssetsTable,
  setTimeseriesTable,
  setFilesTable,
  setThreeDTable,
  SearchState,
  setAssetFilter,
  setSearchQuery,
} from '../../modules/search';
import { addTimeseriesToState } from '../../modules/timeseries';
import { addFilesToState } from '../../modules/files';
import { SearchPageTabKeys } from './SearchPage';

const Wrapper = styled.div`
  display: block;
  width: 300px;
  p {
    margin-bottom: 4px;
    margin-top: 12px;
  }
`;

const SearchWrapper = styled.div`
  display: flex;
  padding: 40px 55px;

  .ant-input-affix-wrapper {
    flex: 1;
    line-height: 16px;
    max-width: 600px;
    margin-right: 24px;
  }
  .ant-btn-background-ghost.ant-btn-primary {
    color: #787878;
    border-color: #787878;
  }
`;

type OrigProps = {
  tab: SearchPageTabKeys;
};

type Props = {
  search: SearchState;
  push: typeof push;
  setSearchQuery: typeof setSearchQuery;
  setAssetFilter: typeof setAssetFilter;
  addAssetsToState: typeof addAssetsToState;
  setAssetsTable: typeof setAssetsTable;
  setSearchLoading: typeof setSearchLoading;
  setTimeseriesTable: typeof setTimeseriesTable;
  setFilesTable: typeof setFilesTable;
  setThreeDTable: typeof setThreeDTable;
  addTimeseriesToState: typeof addTimeseriesToState;
  addFilesToState: typeof addFilesToState;
} & OrigProps;

type State = {
  popoverVisible: boolean;
};

class SearchPage extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    popoverVisible: false,
  };

  componentDidUpdate(prevProps: Props) {
    if (prevProps.tab !== this.props.tab) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ popoverVisible: false });
    }
  }

  renderPopover = () => {
    const { tab } = this.props;
    const { assetFilter } = this.props.search;
    switch (tab) {
      case 'assets': {
        return (
          <Wrapper>
            <p>Root Only</p>
            <Checkbox
              checked={assetFilter.filter ? assetFilter.filter.root : undefined}
              onChange={ev =>
                this.props.setAssetFilter({
                  ...assetFilter,
                  filter: {
                    ...assetFilter.filter,
                    root: ev.target.checked || undefined,
                  },
                })
              }
            />
            <p>Root Assets</p>
            <AssetSelect
              style={{ width: '100%' }}
              rootOnly
              multiple
              selectedAssetIds={
                assetFilter.filter && assetFilter.filter.rootIds
                  ? assetFilter.filter.rootIds.map(el => (el as InternalId).id)
                  : []
              }
              onAssetSelected={ids =>
                this.props.setAssetFilter({
                  ...assetFilter,
                  filter: {
                    ...assetFilter.filter,
                    rootIds:
                      ids.length > 0 ? ids.map(el => ({ id: el })) : undefined,
                  },
                })
              }
            />
            <p>Parent Assets</p>
            <AssetSelect
              style={{ width: '100%' }}
              multiple
              selectedAssetIds={
                assetFilter.filter && assetFilter.filter.parentIds
                  ? assetFilter.filter.parentIds
                  : []
              }
              onAssetSelected={ids =>
                this.props.setAssetFilter({
                  ...assetFilter,
                  filter: {
                    ...assetFilter.filter,
                    parentIds: ids.length > 0 ? ids : undefined,
                  },
                })
              }
            />
            <p>Source</p>
            <Input
              value={assetFilter.filter ? assetFilter.filter.source : undefined}
              onChange={ev =>
                this.props.setAssetFilter({
                  ...assetFilter,
                  filter: {
                    ...assetFilter.filter,
                    source:
                      ev.target.value.length > 0 ? ev.target.value : undefined,
                  },
                })
              }
            />
          </Wrapper>
        );
      }
      default:
        return <Wrapper>No Filters</Wrapper>;
    }
  };

  render() {
    const { popoverVisible } = this.state;
    const { query } = this.props.search;
    return (
      <SearchWrapper>
        <Input
          prefix={<Icon type="search" />}
          placeholder="Search for resources"
          value={query}
          onChange={ev => this.props.setSearchQuery(ev.target.value)}
        />
        <Popover
          visible={popoverVisible}
          trigger="click"
          placement="bottomRight"
          onVisibleChange={visible =>
            this.setState({ popoverVisible: visible })
          }
          content={this.renderPopover()}
        >
          <Button ghost icon="sliders" type="primary">
            Filters
          </Button>
        </Popover>
      </SearchWrapper>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    search: state.search,
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      push,
      addAssetsToState,
      setSearchLoading,
      setAssetsTable,
      setTimeseriesTable,
      setFilesTable,
      setThreeDTable,
      addTimeseriesToState,
      addFilesToState,
      setAssetFilter,
      setSearchQuery,
    },
    dispatch
  );
export default connect(mapStateToProps, mapDispatchToProps)(SearchPage);
