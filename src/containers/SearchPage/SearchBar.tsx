import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, Popover, Checkbox, Input, Icon } from 'antd';
import { push } from 'connected-react-router';
import styled from 'styled-components';
import AssetSelect from 'components/AssetSelect';
import { InternalId } from '@cognite/sdk';
import { RootState } from '../../reducers/index';
import {
  SearchState,
  updateAssetFilter,
  updateSearchQuery,
  updateTimeseriesFilter,
  updateFileFilter,
  updateSearchByAnnotation,
} from '../../modules/search';
import { SearchPageTabKeys } from './SearchPage';
import { trackUsage } from '../../utils/Metrics';
import SearchBarTypingFilters from './SearchBarTypingFilter';
import SearchBarAnnotationsFilter from './SearchBarAnnotationsFilter';

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
  updateSearchQuery: typeof updateSearchQuery;
  updateAssetFilter: typeof updateAssetFilter;
  updateFileFilter: typeof updateFileFilter;
  updateTimeseriesFilter: typeof updateTimeseriesFilter;
  updateSearchByAnnotation: typeof updateSearchByAnnotation;
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

  renderAssetPopover = () => {
    const { assetFilter, searchByAnnotation } = this.props.search;
    const isDisabled = searchByAnnotation;
    return (
      <Wrapper>
        <p>Root Only</p>
        <Checkbox
          disabled={isDisabled}
          checked={assetFilter.filter ? assetFilter.filter.root : undefined}
          onChange={ev =>
            this.props.updateAssetFilter({
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
          disabled={isDisabled}
          style={{ width: '100%' }}
          rootOnly
          multiple
          selectedAssetIds={
            assetFilter.filter && assetFilter.filter.rootIds
              ? assetFilter.filter.rootIds.map(el => (el as InternalId).id)
              : []
          }
          onAssetSelected={ids =>
            this.props.updateAssetFilter({
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
          disabled={isDisabled}
          style={{ width: '100%' }}
          multiple
          selectedAssetIds={
            assetFilter.filter && assetFilter.filter.parentIds
              ? assetFilter.filter.parentIds
              : []
          }
          onAssetSelected={ids =>
            this.props.updateAssetFilter({
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
          disabled={isDisabled}
          value={assetFilter.filter ? assetFilter.filter.source : undefined}
          onChange={ev =>
            this.props.updateAssetFilter({
              ...assetFilter,
              filter: {
                ...assetFilter.filter,
                source:
                  ev.target.value.length > 0 ? ev.target.value : undefined,
              },
            })
          }
        />
        <SearchBarTypingFilters />
        <SearchBarAnnotationsFilter />
      </Wrapper>
    );
  };

  renderFilePopover = () => {
    const { fileFilter, searchByAnnotation } = this.props.search;
    const isDisabled = searchByAnnotation;
    return (
      <Wrapper>
        <p>Uploaded Only</p>
        <Checkbox
          disabled={isDisabled}
          checked={fileFilter.filter ? fileFilter.filter.uploaded : undefined}
          onChange={ev =>
            this.props.updateFileFilter({
              ...fileFilter,
              filter: {
                ...fileFilter.filter,
                uploaded: ev.target.checked || undefined,
              },
            })
          }
        />
        <p>Linked Assets</p>
        <AssetSelect
          disabled={isDisabled}
          style={{ width: '100%' }}
          multiple
          selectedAssetIds={
            fileFilter.filter && fileFilter.filter.assetIds
              ? fileFilter.filter.assetIds
              : []
          }
          onAssetSelected={ids =>
            this.props.updateFileFilter({
              ...fileFilter,
              filter: {
                ...fileFilter.filter,
                assetIds: ids.length > 0 ? ids : undefined,
              },
            })
          }
        />
        <p>Source</p>
        <Input
          disabled={isDisabled}
          value={fileFilter.filter ? fileFilter.filter.source : undefined}
          onChange={ev =>
            this.props.updateFileFilter({
              ...fileFilter,
              filter: {
                ...fileFilter.filter,
                source:
                  ev.target.value.length > 0 ? ev.target.value : undefined,
              },
            })
          }
        />
        <p>Mime Type</p>
        <Input
          disabled={isDisabled}
          value={fileFilter.filter ? fileFilter.filter.mimeType : undefined}
          onChange={ev =>
            this.props.updateFileFilter({
              ...fileFilter,
              filter: {
                ...fileFilter.filter,
                mimeType:
                  ev.target.value.length > 0 ? ev.target.value : undefined,
              },
            })
          }
        />

        <SearchBarAnnotationsFilter />
      </Wrapper>
    );
  };

  renderTimeseriesPopover = () => {
    const { timeseriesFilter } = this.props.search;
    return (
      <Wrapper>
        <p>String Only</p>
        <Checkbox
          checked={
            timeseriesFilter.filter
              ? timeseriesFilter.filter.isString
              : undefined
          }
          onChange={ev =>
            this.props.updateTimeseriesFilter({
              ...timeseriesFilter,
              filter: {
                ...timeseriesFilter.filter,
                isString: ev.target.checked || undefined,
              },
            })
          }
        />
        <p>Linked to Assets</p>
        <AssetSelect
          style={{ width: '100%' }}
          multiple
          selectedAssetIds={
            timeseriesFilter.filter && timeseriesFilter.filter.assetIds
              ? timeseriesFilter.filter.assetIds
              : []
          }
          onAssetSelected={ids =>
            this.props.updateTimeseriesFilter({
              ...timeseriesFilter,
              filter: {
                ...timeseriesFilter.filter,
                assetIds: ids.length > 0 ? ids : undefined,
              },
            })
          }
        />
        <p>Linked to Root Assets</p>
        <AssetSelect
          style={{ width: '100%' }}
          rootOnly
          multiple
          selectedAssetIds={
            timeseriesFilter.filter && timeseriesFilter.filter.rootAssetIds
              ? timeseriesFilter.filter.rootAssetIds
              : []
          }
          onAssetSelected={ids =>
            this.props.updateTimeseriesFilter({
              ...timeseriesFilter,
              filter: {
                ...timeseriesFilter.filter,
                rootAssetIds: ids.length > 0 ? ids : undefined,
              },
            })
          }
        />
        <p>Unit</p>
        <Input
          value={
            timeseriesFilter.filter ? timeseriesFilter.filter.unit : undefined
          }
          onChange={ev =>
            this.props.updateTimeseriesFilter({
              ...timeseriesFilter,
              filter: {
                ...timeseriesFilter.filter,
                unit: ev.target.value.length > 0 ? ev.target.value : undefined,
              },
            })
          }
        />
      </Wrapper>
    );
  };

  renderPopover = () => {
    const { tab } = this.props;
    switch (tab) {
      case 'assets': {
        return this.renderAssetPopover();
      }
      case 'timeseries': {
        return this.renderTimeseriesPopover();
      }
      case 'files': {
        return this.renderFilePopover();
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
          onChange={ev => this.props.updateSearchQuery(ev.target.value)}
        />
        <Popover
          visible={popoverVisible}
          trigger="click"
          placement="bottomRight"
          onVisibleChange={visible =>
            this.setState({ popoverVisible: visible }, () => {
              trackUsage('SearchPage.SearchBar.PopoverToggle', {
                visible,
              });
            })
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
      updateAssetFilter,
      updateTimeseriesFilter,
      updateFileFilter,
      updateSearchQuery,
      updateSearchByAnnotation,
    },
    dispatch
  );
export default connect(mapStateToProps, mapDispatchToProps)(SearchPage);
