// Disable linting problems with <a>
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import { connect } from 'react-redux';
// import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Input, List, Divider, Collapse, DatePicker, Select } from 'antd';
import queryString from 'query-string';
import {
  fetchAssets,
  searchForAsset,
  selectAssets,
  Assets,
} from '../modules/assets';
import { EventList, selectEventList } from '../modules/events';
import { setFilters, selectFilteredSearch, Filters } from '../modules/filters';

const { RangePicker } = DatePicker;
const { Panel } = Collapse;
const { OptGroup, Option } = Select;

const moveExactMatchToTop = (list, query) => {
  const exactMatchIndex = list.findIndex(asset => asset.name === query);
  if (exactMatchIndex !== -1) {
    // Move the exact match to top
    list.splice(0, 0, list.splice(exactMatchIndex, 1)[0]);
  }
  return list;
};

class AssetSearch extends React.Component {
  state = { query: '', eventFilter: { type: 'event' } };

  componentDidMount() {
    const parsed = queryString.parse(this.props.location.search);
    const { query } = parsed;

    if (query) {
      this.props.doSearchForAsset(query);
      this.setState({ query });
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.events !== this.props.events) {
      // Find unique list of assetIds
      const assetIds = [
        ...this.props.events.items.reduce(
          (set, event) => new Set([...set, ...event.assetIds]),
          new Set()
        ),
      ];
      const missingAssetIds = assetIds.filter(
        assetId => this.props.assets.all[assetId] === undefined
      );
      this.props.doFetchAssets(missingAssetIds);
    }
  }

  onChange = change => {
    const query = change.target.value;
    this.setState({ query });
    this.props.doSearchForAsset(query);
  };

  onEventTypeChange = change => {
    const { eventFilter } = this.state;

    if (change === 'none') {
      eventFilter.eventType = undefined;
    } else {
      eventFilter.eventType = change;
    }

    this.setState({ eventFilter });
    this.props.doSetFilters({ event: eventFilter });
  };

  onRangeChange = change => {
    const { eventFilter } = this.state;

    if (change.length < 2) {
      eventFilter.from = undefined;
      eventFilter.to = undefined;
      eventFilter.eventType = undefined;

      this.setState({
        eventFilter,
      });
      this.props.doSetFilters({});
      return;
    }

    eventFilter.from = change[0].unix() * 1000; // ms
    eventFilter.to = (change[1].unix() + 86400) * 1000; // the day after, ms
    this.setState({
      eventFilter,
    });

    this.props.doSetFilters({ event: eventFilter });
  };

  renderSearchField() {
    const parsed = queryString.parse(this.props.location.search);
    const defaultSearchQuery = parsed.query ? parsed.query : '';
    return (
      <>
        <div
          style={{
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 10,
            paddingBottom: 10,
            width: '100%',
          }}
        >
          <Input
            placeholder="Search for tag (13FV1234)"
            defaultValue={defaultSearchQuery}
            onChange={this.onChange}
            style={{
              background: 'rgb(51, 51, 51)',
              mixBlendMode: 'normal',
              color: '#fff',
              borderRadius: 0,
              border: 0,
              height: 50,
            }}
          />
        </div>
        <Divider
          type="horizontal"
          style={{ margin: 10, backgroundColor: '#333333' }}
        />
      </>
    );
  }

  renderSearchResults() {
    const { query } = this.state;
    const assets = moveExactMatchToTop(
      this.props.filteredSearch.items,
      this.state.query.trim()
    );

    return (
      <>
        {assets && query !== '' && (
          <List
            split={false}
            itemLayout="horizontal"
            dataSource={assets}
            renderItem={item => (
              <List.Item
                style={{
                  padding: 10,
                  width: '100%',
                  paddingLeft: 10,
                  paddingRight: 10,
                }}
              >
                <List.Item.Meta
                  title={
                    <div
                      style={{
                        paddingLeft: 10,
                        color: 'rgb(255, 255, 255)',
                        fontWeight: 'bold',
                        fontSize: 12,
                      }}
                    >
                      <a>{item.name.toUpperCase()}</a>
                    </div>
                  }
                  onClick={() =>
                    this.props.onAssetClick(item, this.state.query)
                  }
                  description={
                    <div
                      style={{
                        paddingLeft: 10,
                        color: 'rgb(255, 255, 255)',
                        fontSize: 12,
                      }}
                    >
                      {item.description ? item.description.toUpperCase() : ''}
                    </div>
                  }
                  style={{
                    background:
                      item.id === this.props.assetId
                        ? 'rgb(80, 80, 80)'
                        : 'rgb(51, 51, 51)',
                  }}
                />
              </List.Item>
            )}
          />
        )}
      </>
    );
  }

  renderFilters() {
    return (
      <Collapse
        accordion
        style={{
          width: '100%',
          borderRadius: 0,
          padding: 10,
          paddingLeft: 10,
          paddingRight: 10,
          // color: '#fff',
          // background: 'rgb(51, 51, 51)',
        }}
      >
        <Panel
          header="Event filter"
          key="context"
          style={{
            border: 0,
            width: '100%',
            color: '#fff',
          }}
        >
          <RangePicker onChange={this.onRangeChange} />
          <Select
            defaultValue="none"
            style={{ width: '100%' }}
            onChange={this.onEventTypeChange}
            disabled={this.state.eventFilter.from === undefined}
            value={this.state.eventFilter.eventType || 'none'}
          >
            <Option value="none">Type</Option>
            <OptGroup label="Work orders">
              <Option value="Workorder">Work order</Option>
              <Option value="Workpermit">Work permit</Option>
            </OptGroup>
            {/* <OptGroup label="Other">
              <Option value="Yiminghe">yiminghe</Option>
            </OptGroup> */}
          </Select>
        </Panel>
      </Collapse>
    );
  }

  render() {
    return (
      <div
        style={{
          background: 'rgb(38, 38, 38)',
        }}
      >
        {this.renderSearchField()}
        {this.renderFilters()}
        {this.renderSearchResults()}
      </div>
    );
  }
}

AssetSearch.propTypes = {
  doSearchForAsset: PropTypes.func.isRequired,
  doSetFilters: PropTypes.func.isRequired,
  doFetchAssets: PropTypes.func.isRequired,
  filteredSearch: Filters.isRequired,
  events: EventList.isRequired,
  assets: Assets.isRequired,
  assetId: PropTypes.number,
  onAssetClick: PropTypes.func.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
    search: PropTypes.string,
  }).isRequired,
};

AssetSearch.defaultProps = {
  assetId: undefined,
};

const mapStateToProps = state => {
  return {
    assets: selectAssets(state),
    events: selectEventList(state),
    filteredSearch: selectFilteredSearch(state),
  };
};

const mapDispatchToProps = dispatch => ({
  doSearchForAsset: (...args) => dispatch(searchForAsset(...args)),
  doFetchAssets: (...args) => dispatch(fetchAssets(...args)),
  doSetFilters: (...args) => dispatch(setFilters(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetSearch);
