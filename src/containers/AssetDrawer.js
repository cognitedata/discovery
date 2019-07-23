import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
  List,
  Drawer,
  Spin,
  Collapse,
  Button,
  Icon,
  Popconfirm,
  Descriptions,
} from 'antd';
import * as sdk from '@cognite/sdk';
import styled from 'styled-components';
import moment from 'moment';
import mixpanel from 'mixpanel-browser';
import { THREE } from '@cognite/3d-viewer';
import {
  fetchTimeseries,
  selectTimeseries,
  removeAssetFromTimeseries,
  Timeseries,
} from '../modules/timeseries';
import { Asset } from '../modules/assets';
import { Types, selectTypes, removeTypeFromAsset } from '../modules/types';
import {
  fetchEvents,
  selectEventsByAssetId,
  EventList,
} from '../modules/events';
import AddTimeseries from '../components/AddTimeseries';
import AddTypes from '../components/AddTypes';
import EventPreview from '../components/EventPreview';
import TimeseriesPreview from '../components/TimeseriesPreview';
import { createAssetTitle } from '../utils/utils';
import { selectThreeD, ThreeD } from '../modules/threed';

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

class AssetDrawer extends React.Component {
  state = {
    showAddTimeseries: false,
  };

  componentDidMount() {
    const { asset, doFetchTimeseries, doFetchEvents } = this.props;
    doFetchTimeseries(asset.id);
    doFetchEvents(asset.id);
  }

  componentDidUpdate(prevProps) {
    const { doFetchTimeseries, doFetchEvents, asset } = this.props;
    if (prevProps.asset !== asset) {
      doFetchTimeseries(asset.id);
      doFetchEvents(asset.id);
    }
  }

  addTimeseriesClick = event => {
    const { asset } = this.state;
    mixpanel.context.track('addTimeseries.click', { asset });
    this.setState({ showAddTimeseries: true });
    event.stopPropagation();
  };

  addTypeClick = event => {
    const { asset } = this.state;
    mixpanel.context.track('addType.click', { asset });
    this.setState({ showAddTypes: true });
    event.stopPropagation();
  };

  onAddClose = () => {
    this.setState({
      showAddTimeseries: undefined,
      showEvent: undefined,
      showTimeseries: undefined,
      showAddTypes: undefined,
    });
  };

  eventOnClick = eventId => {
    this.setState({ showEvent: eventId });
  };

  timeseriesOnClick = (timeseriesId, timeseriesName) => {
    this.setState({
      showTimeseries: { id: timeseriesId, name: timeseriesName },
    });
  };

  renderTypes = (asset, types) => (
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

  renderTimeseries = (asset, timeseries) => (
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
            onClick={() => this.timeseriesOnClick(ts.id, ts.name)}
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

  renderEvents = events => {
    events = events.sort((a, b) => b.startTime - a.startTime);
    return (
      <Panel header={<span>Events ({events.length})</span>} key="events">
        <List
          size="small"
          dataSource={events}
          renderItem={event => (
            <List.Item.Meta
              title={
                <Button type="link">
                  {moment
                    .unix(event.startTime / 1000)
                    .format('YYYY-MM-DD HH:mm')}
                </Button>
              }
              description={event.type}
              onClick={() => this.eventOnClick(event.id)}
            />
          )}
        />
      </Panel>
    );
  };

  onCollapseChange = change => {
    this.setState({ activeCollapsed: change });
  };

  renderThreeD = node => {
    if (node == null) {
      return null;
    }

    const boundingBox = new THREE.Box3(
      new THREE.Vector3(...node.boundingBox.min),
      new THREE.Vector3(...node.boundingBox.max)
    );
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.max.clone().sub(boundingBox.min);

    return (
      <Panel header={<span>3D</span>} key="3d">
        <Descriptions bordered border size="small" column={1}>
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

  renderExternalLinks = assetId => {
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
    const {
      showTimeseries,
      showEvent,
      showAddTimeseries = false,
      showAddTypes = false,
    } = this.state;

    const timeseries =
      this.props.timeseries.items != null ? this.props.timeseries.items : [];

    const allTypes =
      this.props.types.items != null ? this.props.types.items : [];

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
          <AddTypes asset={asset} onClose={this.onAddClose} types={allTypes} />
        )}
        {asset != null && showAddTimeseries && (
          <AddTimeseries
            assetId={asset.id}
            onClose={this.onAddClose}
            timeseries={timeseries}
          />
        )}
        {showEvent != null && (
          <EventPreview eventId={showEvent} onClose={this.onAddClose} />
        )}
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
            <Collapse
              onChange={this.onCollapseChange}
              defaultActiveKey={defaultActiveKey}
            >
              {asset != null && this.renderExternalLinks(asset.id)}
              {this.renderThreeD(this.props.threed.currentNode)}
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
AssetDrawer.propTypes = {
  asset: Asset.isRequired,
  doFetchTimeseries: PropTypes.func.isRequired,
  doFetchEvents: PropTypes.func.isRequired,
  doRemoveAssetFromTimeseries: PropTypes.func.isRequired,
  doRemoveTypeFromAsset: PropTypes.func.isRequired,
  timeseries: Timeseries.isRequired,
  events: EventList.isRequired,
  threed: ThreeD.isRequired,
  types: Types.isRequired,
  width: PropTypes.number.isRequired,
};

const mapStateToProps = (state, ownProps) => {
  return {
    timeseries: selectTimeseries(state),
    threed: selectThreeD(state),
    events: selectEventsByAssetId(state, ownProps.asset.id),
    types: selectTypes(state),
  };
};
const mapDispatchToProps = dispatch => ({
  doFetchTimeseries: (...args) => dispatch(fetchTimeseries(...args)),
  doFetchEvents: (...args) => dispatch(fetchEvents(...args)),
  doRemoveAssetFromTimeseries: (...args) =>
    dispatch(removeAssetFromTimeseries(...args)),
  doRemoveTypeFromAsset: (...args) => dispatch(removeTypeFromAsset(...args)),
});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetDrawer);
