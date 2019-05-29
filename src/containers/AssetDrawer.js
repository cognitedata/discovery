import React from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import { Drawer } from 'antd'
import CommentSection from '../components/CommentSection'
import { fetchComments, submitComment } from '../actions/comments'
import { getAssetIdFromNodeId } from '../helpers/assetMappings'
import { Comments } from '../reducers/comments'
import { selectComments } from '../selectors/comments'
import makeCancelable from 'makecancelable';
import * as sdk from '@cognite/sdk';

class AssetDrawer extends React.Component {
  state = {};

  componentDidMount() {
    this.fetchAssetMapping();
  }

  componentWillUnmount() {
    this.assetMappingPromise();
  }

  componentDidUpdate(prevProps, prevState) {
    const { nodeId } = this.props;
    if (prevProps.nodeId !== nodeId) {
      this.fetchAssetMapping();
    }

    const { assetId } = this.state;
    if (prevState.assetId !== assetId) {
      console.log('Got new asset id: ', assetId);
      this.fetchTimeseries();
      this.fetchEvents();
    }
  }

  fetchAssetMapping = async () => {
    const { modelId, revisionId, nodeId } = this.props;
    this.assetMappingPromise = makeCancelable(
      getAssetIdFromNodeId(modelId, revisionId, nodeId).then(assetId => {
        this.assetPromise = makeCancelable(sdk.Assets.retrieve(assetId).then(asset => {
          console.log('Got ', asset);
          this.setState({asset: {id: assetId, name: asset.name, description: asset.description}});
          console.log('Found ', {id: assetId, name: asset.name, description: asset.description});
        }));
      }));
    
  }

  fetchTimeseries = async () => {
    this.setState({timeseries: []});
    
    const { assetId } = this.state;
    this.promises.push(makeCancelable(
      sdk.TimeSeries.list({assetId}).then(result => {
        const timeseries = result.items.map(ts => ({
          id: ts.id,
          name: ts.name
        }));
        this.setState({ timeseries });
      })));
  }

  fetchEvents = async () => {

  }

  render() {
    const { comments, onClose } = this.props
    const { asset } = this.state;
    return (
      <Drawer title="Comments" placement="right" width={400} closable onClose={onClose} visible mask={false}>
        {asset != null && (
          <h3>{asset.name ? asset.name : asset.id}</h3>
        )}
      </Drawer>
    )
  }
}
AssetDrawer.propTypes = {
  modelId: PropTypes.number.isRequired,
  revisionId: PropTypes.number.isRequired,
  nodeId: PropTypes.number.isRequired,
  comments: Comments.isRequired,
  onClose: PropTypes.func.isRequired,
}

const mapStateToProps = (state, ownProps) => {
  const { nodeId } = ownProps
  return {
    comments: selectComments(state, nodeId),
  }
}
const mapDispatchToProps = (dispatch) => ({
  
})
export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AssetDrawer)
