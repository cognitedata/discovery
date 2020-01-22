import React from 'react';
import { connect } from 'react-redux';
import { Modal, Button } from 'antd';
import { GetTimeSeriesMetadataDTO } from '@cognite/sdk';
import { Dispatch, bindActionCreators } from 'redux';
import { ExtendedAsset } from '../../modules/assets';
import { sdk } from '../../index';
import FileSelect from '../../components/FileSelect';
import { addFilesToState } from '../../modules/files';
import { canEditFiles } from '../../utils/PermissionsUtils';

type OrigProps = {
  asset: ExtendedAsset;
  fileIds: number[];
  onClose: () => void;
};

type Props = {
  addFilesToState: typeof addFilesToState;
} & OrigProps;

type State = {
  selectedFileIds: any[];
};

class LinkFileModal extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      selectedFileIds: this.props.fileIds,
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.fileIds !== this.props.fileIds) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ selectedFileIds: this.props.fileIds });
    }
  }

  addToAsset = async () => {
    if (
      this.state.selectedFileIds &&
      this.state.selectedFileIds.length > 0 &&
      canEditFiles()
    ) {
      const timeseries = await sdk.files.update(
        this.state.selectedFileIds.map(id => ({
          id,
          update: {
            assetIds: { add: [this.props.asset.id] },
          },
        }))
      );
      this.props.addFilesToState(timeseries);
      this.props.onClose();
    }
  };

  timeseriesFilter = (timeseries: GetTimeSeriesMetadataDTO) => {
    return !timeseries.assetId;
  };

  render() {
    return (
      <Modal
        visible
        title={`Link Asset (${this.props.asset.name}) to File`}
        onCancel={this.props.onClose}
        footer={[
          <Button
            key="submit"
            type="primary"
            onClick={this.addToAsset}
            disabled={!canEditFiles(false)}
          >
            Link to asset
          </Button>,
        ]}
      >
        <FileSelect
          multiple
          style={{ width: '100%' }}
          onFileSelected={ids => this.setState({ selectedFileIds: ids })}
          selectedFileIds={this.state.selectedFileIds}
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
      addFilesToState,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(LinkFileModal);
