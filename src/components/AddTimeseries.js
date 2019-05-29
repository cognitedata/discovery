import React from 'react'
import { connect } from 'react-redux';
import PropTypes from 'prop-types'
import { Modal, Button } from 'antd';

class AddTimeseries extends React.Component {
  state = {
    assetId: null,
  };

  render() {
    return (
      <Modal
        visible={true}
        title="Title"
        onOk={this.props.onClose}
        onCancel={this.props.onClose}
        footer={[
          <Button key="submit" type="primary" onClick={this.props.onClose}>
            Submit
          </Button>,
        ]}
      >
        <p>Some contents...</p>
        <p>Some contents...</p>
        <p>Some contents...</p>
        <p>Some contents...</p>
        <p>Some contents...</p>
      </Modal>
    )
  }
}

AddTimeseries.propTypes = {
  assetId:  PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
}

const mapStateToProps = (_, ownProps) => {
  console.log('ownProps: ', ownProps);
  const { assetId } = ownProps;
  return {
    assetId: Number(assetId),
  }
}

export default connect(mapStateToProps)(AddTimeseries);
