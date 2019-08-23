import React from 'react';
import { connect } from 'react-redux';
import {
  List,
  Drawer,
  Spin,
  Collapse,
  Button,
  Icon,
  Popconfirm,
  Descriptions,
  Switch,
  message,
} from 'antd';

import styled from 'styled-components';
import moment from 'moment';
import mixpanel from 'mixpanel-browser';
import { THREE } from '@cognite/3d-viewer';
import { bindActionCreators, Dispatch } from 'redux';
import { CogniteEvent, GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import {
  fetchTimeseries,
  selectTimeseries,
  removeAssetFromTimeseries,
  TimeseriesState,
} from '../modules/timeseries';
import {
  selectTypes,
  removeTypeFromAsset,
  Type,
  TypesState,
} from '../modules/types';
import {
  fetchEvents,
  selectEventsByAssetId,
  EventsAndTypes,
} from '../modules/events';
import AddTimeseries from './AddTimeseries';
import AddTypes from './AddTypes';
import EventPreview from '../components/EventPreview';
import TimeseriesPreview from '../components/TimeseriesPreview';
import { createAssetTitle } from '../utils/utils';
import { selectThreeD, CurrentNode, ThreeDState } from '../modules/threed';
import { ExtendedAsset, fetchAsset, deleteAsset } from '../modules/assets';
import { RootState } from '../reducers/index';
import { sdk } from '../index';
import AddChildAsset from './AddChildAsset';

const { Panel } = Collapse;

const EditHieraryToggle = styled.div`
  margin-top: 16px;
  span {
    margin-left: 8px;
  }
`;

const SpinContainer = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
`;

const HeaderWithButton = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
`;

type OrigProps = {
  asset: ExtendedAsset;
  width: number;
  onAssetIdChange: (id?: number) => void;
};

type Props = {
  doFetchTimeseries: typeof fetchTimeseries;
  doFetchEvents: typeof fetchEvents;
  doRemoveAssetFromTimeseries: typeof removeAssetFromTimeseries;
  doRemoveTypeFromAsset: typeof removeTypeFromAsset;
  deleteAsset: typeof deleteAsset;
  timeseries: TimeseriesState;
  events: EventsAndTypes;
  threed: ThreeDState;
  types: TypesState;
} & OrigProps;

type State = {
  showAddChild: boolean;
  showAddTypes: boolean;
  showAddTimeseries: boolean;
  showEvent?: number;
  asset?: ExtendedAsset;
  activeCollapsed?: any[];
  showTimeseries?: { id: number; name: string };
  showEditHierarchy: boolean;
  disableEditHierarchy: boolean;
};

class AssetDrawer extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    showAddChild: false,
    showAddTimeseries: false,
    showEditHierarchy: false,
    disableEditHierarchy: true,
    showAddTypes: false,
  };

  componentDidMount() {
    const { asset, doFetchTimeseries, doFetchEvents } = this.props;
    doFetchTimeseries(asset.id);
    doFetchEvents(asset.id);
    this.determineAssetEditing();
  }

  componentDidUpdate(prevProps: Props) {
    const { doFetchTimeseries, doFetchEvents, asset } = this.props;
    if (prevProps.asset !== asset) {
      doFetchTimeseries(asset.id);
      doFetchEvents(asset.id);
      this.determineAssetEditing();
    }
  }

  addTimeseriesClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    const { asset } = this.state;
    // @ts-ignore
    mixpanel.context.track('addTimeseries.click', { asset });
    this.setState({ showAddTimeseries: true });
    event.stopPropagation();
  };

  addTypeClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    const { asset } = this.state;
    // @ts-ignore
    mixpanel.context.track('addType.click', { asset });
    this.setState({ showAddTypes: true });
    event.stopPropagation();
  };

  onModalClose = () => {
    this.setState({
      showAddTimeseries: false,
      showEvent: undefined,
      showTimeseries: undefined,
      showAddChild: false,
      showAddTypes: false,
    });
  };

  eventOnClick = (eventId: number) => {
    this.setState({ showEvent: eventId });
  };

  timeseriesOnClick = (timeseriesId: number, timeseriesName: string) => {
    this.setState({
      showTimeseries: { id: timeseriesId, name: timeseriesName },
    });
  };

  renderTypes = (asset: ExtendedAsset, types: Type[]) => (
    <Panel
      header={
        <HeaderWithButton>
          <span>Types ({types.length})</span>
          <Button type="primary" onClick={this.addTypeClick}>
            Add
          </Button>
        </HeaderWithButton>
      }
      key="types"
    >
      {types.map(type => (
        <HeaderWithButton key={`ts_${type.id}`}>
          {type.name}
          <Popconfirm
            title="Are you sure？"
            okText="Yes"
            cancelText="No"
            onConfirm={() => this.props.doRemoveTypeFromAsset(type, asset)}
          >
            <Button type="danger">
              <Icon type="delete" />
            </Button>
          </Popconfirm>
        </HeaderWithButton>
      ))}
    </Panel>
  );

  renderTimeseries = (
    asset: ExtendedAsset,
    timeseries: GetTimeSeriesMetadataDTO[]
  ) => (
    <Panel
      header={
        <HeaderWithButton>
          <span>Timeseries ({timeseries.length})</span>
          <Button type="primary" onClick={this.addTimeseriesClick}>
            Add
          </Button>
        </HeaderWithButton>
      }
      key="timeseries"
    >
      {timeseries.map(ts => (
        <HeaderWithButton key={`ts_${ts.id}`}>
          <Button
            key={ts.id}
            type="link"
            onClick={() => this.timeseriesOnClick(ts.id, ts.name!)}
          >
            {ts.name}
          </Button>
          <Popconfirm
            title="Are you sure？"
            okText="Yes"
            cancelText="No"
            onConfirm={() =>
              this.props.doRemoveAssetFromTimeseries(ts.id, asset.id)
            }
          >
            <Button type="danger">
              <Icon type="delete" />
            </Button>
          </Popconfirm>
        </HeaderWithButton>
      ))}
    </Panel>
  );

  renderEvents = (events: CogniteEvent[]) => {
    const sortedEvents = events.sort(
      (a, b) => (b.startTime! as number) - (a.startTime! as number)
    );
    return (
      <Panel header={<span>Events ({sortedEvents.length})</span>} key="events">
        <List
          size="small"
          dataSource={sortedEvents}
          renderItem={event => (
            <List.Item onClick={() => this.eventOnClick(event.id)}>
              <List.Item.Meta
                title={
                  <Button type="link">
                    {moment
                      .unix((event.startTime! as number) / 1000)
                      .format('YYYY-MM-DD HH:mm')}
                  </Button>
                }
                description={event.type}
              />
            </List.Item>
          )}
        />
      </Panel>
    );
  };

  onCollapseChange = (change: string | string[]) => {
    this.setState({ activeCollapsed: change as string[] });
  };

  determineAssetEditing() {
    this.setState({
      disableEditHierarchy: !!(
        this.props.asset.metadata && this.props.asset.metadata!.SOURCE
      ),
    });
  }

  renderThreeD = (node: CurrentNode) => {
    if (node === null || node === undefined) {
      return null;
    }

    const boundingBox = new THREE.Box3(
      new THREE.Vector3(...node.boundingBox!.min),
      new THREE.Vector3(...node.boundingBox!.max)
    );
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.max.clone().sub(boundingBox.min);

    return (
      <Panel header={<span>3D</span>} key="3d">
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="Position">
            x: {center.x.toFixed(1)} m
            <br />
            y: {center.y.toFixed(1)} m
            <br />
            z: {center.z.toFixed(1)} m
            <br />
          </Descriptions.Item>
          <Descriptions.Item label="Size">
            Height: {size.z.toFixed(1)} m
            <br />
            Depth: {size.x.toFixed(1)} m
            <br />
            Width: {size.y.toFixed(1)} m
            <br />
          </Descriptions.Item>
        </Descriptions>
      </Panel>
    );
  };

  renderExternalLinks = (assetId: number) => {
    const { project } = sdk;

    const opintUrl = `https://opint.cogniteapp.com/${project}/assets/${assetId}`;
    return (
      <Panel header={<span>External links</span>} key="links">
        <Button type="link" onClick={() => window.open(opintUrl)}>
          Operational Intelligence
        </Button>
      </Panel>
    );
  };

  renderEdit = (asset: ExtendedAsset) => {
    const { project } = sdk;
    return (
      <Panel header={<span>Edit Asset Hierarchy</span>} key="edit">
        <Button
          type="primary"
          onClick={() => this.setState({ showAddChild: true })}
        >
          Add Child Asset
        </Button>
        <br />
        <br />
        <Button type="primary" onClick={() => message.info('Coming soon!')}>
          Change Asset Parent
        </Button>
        <br />
        <br />
        <Popconfirm
          title="Are you sure you want to remove this asset and all its children?"
          onConfirm={() => {
            this.props.deleteAsset(asset.id);
            this.props.onAssetIdChange(asset.parentId);
          }}
          okText={`Yes (deleteing for tenant ${project})`}
          cancelText="No"
        >
          <Button type="danger">Delete (with Children)</Button>
        </Popconfirm>
      </Panel>
    );
  };

  render() {
    const { asset } = this.props;
    const {
      showTimeseries,
      showEvent,
      showAddChild,
      showAddTimeseries,
      showAddTypes,
    } = this.state;

    const timeseries = this.props.timeseries.items
      ? this.props.timeseries.items
      : [];

    const allTypes = this.props.types.items ? this.props.types.items : [];

    const types = asset.types ? asset.types : [];

    if (asset == null) {
      return (
        <SpinContainer>
          <Spin />
        </SpinContainer>
      );
    }

    const defaultActiveKey = this.state.activeCollapsed
      ? this.state.activeCollapsed
      : [];

    return (
      <>
        {asset != null && showAddTypes && (
          <AddTypes
            assetId={asset.id}
            asset={asset}
            onClose={this.onModalClose}
            types={allTypes}
          />
        )}
        {asset != null && showAddTimeseries && (
          <AddTimeseries
            assetId={asset.id}
            onClose={this.onModalClose}
            timeseries={timeseries}
          />
        )}
        {asset != null && showAddChild && (
          <AddChildAsset
            assetId={asset.id}
            asset={asset}
            onClose={this.onModalClose}
          />
        )}
        {showEvent != null && (
          <EventPreview eventId={showEvent} onClose={this.onModalClose} />
        )}
        {showTimeseries != null && (
          <TimeseriesPreview
            timeseries={{ id: showTimeseries.id, name: showTimeseries.name }}
            onClose={this.onModalClose}
          />
        )}
        <Drawer
          title={createAssetTitle(asset)}
          placement="right"
          width={this.props.width}
          closable={false}
          visible
          mask={false}
        >
          {asset.description && <p>{asset.description}</p>}
          {
            <Collapse
              onChange={this.onCollapseChange}
              defaultActiveKey={defaultActiveKey}
            >
              {asset != null && this.renderExternalLinks(asset.id)}
              {this.props.threed.currentNode &&
                this.renderThreeD(this.props.threed.currentNode)}
              {this.renderTimeseries(asset, timeseries)}
              {this.renderTypes(asset, types)}
              {this.renderEvents(this.props.events.items)}
              {this.state.showEditHierarchy && this.renderEdit(asset)}
            </Collapse>
          }
          <EditHieraryToggle>
            <Switch
              disabled={this.state.disableEditHierarchy}
              onChange={checked =>
                this.setState({ showEditHierarchy: checked })
              }
            />
            <span>Hierarchy Editing</span>
          </EditHieraryToggle>
        </Drawer>
      </>
    );
  }
}

const mapStateToProps = (state: RootState, ownProps: OrigProps) => {
  return {
    timeseries: selectTimeseries(state),
    threed: selectThreeD(state),
    events: selectEventsByAssetId(state, ownProps.asset.id),
    types: selectTypes(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doFetchTimeseries: fetchTimeseries,
      doFetchEvents: fetchEvents,
      doRemoveAssetFromTimeseries: removeAssetFromTimeseries,
      deleteAsset,
      doRemoveTypeFromAsset: removeTypeFromAsset,
      doFetchAsset: fetchAsset,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetDrawer);
