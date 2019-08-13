import React from 'react';
import { connect } from 'react-redux';
import { Modal, Button, Select } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { addTypesToAsset, Type } from '../modules/types';
import { ExtendedAsset } from '../modules/assets';

const { Option } = Select;

type Props = {
  asset: ExtendedAsset;
  assetId: number;
  types: Type[];
  onClose: (e: any) => void;
  doAddTypesToAsset: typeof addTypesToAsset;
};

type State = {};

class AddTypes extends React.Component<Props, State> {
  selectedIds = [];

  selectedTypes: Type[] = [];

  addToAsset = () => {
    this.props.doAddTypesToAsset(this.selectedTypes, this.props.asset);
  };

  typesChanged = (change: string[]) => {
    // Convert allTypes array to object with id as key
    const typesByName: { [key: string]: Type } = this.props.types.reduce(
      (obj: { [key: string]: Type }, type) => {
        // eslint-disable-next-line no-param-reassign
        obj[type.name] = type;
        return obj;
      },
      {}
    );

    this.selectedTypes = change.map(name => typesByName[name]);
  };

  render() {
    const existingTypeIds = this.props.asset.types.map(type => type.id);
    const nonUsedTypes = this.props.types.filter(
      type => existingTypeIds.indexOf(type.id) === -1
    );

    return (
      <Modal
        visible
        title="Add types"
        onCancel={this.props.onClose}
        footer={[
          <Button key="submit" type="primary" onClick={this.addToAsset}>
            Add to asset
          </Button>,
        ]}
      >
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Please select"
          onChange={this.typesChanged}
        >
          {nonUsedTypes.map(type => (
            <Option key={type.id} value={type.name}>
              {type.description}
            </Option>
          ))}
        </Select>
        ,
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
      doAddTypesToAsset: addTypesToAsset,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AddTypes);
