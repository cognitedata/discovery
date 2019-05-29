import React from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import { Drawer, Spin, List, Collapse, Button } from 'antd'
import styled from 'styled-components';
import { getAssetIdFromNodeId } from '../helpers/assetMappings'
import makeCancelable from 'makecancelable';
import * as sdk from '@cognite/sdk';

const { Panel } = Collapse;

const SpinContainer = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
`;

class AssetDrawer extends React.Component {
  state = {};

  componentDidMount() {
    this.fetchAssetMapping();
  }

  componentWillUnmount() {
    this.cancelAssetMappingPromise();
    this.cancelTimeseriesPromise();
    this.cancelAssetPromise();
  }

  componentDidUpdate(prevProps, prevState) {
    const { nodeId } = this.props;
    if (prevProps.nodeId !== nodeId) {
      this.asset = undefined;
      this.fetchAssetMapping();
    }

    const { asset } = this.state;
    if (prevState.asset !== asset) {
      this.fetchTimeseries();
      this.fetchEvents();
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

  fetchTimeseries = async () => {
    this.setState({timeseries: []});
    
    const { asset } = this.state;
    this.cancelTimeseriesPromise = makeCancelable(
      sdk.TimeSeries.list({assetId: asset.id, limit: 10000}).then(result => {
        const timeseries = result.items.map(ts => ({
          id: ts.id,
          name: ts.name
        }));
        this.setState({ timeseries });
      }));
  }

  fetchEvents = async () => {
    this.setState({events: []});
    
    const { asset } = this.state;
    this.cancelEventsPromise = makeCancelable(
      sdk.Events.list({assetId: asset.id, limit: 10000}).then(result => {
        const events = result.items.map(event => ({
          id: event.id,
          name: event.name
        }));
        this.setState({ events });
      }));
  }

  render() {
    const { onClose } = this.props
    const { asset, timeseries = [], events = [] } = this.state;
    if (asset == null) {
      return (
        <SpinContainer>
          <Spin />
        </SpinContainer>
      );
    }

    return (
      <Drawer title={asset.name ? asset.name : asset.id} placement="right" width={400} closable onClose={onClose} visible mask={false}>
        {asset.description && <p>{asset.description}</p>}
        {
        <Collapse accordion>
          <Panel header={`Contextualized timeseries (${timeseries.length})`} key="timeseries">
            <Button type="primary">Add timeseries</Button>
            {timeseries.map(ts => (<div key={ts.id}>{ts.name}</div>))}
          </Panel>
          <Panel header={`Contextualized events (${events.length})`} key="events">
            {events.map(event => (<div key={event.id}>{event.name}</div>))}
          </Panel>
        </Collapse>
        }
      </Drawer>
    )
  }
}
AssetDrawer.propTypes = {
  modelId: PropTypes.number.isRequired,
  revisionId: PropTypes.number.isRequired,
  nodeId: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
}

const mapStateToProps = (state, ownProps) => {
  const { nodeId } = ownProps
  return { }
}
const mapDispatchToProps = (dispatch) => ({
  
})
export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AssetDrawer)
