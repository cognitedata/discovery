import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Drawer, Spin, List, Collapse, Button } from 'antd';
import styled from 'styled-components';
import { getAssetIdFromNodeId } from '../helpers/assetMappings';
import { fetchTimeseries, selectTimeseries } from '../modules/timeseries';
import { fetchEvents, selectEvents } from '../modules/events';
import makeCancelable from 'makecancelable';
import { Route } from 'react-router-dom';
import * as sdk from '@cognite/sdk';
import AddTimeseries from '../components/AddTimeseries';
import mixpanel from 'mixpanel-browser';

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
  state = {};

  componentDidMount() {
    this.fetchAssetMapping();
  }

  componentWillUnmount() {
    this.cancelAssetMappingPromise();
    this.cancelAssetPromise();
  }

  componentDidUpdate(prevProps, prevState) {
    const { nodeId } = this.props;
    if (prevProps.nodeId !== nodeId) {
      this.asset = undefined;
      this.fetchAssetMapping();
    }

    const { doFetchTimeseries, doFetchEvents } = this.props;
    const { asset } = this.state;
    if (prevState.asset !== asset) {
      mixpanel.context.track('Asset.changed', { asset });
      doFetchTimeseries(asset.id);
      doFetchEvents(asset.id);
    }
  }

  fetchAssetMapping = async () => {
    const { modelId, revisionId, nodeId } = this.props;
    this.cancelAssetMappingPromise = makeCancelable(
      getAssetIdFromNodeId(modelId, revisionId, nodeId).then(assetId => {
        this.cancelAssetPromise = makeCancelable(sdk.Assets.retrieve(assetId).then(asset => {
          this.setState({asset: {id: assetId, name: asset.name, description: asset.description}});
        }));
      }));
    
  }

  addTimeseries = (event) => {
    const { asset } = this.state;
    mixpanel.context.track('addTimeseries.click', { asset });
    this.setState({ showAddTimeseries: true });
    event.stopPropagation();
  }

  addEvents = (event) => {
    const { asset } = this.state;
    mixpanel.context.track('addEvents.click', { asset });
    this.setState({ showAddEvents: true })
    event.stopPropagation();
  }

  onAddClose = () => {
    this.setState({ showAddEvents: false, showAddTimeseries: false })
  }

  render() {
    const { onClose, match } = this.props
    const { asset } = this.state;
    const { showAddTimeseries = false, showAddEvents = false } = this.state;
    
    const timeseries = this.props.timeseries.items != null ? this.props.timeseries.items : [];
    const events = this.props.events.items != null ? this.props.events.items : [];

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
      <Drawer title={asset.name ? asset.name : asset.id} placement="right" width={400} closable onClose={onClose} visible mask={false}>
        {asset.description && <p>{asset.description}</p>}
        {
        <>
        <Collapse accordion>
          <Panel header={
            <HeaderWithButton>
            <span>Timeseries ({timeseries.length})</span>
            <Button type="primary" onClick={this.addTimeseries}>Add</Button>
            </HeaderWithButton>
          } key="timeseries">
            {timeseries.map(ts => (<div key={ts.id}>{ts.name}</div>))}
          </Panel>
        </Collapse>
        
        <Collapse accordion>
          <Panel header={
            <HeaderWithButton>
            <span>Events ({events.length})</span>
            <Button type="primary" onClick={this.addEvents}>Add</Button>
            </HeaderWithButton>
          } key="events">
            {events.map(event => (<div title={`type: ${event.type}, subtype: ${event.subtype}, metadata: ${JSON.stringify(event.metadata)}`} key={event.id}>{event.description}</div>))}
          </Panel>
        </Collapse>
        </>
        }
      </Drawer>
      </>
    )
  }
}
AssetDrawer.propTypes = {
  modelId: PropTypes.number.isRequired,
  revisionId: PropTypes.number.isRequired,
  nodeId: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  match: PropTypes.shape({
    url: PropTypes.string.isRequired,
  }).isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
}

const mapStateToProps = (state, ownProps) => {
  const { nodeId } = ownProps
  return {
    timeseries: selectTimeseries(state),
    events: selectEvents(state)
  }
}
const mapDispatchToProps = (dispatch) => ({
  doFetchTimeseries: (...args) => dispatch(fetchTimeseries(...args)),
  doFetchEvents: (...args) => dispatch(fetchEvents(...args)),
})
export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AssetDrawer)
