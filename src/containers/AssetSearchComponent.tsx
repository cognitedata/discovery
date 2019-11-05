import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Input, Icon, Button, DatePicker, Select, message, List } from 'antd';
import { Dispatch, bindActionCreators } from 'redux';
import styled from 'styled-components';
import moment from 'moment';
import { RangePickerValue } from 'antd/lib/date-picker/interface';
import { Asset, GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import debounce from 'lodash/debounce';
import { RootState } from '../reducers/index';
import { sdk } from '../index';
import { BetterTag } from '../components/BetterTag';
import { ExtendedAsset } from '../modules/assets';
import { trackUsage, trackSearchUsage } from '../utils/metrics';
import { fetchAndSetTimeseries } from '../modules/timeseries';

const Overlay = styled.div<{ visible: string }>`
  display: ${props => (props.visible === 'true' ? 'block' : 'none')};
  position: fixed;
  top: 0;
  bottom: 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  z-index: -1;
`;
const SearchArea = styled.div`
  z-index: 1001;
`;
const FilterEditArea = styled.div`
  background: #efefef;
  padding: 4px;
  margin-bottom: 4px;
  && .ant-calendar-picker-input.ant-input {
    height: auto;
    line-height: 1;
  }
  && input {
    font-size: 12px;
  }
  && small {
    font-size: 12px;
    margin-bottom: 4px;
  }
  button {
    margin-top: 4px;
  }
`;
const ResultList = styled.div<{ visible: string }>`
  display: ${props => (props.visible === 'true' ? 'block' : 'none')};
  z-index: 1001;
  margin-top: 16px;
  position: fixed;
  width: 60vh;
  min-width: 800px;
  max-height: 80vh;
  font-size: 12px;

  && > div {
    background: white;
    padding: 16px;
    padding-top: 8px;
    max-height: 80vh;
    box-shadow: 0px 0px 6px #cdcdcd;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  && > div .filters {
    display: block;
  }
  && > div small {
    display: block;
    font-size: 12px;
    margin-bottom: 4px;
  }
`;
const SearchField = styled(Input)`
  box-shadow: 0px 0px 6px #dedede;
  z-index: 3;
  && > input:focus {
    outline: none;
    box-shadow: 0px 0px 8px #cdcdcd;
  }
  && > input {
    border-radius: 0px;
    border: none !important;
    padding: 12px 8px;
  }
`;
const AddFilterButton = styled(Button)`
  && {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 20px;
    height: auto;
    margin-right: 4px;
    margin-bottom: 2px;
  }

  && i {
    font-size: 12px;
  }
  &&& span {
    margin-left: 4px;
  }
`;
const MetadataEditRow = styled.div`
  display: flex;
  && > * {
    flex: 1;
  }
  && > *:nth-child(1) {
    margin-right: 2px;
  }
  && > *:nth-child(2) {
    margin-left: 2px;
  }
`;
const ListWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: row;
  width: 100%;
  flex: 1;
  height: 0;
  && > * {
    overflow: auto;
    flex: 1;
    margin-left: 12px;
  }
  && > *:nth-child(1) {
    margin-left: 0px;
  }
`;
const ListItem = styled.div`
  padding-top: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #efefef;
  transition: 0.3s all;
  cursor: pointer;
  padding-left: 6px;
  padding-right: 6px;
  p {
    margin-bottom: 0px;
  }
  h4,
  p {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    background: #f4f4f4;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: #efefef;
  margin-top: 12px;
  margin-bottom: 12px;
`;

interface EventFilter {
  type: 'event';
  to?: number;

  from?: number;

  eventType?: string;
}
interface LocationFilter {
  type: 'location';
  id?: string;

  name?: string;
}
interface RootFilter {
  type: 'root';
  id?: string;

  name?: string;
}
interface SourceFilter {
  type: 'source';
  source?: string;
}
interface MetadataFilter {
  type: 'metadata';
  key?: string;

  value?: string;
}

type Filter =
  | EventFilter
  | LocationFilter
  | SourceFilter
  | MetadataFilter
  | RootFilter;

type OwnProps = {
  rootAsset?: ExtendedAsset;
  onAssetClicked: (asset: Asset) => void;
};
type DispatchProps = {
  fetchAndSetTimeseries: typeof fetchAndSetTimeseries;
};
type Props = DispatchProps & OwnProps;

type State = {
  loading: boolean;
  tsLoading: boolean;
  showSearchExtended: boolean;
  addingRootFilter?: RootFilter;
  addingEventFilter?: EventFilter;
  addingLocationFilter?: LocationFilter;
  addingSourceFilter?: SourceFilter;
  onlyRootAsset: boolean;
  query: string;
  addingMetadataFilter?: MetadataFilter;
  filters: Filter[];
  results: Asset[];
  tsResults: GetTimeSeriesMetadataDTO[];
  possibleParents: Asset[];
  possibleRoots: Asset[];
};

class AssetSearch extends Component<Props, State> {
  queryId: number = 0;

  tsQueryId: number = 0;

  inputRef = React.createRef<HTMLInputElement>();

  wrapperRef = React.createRef<HTMLDivElement>();

  constructor(props: Props) {
    super(props);

    this.state = {
      loading: false,
      showSearchExtended: false,
      onlyRootAsset: false,
      query: '',
      filters: [],
      possibleRoots: [],
      possibleParents: [],
      results: [],
      tsResults: [],
      tsLoading: false,
    };

    this.searchForAsset = debounce(this.searchForAsset, 700);
    this.searchForTimeseries = debounce(this.searchForTimeseries, 700);
    this.searchForRootAsset = debounce(this.searchForRootAsset, 700);
    this.searchForAssetParent = debounce(this.searchForAssetParent, 700);
  }

  componentDidUpdate(_: Props, prevState: State) {
    if (
      prevState.filters.length !== this.state.filters.length ||
      prevState.query.length !== this.state.query.length ||
      prevState.onlyRootAsset !== this.state.onlyRootAsset
    ) {
      this.searchForAsset(this.state.query);
      this.searchForTimeseries(this.state.query);
    }
    if (prevState.addingRootFilter && !this.state.addingRootFilter) {
      trackUsage('GlobalSearch.SearchFilterToggled', {
        type: 'rootOnly',
        value: prevState.addingRootFilter,
      });
    }
    if (prevState.addingEventFilter && !this.state.addingEventFilter) {
      trackUsage('GlobalSearch.SearchFilterToggled', {
        type: 'eventFilter',
        value: prevState.addingEventFilter,
      });
    }
    if (prevState.addingLocationFilter && !this.state.addingLocationFilter) {
      trackUsage('GlobalSearch.SearchFilterToggled', {
        type: 'locationFilter',
        value: prevState.addingLocationFilter,
      });
    }
    if (prevState.addingSourceFilter && !this.state.addingSourceFilter) {
      trackUsage('GlobalSearch.SearchFilterToggled', {
        type: 'sourceFilter',
        value: prevState.addingSourceFilter,
      });
    }
  }

  onSearchFieldFocus = () => {
    this.setState({ showSearchExtended: true });
  };

  onOverlayClick = () => {
    this.setState({ showSearchExtended: false });
  };

  onEventRangeChange = (change: RangePickerValue) => {
    const { addingEventFilter } = this.state;

    const newFilter: EventFilter = { type: 'event', ...addingEventFilter };

    if (
      change.length < 2 ||
      change[0] === undefined ||
      change[1] === undefined
    ) {
      // this.removeEventFilter();
    } else {
      newFilter.from = change[0].unix() * 1000; // ms
      newFilter.to = (change[1].unix() + 86400) * 1000; // the day after, ms

      this.setState({
        addingEventFilter: newFilter,
      });
    }
  };

  searchForAssetParent = async (query: string) => {
    trackSearchUsage('GlobalSearch', 'ParentFilter', {
      query,
    });
    const results = await sdk.post(
      `/api/v1/projects/${sdk.project}/assets/search`,
      {
        data: {
          search: { query },
          limit: 100,
        },
      }
    );
    this.setState({ possibleParents: results.data.items, loading: false });
  };

  searchForRootAsset = async (query: string) => {
    trackSearchUsage('GlobalSearch', 'Asset', {
      root: true,
      query,
    });
    const results = await sdk.post(
      `/api/v1/projects/${sdk.project}/assets/search`,
      {
        data: {
          search: { query },
          filter: {
            root: true,
          },
          limit: 100,
        },
      }
    );
    this.setState({ possibleRoots: results.data.items, loading: false });
  };

  searchForAsset = async (query: string) => {
    try {
      this.setState({ loading: true });
      this.queryId = this.queryId + 1;
      const queryId = 0 + this.queryId;
      const { filters, onlyRootAsset } = this.state;
      const filterMap = filters.reduce(
        (prev, filter) => {
          switch (filter.type) {
            case 'event':
              prev.events.push(filter);
              break;
            case 'location':
              prev.locations.push(filter.id!);
              break;
            case 'root':
              prev.rootIds.push(filter.id!);
              break;
            case 'metadata':
              // eslint-disable-next-line no-param-reassign
              prev.metadata[filter.key!] = filter.value!;
              break;
            case 'source':
              // eslint-disable-next-line no-param-reassign
              prev.source = filter.source;
              break;
          }
          return prev;
        },
        {
          source: undefined,
          events: [],
          locations: [],
          rootIds: [],
          metadata: {},
        } as {
          source?: string;
          events: EventFilter[];
          locations: string[];
          rootIds: string[];
          metadata: { [key: string]: string };
        }
      );
      // event filter
      let events: Set<number> | undefined;
      let results: Asset[] = [];

      if (filterMap.events.length > 0) {
        const promises = filterMap.events.map(async filter => {
          const e = await this.fetchEventsByFilter(filter);
          if (!events) {
            events = e;
          } else {
            const tmp = new Set<number>();
            e.forEach(asset => {
              if (events!.has(asset)) {
                tmp.add(asset);
              }
            });
            events = tmp;
          }
        });

        await Promise.all(promises);
      }

      if (query || filterMap.events.length === 0) {
        results = (await sdk.post(
          `/api/v1/projects/${sdk.project}/assets/search`,
          {
            data: {
              limit: 100,
              ...(query && query.length > 0 && { search: { query } }),
              filter: {
                ...(onlyRootAsset && { root: true }),
                ...(filterMap.source && { source: filterMap.source }),
                ...(filterMap.metadata && { metadata: filterMap.metadata }),
                ...(filterMap.locations.length > 0 && {
                  parentIds: filterMap.locations.map(el => Number(el)),
                }),
                ...(filterMap.rootIds.length > 0 && {
                  rootIds: filterMap.rootIds.map(el => ({ id: Number(el) })),
                }),
              },
            },
          }
        )).data.items;
      } else if (events && events.size > 0) {
        results = await sdk.assets.retrieve(
          Array.from(events).map(el => ({ id: el }))
        );

        // apply filters on frontend
        results = results.filter(el => {
          if (onlyRootAsset) {
            if (el.rootId !== el.id) {
              return false;
            }
          }
          if (filterMap.source) {
            if (el.source !== filterMap.source) {
              return false;
            }
          }
          if (filterMap.locations.length > 0) {
            if (
              !el.parentId ||
              !filterMap.locations.includes(`${el.parentId}`)
            ) {
              return false;
            }
          }
          if (filterMap.locations.length > 0) {
            if (!el.rootId || !filterMap.rootIds.includes(`${el.rootId}`)) {
              return false;
            }
          }
          const anyMetadataNonMatch = Object.keys(filterMap.metadata).some(
            (key: string) =>
              !el.metadata || el.metadata[key] !== filterMap.metadata[key]
          );
          if (anyMetadataNonMatch) {
            return false;
          }
          return true;
        });
      }

      if (events) {
        results = results.filter(asset => events!.has(asset.id));
      }
      if (queryId === this.queryId) {
        trackSearchUsage('GlobalSearch', 'Asset', {
          query,
          filters: filterMap,
        });
        this.setState({ results, loading: false });
        this.queryId = 0;
      }
    } catch (ex) {
      message.error('Unable to search.');
    }
  };

  searchForTimeseries = async (query: string) => {
    try {
      this.setState({ tsLoading: true });
      this.tsQueryId = this.tsQueryId + 1;
      const tsQueryId = 0 + this.tsQueryId;
      const { filters } = this.state;
      const filterMap = filters.reduce(
        (prev, filter) => {
          switch (filter.type) {
            case 'event':
              prev.events.push(filter);
              break;
            case 'location':
              prev.locations.push(filter.id!);
              break;
            case 'root':
              prev.rootIds.push(filter.id!);
              break;
            case 'metadata':
              // eslint-disable-next-line no-param-reassign
              prev.metadata[filter.key!] = filter.value!;
              break;
            case 'source':
              // eslint-disable-next-line no-param-reassign
              prev.source = filter.source;
              break;
          }
          return prev;
        },
        {
          source: undefined,
          events: [],
          rootIds: [],
          locations: [],
          metadata: {},
        } as {
          source?: string;
          events: EventFilter[];
          locations: string[];
          rootIds: string[];
          metadata: { [key: string]: string };
        }
      );
      // event filter
      let results: GetTimeSeriesMetadataDTO[] = [];

      results = (await sdk.post(
        `/api/v1/projects/${sdk.project}/timeseries/search`,
        {
          data: {
            limit: 100,
            ...(query && query.length > 0 && { search: { query } }),
            filter: {
              ...(filterMap.metadata && { metadata: filterMap.metadata }),
              ...(filterMap.locations.length > 0 && {
                assetIds: filterMap.locations.map(el => Number(el)),
              }),
              ...(filterMap.rootIds.length > 0 && {
                rootAssetIds: filterMap.rootIds.map(el => Number(el)),
              }),
            },
          },
        }
      )).data.items;
      if (tsQueryId === this.tsQueryId) {
        trackSearchUsage('GlobalSearch', 'Timeseries', {
          query,
          filters: filterMap,
        });
        this.setState({ tsResults: results, tsLoading: false });
        this.tsQueryId = 0;
      }
    } catch (ex) {
      message.error('Unable to search.');
    }
  };

  fetchEventsByFilter = async (
    eventFilter: EventFilter
  ): Promise<Set<number>> => {
    const { filters } = this.state;
    const result = await sdk.events.list({
      filter: {
        type: eventFilter.eventType,
        startTime: { min: eventFilter.from, max: eventFilter.to },
        ...(filters.find(el => el.type === 'root') && {
          rootAssetIds: filters
            .filter(el => el.type === 'root')
            .map(el => ({ id: Number((el as RootFilter).id!) })),
        }),
      },
    });
    const set = new Set<number>();
    result.items.forEach(el => {
      if (el.assetIds) {
        for (let i = 0; i < el.assetIds.length; i++) {
          set.add(el.assetIds[i]);
        }
      }
    });
    return set;
  };

  onAssetClicked = (item: Asset, index: number) => {
    trackUsage('GlobalSearch.AssetClicked', { assetId: item.id, index });
    this.setState({
      showSearchExtended: false,
    });
    this.props.onAssetClicked(item);
  };

  onTimeseriesClicked = (item: GetTimeSeriesMetadataDTO, index: number) => {
    trackUsage('GlobalSearch.TimeseriesClicked', {
      timeseriesId: item.id,
      index,
    });
    this.setState({
      showSearchExtended: false,
    });
    this.props.fetchAndSetTimeseries(item.id, true);
  };

  renderPendingFilters = () => {
    const sections = [];
    const {
      addingRootFilter,
      addingEventFilter,
      addingMetadataFilter,
      addingSourceFilter,
      addingLocationFilter,
      filters,
      possibleRoots,
      possibleParents,
    } = this.state;
    // Event Filter
    if (addingEventFilter) {
      sections.push(
        <FilterEditArea>
          <small>New Event Filter</small>
          <DatePicker.RangePicker
            onChange={this.onEventRangeChange}
            format="DD/MM/YY"
          />
          {addingEventFilter.from && (
            <Select
              size="small"
              defaultValue="none"
              style={{ width: '100%' }}
              onChange={(val: string) =>
                this.setState({
                  addingEventFilter: { ...addingEventFilter, eventType: val },
                })
              }
              value={addingEventFilter.eventType || 'none'}
            >
              <Select.Option value="none">Any Type</Select.Option>
              <Select.OptGroup label="Work orders">
                <Select.Option value="Workorder">Work order</Select.Option>
                <Select.Option value="Workpermit">Work permit</Select.Option>
              </Select.OptGroup>
              <Select.OptGroup label="Other">
                <Select.Option value="OilSample">Oil sample</Select.Option>
                <Select.Option value="leakLog">Leak log</Select.Option>
              </Select.OptGroup>
            </Select>
          )}
          <Button
            size="small"
            onClick={() => {
              if (addingEventFilter.from && addingEventFilter.to) {
                this.setState({
                  filters: [...filters, addingEventFilter],
                  addingEventFilter: undefined,
                });
              } else {
                message.info('Unable to add filter');
              }
            }}
          >
            Add
          </Button>
          <Button
            size="small"
            onClick={() =>
              this.setState({
                addingEventFilter: undefined,
              })
            }
          >
            Cancel
          </Button>
        </FilterEditArea>
      );
    }
    // Location Filter
    if (addingLocationFilter) {
      sections.push(
        <FilterEditArea>
          <small>New Parent Filter</small>
          <Select
            defaultValue="none"
            size="small"
            style={{ width: '100%' }}
            onChange={(val: string) => {
              const [id, name] = val.split(':');
              this.setState({
                addingLocationFilter: {
                  type: 'location',
                  id,
                  name,
                },
              });
            }}
            showSearch
            filterOption={false}
            onSearch={(value: string) => this.searchForAssetParent(value)}
            value={
              addingLocationFilter.id
                ? `${addingLocationFilter.id}:${addingLocationFilter.name}`
                : undefined
            }
          >
            {possibleParents.map((asset: Asset) => (
              <Select.Option key={asset.id} value={`${asset.id}:${asset.name}`}>
                {asset.name}
              </Select.Option>
            ))}
          </Select>
          <Button
            size="small"
            onClick={() => {
              if (addingLocationFilter.id) {
                this.setState({
                  filters: [...filters, addingLocationFilter],
                  addingLocationFilter: undefined,
                });
              } else {
                message.info('Unable to add filter');
              }
            }}
          >
            Add
          </Button>
          <Button
            size="small"
            onClick={() =>
              this.setState({
                addingLocationFilter: undefined,
              })
            }
          >
            Cancel
          </Button>
        </FilterEditArea>
      );
    }
    // Root Filter
    if (addingRootFilter) {
      sections.push(
        <FilterEditArea>
          <small>New Root Asset Filter</small>
          <Select
            defaultValue="none"
            size="small"
            style={{ width: '100%' }}
            onChange={(val: string) => {
              const [id, name] = val.split(':');
              this.setState({
                addingRootFilter: {
                  type: 'root',
                  id,
                  name,
                },
              });
            }}
            showSearch
            filterOption={false}
            onSearch={(value: string) => this.searchForRootAsset(value)}
            value={
              addingRootFilter.id
                ? `${addingRootFilter.id}:${addingRootFilter.name}`
                : undefined
            }
          >
            {possibleRoots.map((asset: Asset) => (
              <Select.Option key={asset.id} value={`${asset.id}:${asset.name}`}>
                {asset.name}
              </Select.Option>
            ))}
          </Select>
          <Button
            size="small"
            onClick={() => {
              if (addingRootFilter.id) {
                this.setState({
                  filters: [...filters, addingRootFilter],
                  addingRootFilter: undefined,
                });
              } else {
                message.info('Unable to add filter');
              }
            }}
          >
            Add
          </Button>
          <Button
            size="small"
            onClick={() =>
              this.setState({
                addingLocationFilter: undefined,
              })
            }
          >
            Cancel
          </Button>
        </FilterEditArea>
      );
    }
    // Metadata Filter
    if (addingMetadataFilter) {
      const { key, value } = addingMetadataFilter;
      sections.push(
        <FilterEditArea>
          <small>New Metadata Filter</small>
          <MetadataEditRow>
            <Input
              type="small"
              value={key}
              placeholder="Key"
              onChange={ev =>
                this.setState({
                  addingMetadataFilter: {
                    ...addingMetadataFilter,
                    key: ev.target.value,
                  },
                })
              }
            />
            <Input
              type="small"
              placeholder="Value"
              value={value}
              onChange={ev =>
                this.setState({
                  addingMetadataFilter: {
                    ...addingMetadataFilter,
                    value: ev.target.value,
                  },
                })
              }
            />
          </MetadataEditRow>
          <Button
            size="small"
            onClick={() => {
              if (key && value && key.length > 0 && value.length > 0) {
                this.setState({
                  filters: [...filters, addingMetadataFilter],
                  addingMetadataFilter: undefined,
                });
              } else {
                message.info('Unable to add filter');
              }
            }}
          >
            Add
          </Button>
          <Button
            size="small"
            onClick={() =>
              this.setState({
                addingMetadataFilter: undefined,
              })
            }
          >
            Cancel
          </Button>
        </FilterEditArea>
      );
    }
    // Source Filter
    if (addingSourceFilter) {
      sections.push(
        <FilterEditArea>
          <small>New Source Filter</small>
          <Input
            type="small"
            value={addingSourceFilter.source}
            placeholder="Source"
            onChange={ev =>
              this.setState({
                addingSourceFilter: {
                  type: 'source',
                  source: ev.target.value,
                },
              })
            }
          />
          <Button
            size="small"
            onClick={() => {
              if (
                addingSourceFilter.source &&
                addingSourceFilter.source.length > 0
              ) {
                this.setState({
                  filters: [...filters, addingSourceFilter],
                  addingSourceFilter: undefined,
                });
              } else {
                message.info('Unable to add filter');
              }
            }}
          >
            Add
          </Button>
          <Button
            size="small"
            onClick={() =>
              this.setState({
                addingSourceFilter: undefined,
              })
            }
          >
            Cancel
          </Button>
        </FilterEditArea>
      );
    }
    return sections;
  };

  renderCurrentFilters = () => {
    const { filters, onlyRootAsset, query } = this.state;
    let allFilters = [];
    if (query && query.length > 0) {
      allFilters.push(
        <BetterTag
          closable
          key="query"
          onClose={() =>
            this.setState({
              query: '',
            })
          }
        >
          Query: {query}
        </BetterTag>
      );
    }
    allFilters = allFilters.concat(
      filters.map((filter, i) => {
        let text = '';
        switch (filter.type) {
          case 'event':
            text = `${moment(filter.from).format('DD/MM/YY')}-${moment(
              filter.to
            ).format('DD/MM/YY')}${
              filter.eventType ? `: ${filter.eventType}` : ''
            }`;
            break;
          case 'location':
            text = `Parent: ${filter.name}`;
            break;
          case 'metadata':
            text = `${filter.key}: ${filter.value}`;
            break;
          case 'source':
            text = `Source: ${filter.source}`;
            break;
          case 'root':
            text = `Root: ${filter.name}`;
            break;
        }
        return (
          <BetterTag
            closable
            // eslint-disable-next-line react/no-array-index-key
            key={`${filter.type}-${i}`}
            onClose={() =>
              this.setState({
                filters: [...filters.slice(0, i), ...filters.slice(i + 1)],
              })
            }
          >
            {text}
          </BetterTag>
        );
      })
    );
    if (onlyRootAsset) {
      allFilters.push(
        <BetterTag
          closable
          key="root"
          onClose={() =>
            this.setState({
              onlyRootAsset: false,
            })
          }
        >
          Only Root Asset
        </BetterTag>
      );
    }
    return allFilters;
  };

  render() {
    const {
      showSearchExtended,
      addingRootFilter,
      addingEventFilter,
      addingMetadataFilter,
      addingLocationFilter,
      addingSourceFilter,
      onlyRootAsset,
      results,
      tsResults,
      tsLoading,
      query,
      loading,
    } = this.state;
    return (
      <div style={{ position: 'relative', zIndex: 1000 }}>
        <Overlay
          visible={showSearchExtended ? 'true' : 'false'}
          onClick={this.onOverlayClick}
        />
        <SearchArea>
          <SearchField
            suffix={<Icon type="search" />}
            placeholder="Search for an asset"
            value={query}
            onFocus={this.onSearchFieldFocus}
            onChange={event => this.setState({ query: event.target.value })}
          />
          <ResultList visible={showSearchExtended ? 'true' : 'false'}>
            <div>
              <div className="filters">
                <small>Active Filters</small>
                {this.renderCurrentFilters()}
                <small>Add Filters</small>
                {this.renderPendingFilters()}
                {!addingRootFilter && (
                  <AddFilterButton
                    icon="plus"
                    onClick={() =>
                      this.setState({
                        addingRootFilter: { type: 'root' },
                      })
                    }
                  >
                    Root Asset
                  </AddFilterButton>
                )}
                {!addingEventFilter && (
                  <AddFilterButton
                    icon="plus"
                    onClick={() =>
                      this.setState({
                        addingEventFilter: { type: 'event' },
                      })
                    }
                  >
                    Event
                  </AddFilterButton>
                )}
                {!addingLocationFilter && (
                  <AddFilterButton
                    icon="plus"
                    onClick={() =>
                      this.setState({
                        addingLocationFilter: { type: 'location' },
                      })
                    }
                  >
                    Parent Asset
                  </AddFilterButton>
                )}
                {!addingMetadataFilter && (
                  <AddFilterButton
                    icon="plus"
                    onClick={() =>
                      this.setState({
                        addingMetadataFilter: { type: 'metadata' },
                      })
                    }
                  >
                    Metadata Field
                  </AddFilterButton>
                )}
                {!addingSourceFilter && (
                  <AddFilterButton
                    icon="plus"
                    onClick={() =>
                      this.setState({
                        addingSourceFilter: { type: 'source' },
                      })
                    }
                  >
                    Source
                  </AddFilterButton>
                )}
                {!onlyRootAsset && (
                  <AddFilterButton
                    icon="check"
                    onClick={() =>
                      this.setState({
                        onlyRootAsset: true,
                      })
                    }
                  >
                    Only Root Assets
                  </AddFilterButton>
                )}
              </div>
              <Divider />
              <ListWrapper>
                <List
                  dataSource={results}
                  header="Assets"
                  loading={loading}
                  renderItem={(item: Asset, i: number) => {
                    return (
                      <ListItem onClick={() => this.onAssetClicked(item, i)}>
                        <h4>{item.name}</h4>
                        <p>{item.description}</p>
                      </ListItem>
                    );
                  }}
                />
                <List
                  dataSource={tsResults}
                  header="Timeseries"
                  loading={tsLoading}
                  renderItem={(item: GetTimeSeriesMetadataDTO, i: number) => {
                    return (
                      <ListItem
                        onClick={() => this.onTimeseriesClicked(item, i)}
                      >
                        <h4>{item.name}</h4>
                        <p>{item.description}</p>
                      </ListItem>
                    );
                  }}
                />
              </ListWrapper>
            </div>
          </ResultList>
        </SearchArea>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return { app: state.app };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ fetchAndSetTimeseries }, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetSearch);
