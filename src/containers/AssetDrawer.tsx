import React from 'react';
import { connect } from 'react-redux';
import { List, Drawer, Spin, Collapse, Button, Icon, Popconfirm, Descriptions } from 'antd';
import * as sdk from '@cognite/sdk';
import styled from 'styled-components';
import moment from 'moment';
import mixpanel from 'mixpanel-browser';
import { THREE } from '@cognite/3d-viewer';
import { fetchTimeseries, selectTimeseries, removeAssetFromTimeseries, TimeseriesState } from '../modules/timeseries';
import { selectTypes, removeTypeFromAsset, Type, TypesState } from '../modules/types';
import { fetchEvents, selectEventsByAssetId, EventsAndTypes } from '../modules/events';
import AddTimeseries from './AddTimeseries';
import AddTypes from './AddTypes';
import EventPreview from '../components/EventPreview';
import TimeseriesPreview from '../components/TimeseriesPreview';
import { createAssetTitle } from '../utils/utils';
import { selectThreeD, CurrentNode, ThreeDState } from '../modules/threed';
import { ExtendedAsset, fetchAsset } from '../modules/assets';
import { Timeseries, Event } from '@cognite/sdk';
import { RootState } from '../reducers/index';
import { bindActionCreators, Dispatch } from 'redux';

const { Panel } = Collapse;

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
};

type Props = {
  asset: ExtendedAsset;
  doFetchTimeseries: typeof fetchTimeseries;
  doFetchEvents: typeof fetchEvents;
  doRemoveAssetFromTimeseries: typeof removeAssetFromTimeseries;
  doRemoveTypeFromAsset: typeof removeTypeFromAsset;
  timeseries: TimeseriesState;
  events: EventsAndTypes;
  threed: ThreeDState;
  types: TypesState;
  width: number;
};

type State = {
  showAddTypes: boolean;
  showAddTimeseries: boolean;
  showEvent?: number;
  asset?: ExtendedAsset;
  activeCollapsed?: any[];
  showTimeseries?: { id: number; name: string };
};

class AssetDrawer extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    showAddTimeseries: false,
    showAddTypes: false
  };

  componentDidMount() {
    const { asset, doFetchTimeseries, doFetchEvents } = this.props;
    doFetchTimeseries(asset.id);
    doFetchEvents(asset.id);
  }

  componentDidUpdate(prevProps: Props) {
    const { doFetchTimeseries, doFetchEvents, asset } = this.props;
    if (prevProps.asset !== asset) {
      doFetchTimeseries(asset.id);
      doFetchEvents(asset.id);
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

  onAddClose = () => {
    this.setState({
      showAddTimeseries: false,
      showEvent: undefined,
      showTimeseries: undefined,
      showAddTypes: false
    });
  };

  eventOnClick = (eventId: number) => {
    this.setState({ showEvent: eventId });
  };

  timeseriesOnClick = (timeseriesId: number, timeseriesName: string) => {
    this.setState({
      showTimeseries: { id: timeseriesId, name: timeseriesName }
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

  renderTimeseries = (asset: ExtendedAsset, timeseries: Timeseries[]) => (
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
          <Button key={ts.id} type="link" onClick={() => this.timeseriesOnClick(ts.id, ts.name)}>
            {ts.name}
          </Button>
          <Popconfirm
            title="Are you sure？"
            okText="Yes"
            cancelText="No"
            onConfirm={() => this.props.doRemoveAssetFromTimeseries(ts.id, asset.id)}
          >
            <Button type="danger">
              <Icon type="delete" />
            </Button>
          </Popconfirm>
        </HeaderWithButton>
      ))}
    </Panel>
  );

  renderEvents = (events: Event[]) => {
    events = events.sort((a, b) => b.startTime! - a.startTime!);
    return (
      <Panel header={<span>Events ({events.length})</span>} key="events">
        <List
          size="small"
          dataSource={events}
          renderItem={event => (
            <List.Item onClick={() => this.eventOnClick(event.id)}>
              <List.Item.Meta
                title={<Button type="link">{moment.unix(event.startTime! / 1000).format('YYYY-MM-DD HH:mm')}</Button>}
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
    const { project } = sdk.configure({});

    const opintUrl = `https://opint.cogniteapp.com/${project}/assets/${assetId}`;
    return (
      <Panel header={<span>External links</span>} key="links">
        <Button type="link" onClick={() => window.open(opintUrl)}>
          Operational Intelligence
        </Button>
      </Panel>
    );
  };

  render() {
    const { asset } = this.props;
    const { showTimeseries, showEvent, showAddTimeseries = false, showAddTypes = false } = this.state;

    const timeseries = this.props.timeseries.items ? this.props.timeseries.items : [];

    const allTypes = this.props.types.items ? this.props.types.items : [];

    const types = asset.types ? asset.types : [];

    if (asset == null) {
      return (
        <SpinContainer>
          <Spin />
        </SpinContainer>
      );
    }

    const defaultActiveKey = this.state.activeCollapsed ? this.state.activeCollapsed : [];

    return (
      <>
        {asset != null && showAddTypes && (
          <AddTypes assetId={asset.id} asset={asset} onClose={this.onAddClose} types={allTypes} />
        )}
        {asset != null && showAddTimeseries && (
          <AddTimeseries assetId={asset.id} onClose={this.onAddClose} timeseries={timeseries} />
        )}
        {showEvent != null && <EventPreview eventId={showEvent} onClose={this.onAddClose} />}
        {showTimeseries != null && (
          <TimeseriesPreview
            timeseries={{ id: showTimeseries.id, name: showTimeseries.name }}
            onClose={this.onAddClose}
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
            <Collapse onChange={this.onCollapseChange} defaultActiveKey={defaultActiveKey}>
              {asset != null && this.renderExternalLinks(asset.id)}
              {this.props.threed.currentNode && this.renderThreeD(this.props.threed.currentNode)}
              {this.renderTimeseries(asset, timeseries)}
              {this.renderTypes(asset, types)}
              {this.renderEvents(this.props.events.items)}
            </Collapse>
          }
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
    types: selectTypes(state)
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      doFetchTimeseries: fetchTimeseries,
      doFetchEvents: fetchEvents,
      doRemoveAssetFromTimeseries: removeAssetFromTimeseries,
      doRemoveTypeFromAsset: removeTypeFromAsset,
      doFetchAsset: fetchAsset
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetDrawer);
