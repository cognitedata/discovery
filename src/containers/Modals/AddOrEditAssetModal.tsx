import React from 'react';
import { connect } from 'react-redux';
import { Modal, Button, Input } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import AssetSelect from 'components/AssetSelect';
import { Asset } from '@cognite/sdk';
import styled from 'styled-components';
import { ExtendedAsset, addAssetsToState } from '../../modules/assets';
import { sdk } from '../../index';

const FormWrapper = styled.div`
  p {
    margin-top: 12px;
    margin-bottom: 8px;
  }
`;

type Props = {
  asset?: ExtendedAsset;
  onClose: (asset?: Asset) => void;
  addAssetsToState: typeof addAssetsToState;
};

type State = {
  name: string;
  assetId?: number;
  description?: string;
  externalId?: string;
};

class AddChildAsset extends React.Component<Props, State> {
  readonly state: Readonly<State> = {
    name: '',
  };

  componentDidMount() {
    const { asset } = this.props;
    if (asset) {
      this.setState({
        name: asset.name,
        assetId: asset.parentId,
        description: asset.description,
        externalId: asset.externalId,
      });
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { asset } = this.props;
    if (asset && prevProps.asset !== asset) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        name: asset.name,
        assetId: asset.parentId,
        description: asset.description,
        externalId: asset.externalId,
      });
    }
  }

  addChild = async () => {
    const { assetId, name, description, externalId } = this.state;
    if (name) {
      if (this.props.asset) {
        const [asset] = await sdk.assets.update([
          {
            id: this.props.asset.id,
            update: {
              name: {
                set: name,
              },
              description: description
                ? {
                    set: description,
                  }
                : { setNull: true },
              ...(assetId && {
                parentId: {
                  set: assetId,
                },
              }),
              externalId: externalId
                ? {
                    set: externalId,
                  }
                : { setNull: true },
            },
          },
        ]);
        this.props.addAssetsToState([asset]);
        this.props.onClose(asset);
      } else {
        const [asset] = await sdk.assets.create([
          {
            name,
            description,
            parentId: assetId,
            externalId,
            source: 'Discovery',
          },
        ]);
        this.props.addAssetsToState([asset]);
        this.props.onClose(asset);
      }
    }
  };

  render() {
    const { assetId, name, description, externalId } = this.state;
    return (
      <Modal
        visible
        title={this.props.asset ? 'Update Asset' : 'Create Asset'}
        onCancel={() => this.props.onClose()}
        footer={[
          <Button key="submit" type="primary" onClick={this.addChild}>
            {this.props.asset ? 'Update Asset' : 'Create Asset'}
          </Button>,
        ]}
      >
        <FormWrapper>
          <p>Name*</p>
          <Input
            style={{ width: '100%' }}
            placeholder="Name"
            value={name}
            required
            onChange={e => this.setState({ name: e.target.value })}
          />
          <p>Parent Asset</p>
          <AssetSelect
            style={{ width: '100%' }}
            selectedAssetIds={assetId ? [assetId] : []}
            onAssetSelected={ids => this.setState({ assetId: ids[0] })}
          />
          <p>External ID</p>
          <Input
            style={{ width: '100%' }}
            placeholder="External ID"
            value={externalId}
            onChange={e => this.setState({ externalId: e.target.value })}
          />
          <p>Description</p>
          <Input
            style={{ width: '100%' }}
            placeholder="Description"
            value={description}
            onChange={e => this.setState({ description: e.target.value })}
          />
        </FormWrapper>
      </Modal>
    );
  }
}

const mapStateToProps = () => {
  return {};
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      addAssetsToState,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(AddChildAsset);
