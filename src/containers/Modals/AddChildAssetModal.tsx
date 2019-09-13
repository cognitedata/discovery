import React from 'react';
import { connect } from 'react-redux';
import { Modal, Button, Input, message } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { ExtendedAsset, createNewAsset } from '../../modules/assets';

type Props = {
  asset: ExtendedAsset;
  assetId: number;
  onClose: (e?: any) => void;
  createNewAsset: typeof createNewAsset;
};

type State = { name: string };

class AddChildAsset extends React.Component<Props, State> {
  state = {
    name: '',
  };

  addChild = () => {
    this.props.createNewAsset({
      name: this.state.name,
      parentId: this.props.assetId,
      source: 'Discovery',
    });
    message.info('Adding asset...');
    this.props.onClose();
  };

  render() {
    return (
      <Modal
        visible
        title="Add child"
        onCancel={this.props.onClose}
        footer={[
          <Button key="submit" type="primary" onClick={this.addChild}>
            Add Child
          </Button>,
        ]}
      >
        <Input
          style={{ width: '100%' }}
          placeholder="Please add a name for the child"
          onChange={e => this.setState({ name: e.target.value })}
        />
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
      createNewAsset,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AddChildAsset);
