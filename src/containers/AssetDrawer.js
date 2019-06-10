import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { List, Drawer, Spin, Collapse, Button, Icon, Popconfirm } from 'antd';
import styled from 'styled-components';

import mixpanel from 'mixpanel-browser';
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
    <Collapse accordion>
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
            <Button
              key={type.id}
              type="link"
              // onClick={() => this.doRemoveTypeFromAsset(type.id, asset)}
            >
              {type.name}
            </Button>
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
    </Collapse>
  );

  renderTimeseries = (asset, timeseries) => (
    <Collapse accordion>
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
    </Collapse>
  );

  renderEvents = events => (
    <Collapse accordion>
      <Panel header={<span>Events ({events.length})</span>} key="events">
        <List
          size="small"
          dataSource={events}
          renderItem={event => (
            <List.Item>
              <Button type="link" onClick={() => this.eventOnClick(event.id)}>
                {event.type}
              </Button>
            </List.Item>
          )}
        />
      </Panel>
    </Collapse>
  );

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
          title={asset.name ? asset.name : asset.id}
          placement="right"
          width={this.props.width}
          closable={false}
          visible
          mask={false}
        >
          {asset.description && <p>{asset.description}</p>}
          {
            <>
              {this.renderTypes(asset, types)}
              {this.renderTimeseries(asset, timeseries)}
              {this.renderEvents(this.props.events.items)}
            </>
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
  types: Types.isRequired,
  width: PropTypes.number.isRequired,
};

const mapStateToProps = (state, ownProps) => {
  return {
    timeseries: selectTimeseries(state),
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
