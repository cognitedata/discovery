import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Drawer, Spin, Collapse, Button } from 'antd';
import styled from 'styled-components';

import mixpanel from 'mixpanel-browser';
import {
  fetchTimeseries,
  selectTimeseries,
  Timeseries,
} from '../modules/timeseries';
import { Asset } from '../modules/assets';
import { fetchEvents, selectEvents, Events } from '../modules/events';
import AddTimeseries from '../components/AddTimeseries';
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

  componentDidUpdate(prevProps, prevState) {
    const { doFetchTimeseries, doFetchEvents, asset } = this.props;
    if (prevProps.asset !== asset) {
      doFetchTimeseries(asset.id);
      doFetchEvents(asset.id);
    }
  }

  addTimeseries = event => {
    const { asset } = this.state;
    mixpanel.context.track('addTimeseries.click', { asset });
    this.setState({ showAddTimeseries: true });
    event.stopPropagation();
  };

  onAddClose = () => {
    this.setState({
      showAddTimeseries: false,
      showEvent: undefined,
      showTimeseries: undefined,
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

  render() {
    const { asset } = this.props;
    const { showTimeseries, showEvent, showAddTimeseries = false } = this.state;

    const timeseries =
      this.props.timeseries.items != null ? this.props.timeseries.items : [];
    const events =
      this.props.events.items != null ? this.props.events.items : [];

    if (asset == null) {
      return (
        <SpinContainer>
          <Spin />
        </SpinContainer>
      );
    }

    return (
      <>
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
          width={400}
          closable={false}
          visible
          mask={false}
        >
          {asset.description && <p>{asset.description}</p>}
          {
            <>
              <Collapse accordion>
                <Panel
                  header={
                    <HeaderWithButton>
                      <span>Timeseries ({timeseries.length})</span>
                      <Button type="primary" onClick={this.addTimeseries}>
                        Add
                      </Button>
                    </HeaderWithButton>
                  }
                  key="timeseries"
                >
                  {timeseries.map(ts => (
                    <Button
                      key={ts.id}
                      type="link"
                      onClick={() => this.timeseriesOnClick(ts.id, ts.name)}
                    >
                      {ts.name}
                    </Button>
                  ))}
                </Panel>
              </Collapse>

              <Collapse accordion>
                <Panel
                  header={<span>Events ({events.length})</span>}
                  key="events"
                >
                  {events.map(event => (
                    <Button
                      title={`type: ${event.type}, subtype: ${
                        event.subtype
                      }, metadata: ${JSON.stringify(event.metadata)}`}
                      key={event.id}
                      type="link"
                      onClick={() => this.eventOnClick(event.id)}
                    >
                      {event.description}
                    </Button>
                  ))}
                </Panel>
              </Collapse>
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
  timeseries: Timeseries.isRequired,
  events: Events.isRequired,
};

const mapStateToProps = state => {
  return {
    timeseries: selectTimeseries(state),
    events: selectEvents(state),
  };
};
const mapDispatchToProps = dispatch => ({
  doFetchTimeseries: (...args) => dispatch(fetchTimeseries(...args)),
  doFetchEvents: (...args) => dispatch(fetchEvents(...args)),
});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AssetDrawer);
