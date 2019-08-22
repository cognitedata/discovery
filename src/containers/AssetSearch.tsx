import React from 'react';
import { connect } from 'react-redux';
import { Icon, Button, Input, List, Collapse, DatePicker, Select } from 'antd';
import queryString from 'query-string';
import styled from 'styled-components';
import { Location } from 'history';
import { bindActionCreators, Dispatch } from 'redux';
import { RangePickerValue } from 'antd/lib/date-picker/interface';
import { CogniteEvent } from '@cognite/sdk';
import {
  fetchAssets,
  fetchRootAssets,
  searchForAsset,
  selectAssets,
  AssetsState,
  ExtendedAsset,
} from '../modules/assets';
import { selectEventList } from '../modules/events';
import {
  setFilters,
  selectFilteredAssets,
  LocationFilter,
  FilterOptions,
  EventFilter,
  selectRootAssets,
} from '../modules/filters';
import { createAssetTitle } from '../utils/utils';
import { RootState } from '../reducers/index';
import { sdk } from '../index';

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

const moveExactMatchToTop = (list: any[], query: any) => {
  const exactMatchIndex = list.findIndex(asset => asset.name === query);
  if (exactMatchIndex !== -1) {
    // Move the exact match to top
    list.splice(0, 0, list.splice(exactMatchIndex, 1)[0]);
  }
  return list;
};

type Props = {
  rootAssetId?: number;
  assetId?: number;
  location: Location;
  doSearchForAsset: typeof searchForAsset;
  fetchRootAssets: typeof fetchRootAssets;
  doSetFilters: typeof setFilters;
  onAssetIdChange: (
    rootAssetId: number,
    assetId: number,
    query?: string
  ) => void;
  doFetchAssets: typeof fetchAssets;
  events: { items: CogniteEvent[] };
  assets: AssetsState;
  filteredSearch: { items: ExtendedAsset[] };
  rootAssets: { items: ExtendedAsset[] };
};

type State = {
  query?: string;
  eventFilter?: EventFilter;
  locationFilter?: LocationFilter;
};

class AssetSearch extends React.Component<Props, State> {
  // FIX Aftyer
  readonly state: Readonly<State> = {
    query: '',
    eventFilter: undefined,
    locationFilter: undefined,
  };

  areas: { [key: string]: string[] } = {
    'Cellar deck': ['M110', 'M210', 'M310', 'Z00'],
    'Upper deck': ['M50', 'M520', 'M40', 'M420'],
    'Middle deck': ['M120', 'M220', 'M320'],
    'Weather deck': ['M130', 'M230', 'M400', 'M330'],
  };

  componentDidMount() {
    const parsed = queryString.parse(this.props.location.search);
    const { query } = parsed;

    if (query) {
      this.props.doSearchForAsset(query as string);
      this.setState({ query: Array.isArray(query) ? query[0] : query });
    }

    if (!this.props.rootAssetId) {
      this.checkAndFetchRootAssets();
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.events.items.length !== this.props.events.items.length) {
      // Find unique list of assetIds
      const assetIds: number[] = Array.from(
        this.props.events.items.reduce(
          (set, event: CogniteEvent) =>
            new Set([
              ...Array.from(set),
              ...(event.assetIds ? event.assetIds : []),
            ]),
          new Set<number>()
        )
      );
      const missingAssetIds = assetIds.filter(
        assetId => this.props.assets.all[assetId] === undefined
      );
      this.props.doFetchAssets(missingAssetIds);
    }

    if (
      prevState.eventFilter !== this.state.eventFilter ||
      prevState.locationFilter !== this.state.locationFilter
    ) {
      const filters: FilterOptions = {};

      if (this.state.eventFilter) {
        filters.event = this.state.eventFilter;
      }

      if (this.state.locationFilter) {
        filters.location = this.state.locationFilter;
      }

      this.props.doSetFilters(filters);
    }

    if (!this.props.rootAssetId) {
      this.checkAndFetchRootAssets();
    }
  }

  checkAndFetchRootAssets = () => {
    this.props.fetchRootAssets();
  };

  onAreaChange = (change: string) => {
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

  onChange = (change: React.ChangeEvent<HTMLInputElement>) => {
    const query = change.target.value;
    this.setState({ query });
    this.props.doSearchForAsset(query);
  };

  onEventTypeChange = (change: string) => {
    const { eventFilter } = this.state;
    const newFilter: EventFilter = Object.assign(
      { type: 'event' },
      eventFilter
    );

    if (change === 'none') {
      newFilter.eventType = undefined;
    } else {
      newFilter.eventType = change;
    }

    this.setState({
      eventFilter: newFilter,
    });
  };

  onRangeChange = (change: RangePickerValue) => {
    const { eventFilter } = this.state;
    const newFilter: EventFilter = Object.assign(
      { type: 'event' },
      eventFilter
    );

    if (
      change.length < 2 ||
      change[0] === undefined ||
      change[1] === undefined
    ) {
      this.removeEventFilter();
    } else {
      newFilter.from = change[0].unix() * 1000; // ms
      newFilter.to = (change[1].unix() + 86400) * 1000; // the day after, ms

      this.setState({
        eventFilter: newFilter,
      });
    }
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
    let assets: ExtendedAsset[] = [];
    if (this.props.rootAssetId) {
      assets = moveExactMatchToTop(
        this.props.filteredSearch.items,
        this.state.query && this.state.query.trim()
      );
    } else {
      assets = this.props.rootAssets.items;
    }
    return (
      <>
        {assets && (
          <List
            split={false}
            itemLayout="horizontal"
            dataSource={assets}
            renderItem={item => (
              <List.Item
                onClick={() =>
                  this.props.onAssetIdChange(
                    this.props.rootAssetId || item.id,
                    item.id,
                    this.state.query
                  )
                }
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
                      <p>{createAssetTitle(item).toUpperCase()}</p>
                    </div>
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
    return Object.keys(this.areas).map((areaClass: string) => (
      <OptGroup key={areaClass} label={areaClass}>
        {this.areas[areaClass].map((area: string) => (
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
    const { project } = sdk;
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

const mapStateToProps = (state: RootState) => {
  return {
    assets: selectAssets(state),
    events: selectEventList(state),
    filteredSearch: selectFilteredAssets(state),
    rootAssets: selectRootAssets(state),
  };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doSearchForAsset: searchForAsset,
      doFetchAssets: fetchAssets,
      doSetFilters: setFilters,
      fetchRootAssets,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetSearch);
