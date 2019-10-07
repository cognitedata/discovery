import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  Input,
  Icon,
  Button,
  DatePicker,
  Select,
  message,
  List,
  Spin,
} from 'antd';
import { Dispatch, bindActionCreators } from 'redux';
import styled from 'styled-components';
import moment from 'moment';
import { RangePickerValue } from 'antd/lib/date-picker/interface';
import { Asset } from '@cognite/sdk';
import { RootState } from '../reducers/index';
import { sdk } from '../index';
import { BetterTag } from '../components/BetterTag';
import { ExtendedAsset } from '../modules/assets';
import { trackUsage, trackSearchUsage } from '../utils/metrics';

const Overlay = styled.div<{ visible: string }>`
  display: ${props => (props.visible === 'true' ? 'block' : 'none')};
  position: fixed;
  top: 0;
  bottom: 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  z-index: 1000;
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

  position: absolute;
  width: 100%;
  max-height: 80vh;
  font-size: 12px;

  && > div {
    background: white;
    padding: 16px;
    padding-top: 8px;
    max-height: 80vh;
    box-shadow: 0px 0px 6px #efefef;
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
  overflow: auto;
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
interface SourceFilter {
  type: 'source';
  source?: string;
}
interface MetadataFilter {
  type: 'metadata';
  key?: string;

  value?: string;
}

type Filter = EventFilter | LocationFilter | SourceFilter | MetadataFilter;

type OwnProps = {
  rootAsset?: ExtendedAsset;
  onAssetClicked: (asset: Asset) => void;
};
type DispatchProps = {};
type Props = DispatchProps & OwnProps;

type State = {
  loading: boolean;
  currentRootOnly: boolean;
  showSearchExtended: boolean;
  addingEventFilter?: EventFilter;
  addingLocationFilter?: LocationFilter;
  addingSourceFilter?: SourceFilter;
  onlyRootAsset: boolean;
  query: string;
  addingMetadataFilter?: MetadataFilter;
  filters: Filter[];
  results: Asset[];
  possibleParents: Asset[];
};

class AssetSearch extends Component<Props, State> {
  queryId: number = 0;

  inputRef = React.createRef<HTMLInputElement>();

  wrapperRef = React.createRef<HTMLDivElement>();

  constructor(props: Props) {
    super(props);

    this.state = {
      loading: false,
      showSearchExtended: false,
      onlyRootAsset: false,
      currentRootOnly: !!props.rootAsset,
      addingEventFilter: undefined,
      query: '',
      filters: [],
      possibleParents: [],
      results: [],
    };
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      prevState.filters.length !== this.state.filters.length ||
      prevState.query.length !== this.state.query.length ||
      prevState.onlyRootAsset !== this.state.onlyRootAsset ||
      prevState.currentRootOnly !== this.state.currentRootOnly
    ) {
      this.searchForAsset(this.state.query);
    }
    if (prevState.currentRootOnly !== this.state.currentRootOnly) {
      trackUsage('GlobalSearch.SearchFilterToggled', {
        type: 'rootOnly',
        value: this.state.currentRootOnly,
      });
    }
    if (prevState.addingEventFilter !== this.state.addingEventFilter) {
      trackUsage('GlobalSearch.SearchFilterToggled', {
        type: 'eventFilter',
        value: this.state.addingEventFilter,
      });
    }
    if (prevState.addingLocationFilter !== this.state.addingLocationFilter) {
      trackUsage('GlobalSearch.SearchFilterToggled', {
        type: 'locationFilter',
        value: this.state.addingLocationFilter,
      });
    }
    if (prevState.addingSourceFilter !== this.state.addingSourceFilter) {
      trackUsage('GlobalSearch.SearchFilterToggled', {
        type: 'sourceFilter',
        value: this.state.addingSourceFilter,
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

  searchForAsset = async (query: string, isParentQuery = false) => {
    try {
      this.setState({ loading: true });
      this.queryId = this.queryId + 1;
      const queryId = 0 + this.queryId;
      if (isParentQuery) {
        trackSearchUsage('GlobalSearch', 'ParentFilter', {
          query,
        });
        const results = await sdk.assets.search({
          search: { name: query },
          limit: 100,
        });
        this.setState({ possibleParents: results, loading: false });
      } else {
        const { filters, onlyRootAsset, currentRootOnly } = this.state;
        const { rootAsset } = this.props;
        const filterMap = filters.reduce(
          (prev, filter) => {
            switch (filter.type) {
              case 'event':
                prev.events.push(filter);
                break;
              case 'location':
                prev.locations.push(filter.id!);
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
            metadata: {},
          } as {
            source?: string;
            events: EventFilter[];
            locations: string[];
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
          results = await sdk.assets.search({
            limit: 1000,
            ...(query && query.length > 0 && { search: { name: query } }),
            filter: {
              ...(onlyRootAsset && { root: true }),
              ...(filterMap.source && { source: filterMap.source }),
              ...(filterMap.metadata && { metadata: filterMap.metadata }),
              ...(filterMap.locations.length > 0 && {
                parentIds: filterMap.locations.map(el => Number(el)),
              }),
              ...(rootAsset &&
                currentRootOnly && { rootIds: [{ id: rootAsset.id }] }),
            },
          });
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
            if (currentRootOnly && rootAsset) {
              if (el.rootId !== rootAsset.id) {
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
      }
    } catch (ex) {
      message.error('Unable to search.');
    }
  };

  fetchEventsByFilter = async (
    eventFilter: EventFilter
  ): Promise<Set<number>> => {
    const { currentRootOnly } = this.state;
    const { rootAsset } = this.props;
    const result = await sdk.events.list({
      filter: {
        type: eventFilter.eventType,
        startTime: { min: eventFilter.from, max: eventFilter.to },
        ...(currentRootOnly &&
          rootAsset && { rootAssetIds: [{ id: rootAsset.id }] }),
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

  renderPendingFilters = () => {
    const sections = [];
    const {
      addingEventFilter,
      addingMetadataFilter,
      addingSourceFilter,
      addingLocationFilter,
      filters,
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
            onSearch={(value: string) => this.searchForAsset(value, true)}
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
    const { filters, onlyRootAsset, currentRootOnly, query } = this.state;
    const { rootAsset } = this.props;
    let allFilters = [];
    if (query && query.length > 0) {
      allFilters.push(
        <BetterTag
          closable
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
    if (currentRootOnly && rootAsset) {
      allFilters.push(
        <BetterTag
          closable
          onClose={() =>
            this.setState({
              currentRootOnly: false,
            })
          }
        >
          Only Children of {rootAsset.name}
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
        }
        return (
          <BetterTag
            closable
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
      addingEventFilter,
      addingMetadataFilter,
      addingLocationFilter,
      addingSourceFilter,
      onlyRootAsset,
      currentRootOnly,
      results,
      query,
      loading,
    } = this.state;
    const { rootAsset } = this.props;
    return (
      <div style={{ position: 'relative' }}>
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
                {!currentRootOnly && rootAsset && (
                  <AddFilterButton
                    icon="check"
                    onClick={() =>
                      this.setState({
                        currentRootOnly: true,
                      })
                    }
                  >
                    Only {rootAsset.name}&apos;s Children
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
              {loading ? (
                <Spin size="large" />
              ) : (
                <ListWrapper>
                  <List
                    dataSource={results}
                    renderItem={(item: Asset, i: number) => {
                      return (
                        <ListItem onClick={() => this.onAssetClicked(item, i)}>
                          <h4>{item.name}</h4>
                          <p>{item.description}</p>
                        </ListItem>
                      );
                    }}
                  />
                </ListWrapper>
              )}
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
  bindActionCreators({}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetSearch);
