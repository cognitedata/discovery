import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Modal, Button, Select } from 'antd';
import { addTypesToAsset, Type } from '../modules/types';
import { Asset } from '../modules/assets';

const { Option } = Select;

class AddTypes extends React.Component {
  state = {};

  selectedIds = [];

  addToAsset = () => {
    this.props.doAddTypesToAsset(this.selectedTypes, this.props.asset);
  };

  typesChanged = change => {
    // Convert allTypes array to object with id as key
    const typesByName = this.props.types.reduce((obj, type) => {
      obj[type.name] = type;
      return obj;
    }, {});

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

AddTypes.propTypes = {
  asset: Asset.isRequired,
  types: PropTypes.arrayOf(Type).isRequired,
  onClose: PropTypes.func.isRequired,
  doAddTypesToAsset: PropTypes.func.isRequired,
};

const mapStateToProps = (_, ownProps) => {
  const { assetId, timeseries } = ownProps;
  return {
    assetId: Number(assetId),
    timeseries,
  };
};

const mapDispatchToProps = dispatch => ({
  doAddTypesToAsset: (...args) => dispatch(addTypesToAsset(...args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AddTypes);
