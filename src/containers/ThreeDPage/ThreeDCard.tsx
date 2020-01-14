import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, Tabs, Popconfirm } from 'antd';
import { push } from 'connected-react-router';
import { Asset, RevealNode3D } from '@cognite/sdk';
import BottomRightCard from 'components/BottomRightCard';
import AssetSelect from 'components/AssetSelect';
import { RootState } from '../../reducers/index';
import { selectThreeD, ThreeDState } from '../../modules/threed';
import {
  selectAssetById,
  ExtendedAsset,
  fetchAsset,
} from '../../modules/assets';

type OrigProps = {
  selectedItem: {
    asset?: Asset;
    node?: RevealNode3D;
  };
  rootId?: number;
  showingAllUnderAsset: boolean;
  onClose: () => void;
  onDeleteMapping: () => void;
  onViewAllUnderAsset: (id: number) => void;
  onViewAsset: () => void;
  onViewParent: () => void;
  onAddMappingClicked: (rootId: number, assetId: number) => void;
};

type Props = {
  rootAsset: ExtendedAsset | undefined;
  threed: ThreeDState;
  fetchAsset: typeof fetchAsset;
  push: typeof push;
} & OrigProps;

type State = {
  rootId?: number;
  assetId?: number;
};

class ThreeDCard extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    if (!this.props.rootAsset && this.props.rootId) {
      this.props.fetchAsset(this.props.rootId);
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.rootId !== prevProps.rootId &&
      !this.props.rootAsset &&
      this.props.rootId
    ) {
      this.props.fetchAsset(this.props.rootId);
    }
  }

  get rootId() {
    return this.props.rootId || this.state.rootId;
  }

  onAddMappingClicked = () => {
    this.props.onAddMappingClicked(this.rootId!, this.state.assetId!);
  };

  render() {
    const { selectedItem, rootAsset, showingAllUnderAsset } = this.props;
    const { assetId } = this.state;
    const { node, asset } = selectedItem;

    return (
      <BottomRightCard title="Selected Node" onClose={this.props.onClose}>
        <>
          {node ? (
            <>
              <p>
                <strong>{node.name}</strong>
              </p>
              <div className="button-row">
                <Button onClick={this.props.onViewParent}>Select Parent</Button>
              </div>
            </>
          ) : (
            <>
              <p>
                <strong>All Nodes under Asset</strong>
              </p>
            </>
          )}
          <Tabs>
            <Tabs.TabPane
              key="asset"
              tab="Asset info"
              disabled={!asset && !rootAsset}
            >
              {asset && (
                <>
                  <h4>{asset.name}</h4>
                  <strong>Description</strong>
                  <p>{asset.description || 'N/A'}</p>
                </>
              )}
              {rootAsset && (
                <>
                  <strong>Root Asset</strong>
                  <p>{rootAsset.name}</p>
                  <p>ID: {rootAsset.id}</p>
                </>
              )}
              {asset && (
                <div className="button-row">
                  <Button type="primary" onClick={this.props.onViewAsset}>
                    View Asset
                  </Button>
                  <Button
                    onClick={() => this.props.onViewAllUnderAsset(asset.id)}
                    disabled={showingAllUnderAsset}
                  >
                    View All Nodes Linked to Asset
                  </Button>
                </div>
              )}
            </Tabs.TabPane>
            <Tabs.TabPane
              key="node"
              tab="Edit node"
              disabled={showingAllUnderAsset}
            >
              {asset && (
                <Popconfirm
                  title="Are you sure you want to unmap the 3D node?"
                  onConfirm={this.props.onDeleteMapping}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="danger">Unmap Node</Button>
                </Popconfirm>
              )}
              {!rootAsset && (
                <>
                  <p>Root Asset</p>
                  <AssetSelect
                    style={{ width: '100%', marginBottom: '8px' }}
                    rootOnly
                    onAssetSelected={ids => this.setState({ rootId: ids[0] })}
                    selectedAssetIds={this.rootId ? [this.rootId] : []}
                  />
                </>
              )}
              <p>Select an Asset</p>
              <AssetSelect
                style={{ width: '100%', marginBottom: '8px' }}
                disabled={!this.rootId}
                filter={
                  this.rootId
                    ? { filter: { rootIds: [{ id: this.rootId }] } }
                    : {}
                }
                onAssetSelected={ids => this.setState({ assetId: ids[0] })}
                selectedAssetIds={assetId ? [assetId] : []}
              />
              <div className="button-row">
                <Button disabled={!assetId} onClick={this.onAddMappingClicked}>
                  Confirm Mapping
                </Button>
              </div>
            </Tabs.TabPane>
          </Tabs>
        </>
      </BottomRightCard>
    );
  }
}

const mapStateToProps = (state: RootState, ownProps: OrigProps) => {
  return {
    threed: selectThreeD(state),
    rootAsset: ownProps.rootId
      ? selectAssetById(state, ownProps.rootId)
      : undefined,
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators({ push, fetchAsset }, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(ThreeDCard);
