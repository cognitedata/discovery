// Disable linting problems with <a>
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react';
import { connect } from 'react-redux';
import * as sdk from '@cognite/sdk';
import PropTypes from 'prop-types';
import { Icon, Button, Input, List, Collapse, DatePicker, Select } from 'antd';
import queryString from 'query-string';
import styled from 'styled-components';
import {
  fetchAssets,
  searchForAsset,
  selectAssets,
  Assets,
} from '../modules/assets';
import { EventList, selectEventList } from '../modules/events';
import { setFilters, selectFilteredSearch, Filters } from '../modules/filters';
import { createAssetTitle } from '../utils/utils';

const { RangePicker } = DatePicker;
const { Panel } = Collapse;
const { OptGroup, Option } = Select;

const HeaderWithButton = styled.div`
  display: flex;
  width: 100%;
  height: 10px;
  align-items: center;
  justify-content: space-between;
`;

const moveExactMatchToTop = (list, query) => {
  const exactMatchIndex = list.findIndex(asset => asset.name === query);
  if (exactMatchIndex !== -1) {
    // Move the exact match to top
    list.splice(0, 0, list.splice(exactMatchIndex, 1)[0]);
  }
  return list;
};

class AssetSearch extends React.Component {
  state = {
    query: '',
    eventFilter: undefined,
    locationFilter: undefined,
  };

  areas = {
    'Cellar deck': ['M110', 'M210', 'M310', 'Z00'],
    'Upper deck': ['M50', 'M520', 'M40', 'M420'],
    'Middle deck': ['M120', 'M220', 'M320'],
    'Weather deck': ['M130', 'M230', 'M400', 'M330'],
  };

  componentDidMount() {
    const parsed = queryString.parse(this.props.location.search);
    const { query } = parsed;

    if (query) {
      this.props.doSearchForAsset(query);
      this.setState({ query });
    }
  }

  componentDidUpdate(prevProps, prevState) {
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

    if (
      prevState.eventFilter !== this.state.eventFilter ||
      prevState.locationFilter !== this.state.locationFilter
    ) {
      const filters = {};

      if (this.state.eventFilter) {
        filters.event = this.state.eventFilter;
      }

      if (this.state.locationFilter) {
        filters.location = this.state.locationFilter;
      }

      this.props.doSetFilters(filters);
    }
  }

  onAreaChange = change => {
    if (change === 'none') {
      this.setState({
        locationFilter: undefined,
      });
      return;
    }

    this.setState({
      locationFilter: {
        type: 'location',
        area: change,
      },
    });
  };

  onChange = change => {
    const query = change.target.value;
    this.setState({ query });
    this.props.doSearchForAsset(query);
  };

  onEventTypeChange = change => {
    const { eventFilter } = this.state;
    const newFilter = Object.assign({ type: 'event' }, eventFilter);

    if (change === 'none') {
      newFilter.eventType = undefined;
    } else {
      newFilter.eventType = change;
    }

    this.setState({
      eventFilter: newFilter,
    });
  };

  onRangeChange = change => {
    const { eventFilter } = this.state;
    const newFilter = Object.assign({ type: 'event' }, eventFilter);

    if (change.length < 2) {
      this.removeEventFilter();
      return;
    }

    newFilter.from = change[0].unix() * 1000; // ms
    newFilter.to = (change[1].unix() + 86400) * 1000; // the day after, ms

    this.setState({
      eventFilter: newFilter,
    });
  };

  removeEventFilter = () => {
    this.setState({ eventFilter: undefined });
  };

  removeLocationFilter = () => {
    this.setState({ locationFilter: undefined });
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
            placeholder="Search for tag"
            defaultValue={defaultSearchQuery}
            onChange={this.onChange}
          />
        </div>
      </>
    );
  }

  renderSearchResults() {
    const assets = moveExactMatchToTop(
      this.props.filteredSearch.items,
      this.state.query.trim()
    );

    return (
      <>
        {assets && (
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
                        fontWeight: 'bold',
                        fontSize: 12,
                      }}
                    >
                      <a>{createAssetTitle(item).toUpperCase()}</a>
                    </div>
                  }
                  onClick={() =>
                    this.props.onAssetClick(item, this.state.query)
                  }
                  description={
                    <div
                      style={{
                        paddingLeft: 10,
                        fontSize: 12,
                      }}
                    >
                      {item.description ? item.description.toUpperCase() : ''}
                    </div>
                  }
                  style={{
                    background:
                      item.id === this.props.assetId
                        ? 'rgb(230,230,230)'
                        : 'rgb(245,245,245)',
                  }}
                />
              </List.Item>
            )}
          />
        )}
      </>
    );
  }

  renderEventType() {
    return (
      <Select
        defaultValue="none"
        style={{ width: '100%' }}
        onChange={this.onEventTypeChange}
        value={
          (this.state.eventFilter && this.state.eventFilter.eventType) || 'none'
        }
      >
        <Option value="none">Type</Option>
        <OptGroup label="Work orders">
          <Option value="Workorder">Work order</Option>
          <Option value="Workpermit">Work permit</Option>
        </OptGroup>
        <OptGroup label="Other">
          <Option value="OilSample">Oil sample</Option>
          <Option value="leakLog">Leak log</Option>
        </OptGroup>
      </Select>
    );
  }

  renderEventFilter() {
    return (
      <Collapse
        accordion
        style={{
          width: '100%',
          borderRadius: 0,
        }}
      >
        <Panel
          header={
            <HeaderWithButton>
              <span>Event filter</span>
              <Button
                hidden={this.state.eventFilter === undefined}
                type="primary"
                onClick={e => {
                  this.removeEventFilter();
                  e.stopPropagation();
                }}
              >
                <Icon type="delete" />
              </Button>
            </HeaderWithButton>
          }
          key="context"
          style={{
            border: 0,
            width: '100%',
          }}
        >
          <RangePicker onChange={this.onRangeChange} />
          {this.state.eventFilter &&
            this.state.eventFilter.from &&
            this.renderEventType()}
        </Panel>
      </Collapse>
    );
  }

  renderAreas() {
    return Object.keys(this.areas).map(areaClass => (
      <OptGroup key={areaClass} label={areaClass}>
        {this.areas[areaClass].map(area => (
          <Option key={area} value={area}>
            {area}
          </Option>
        ))}
      </OptGroup>
    ));
  }

  renderLocationFilter() {
    return (
      <Collapse
        accordion
        style={{
          width: '100%',
          borderRadius: 0,
        }}
      >
        <Panel
          header={
            <HeaderWithButton>
              <span>Location filter</span>
              <Button
                hidden={this.state.locationFilter === undefined}
                type="primary"
                onClick={e => {
                  this.removeLocationFilter();
                  e.stopPropagation();
                }}
              >
                <Icon type="delete" />
              </Button>
            </HeaderWithButton>
          }
          key="context"
          style={{
            border: 0,
            width: '100%',
          }}
        >
          <Select
            defaultValue="none"
            style={{ width: '100%' }}
            onChange={this.onAreaChange}
            value={
              (this.state.locationFilter && this.state.locationFilter.area) ||
              'none'
            }
          >
            <Option value="none">Area</Option>
            {this.renderAreas()}
          </Select>
        </Panel>
      </Collapse>
    );
  }

  renderFilters() {
    const { project } = sdk.configure({});
    return (
      <>
        {this.renderEventFilter()}
        {project === 'akerbp' && this.renderLocationFilter()}
      </>
    );
  }

  render() {
    return (
      <>
        {this.renderSearchField()}
        {this.renderFilters()}
        {this.renderSearchResults()}
      </>
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
