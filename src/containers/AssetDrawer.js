import React from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import { Drawer, Spin, List, Collapse, Button } from 'antd'
import styled from 'styled-components';
import { getAssetIdFromNodeId } from '../helpers/assetMappings'
import makeCancelable from 'makecancelable';
import { Route } from 'react-router-dom';
import * as sdk from '@cognite/sdk';
import AddTimeseries from '../components/AddTimeseries';

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
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime
        }));
        console.log('Got ', events)
        this.setState({ events });
      }));
  }

  addTimeseries = () => {
    const { match, history, nodeId } = this.props;
    history.push(`${match.url}/node/${nodeId}/addTimeseries`); 
  }

  addEvents = () => {
    this.setState({ showAddEvents: true })
  }

  onAddClose = () => {
    const { match, history, nodeId } = this.props;
    history.push(`${match.url}/node/${nodeId}`); 
  }

  render() {
    const { onClose, match } = this.props
    const { asset, timeseries = [], events = [] } = this.state;
    
    if (asset == null) {
      return (
        <SpinContainer>
          <Spin />
        </SpinContainer>
      );
    }

    return (
      <>
      {asset != null && <Route exact path={`${match.url}/node/:nodeId/addtimeseries`} render={props => {
        return (
          <AddTimeseries
            assetId={asset.id}
            onClose={this.onAddClose}
          />
        );}}
      />}
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
            {events.map(event => (<div key={event.id}>{event.description}</div>))}
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
  return { }
}
const mapDispatchToProps = (dispatch) => ({
  
})
export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AssetDrawer)
