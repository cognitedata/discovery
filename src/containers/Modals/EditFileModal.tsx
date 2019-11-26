import React from 'react';
import { connect } from 'react-redux';
import { Modal, Button, message, Input } from 'antd';
import { bindActionCreators, Dispatch } from 'redux';
import { FilesMetadata } from '@cognite/sdk';
import styled from 'styled-components';
import AssetSelect from 'components/AssetSelect';
import AceEditor from 'react-ace';
import { RootState } from '../../reducers/index';
import 'brace/theme/github';
import 'brace/mode/json';
import { updateFile } from '../../modules/files';

const FormDetails = styled.div`
  p {
    margin-bottom: 6px;
    margin-top: 12px;
  }
`;

type Props = {
  file: FilesMetadata;
  onClose: (e?: any) => void;
  updateFile: typeof updateFile;
};

type State = {
  assetIds: number[];
  mimeType?: string;
  metadata?: string;
};

class EditFileModal extends React.Component<Props, State> {
  source?: string;

  constructor(props: Props) {
    super(props);

    const { file } = props;
    const { assetIds, mimeType, metadata } = file;

    if (metadata && metadata.COGNITE__SOURCE) {
      this.source = metadata.COGNITE__SOURCE;
      delete metadata.COGNITE__SOURCE;
    }

    this.state = {
      metadata: metadata ? JSON.stringify(metadata, null, 2) : undefined,
      assetIds: assetIds || [],
      mimeType,
    };
  }

  saveChanges = () => {
    const { mimeType, assetIds, metadata } = this.state;
    let metadataParsed;
    try {
      metadataParsed = metadata ? JSON.parse(metadata) : undefined;
    } catch (e) {
      message.error('Invalid metadata JSON');
      return;
    }
    this.props.updateFile({
      id: this.props.file.id,
      update: {
        assetIds: {
          set: assetIds,
        },
        ...(mimeType && {
          mimeType: {
            set: mimeType,
          },
        }),
        ...(metadata && {
          metadata: {
            set: {
              ...(this.source && { COGNITE__SOURCE: this.source }),
              ...metadataParsed,
            },
          },
        }),
      },
    });
    message.info('Updating file...');
    this.props.onClose();
  };

  updateAssetIds = (assetIds: number[]) => {
    this.setState({ assetIds });
  };

  render() {
    const { metadata, mimeType, assetIds } = this.state;
    return (
      <Modal
        visible
        title={`Edit File: ${this.props.file.name}`}
        onCancel={this.props.onClose}
        footer={[
          <Button key="submit" type="primary" onClick={this.saveChanges}>
            Update File
          </Button>,
        ]}
      >
        <FormDetails>
          <p>Linked Assets</p>
          <AssetSelect
            onAssetSelected={this.updateAssetIds}
            selectedAssetIds={assetIds}
          />
          <p>Mime Type</p>
          <Input
            value={mimeType}
            placeholder="Mime Type"
            onChange={ev => this.setState({ mimeType: ev.target.value })}
          />
          <p>Metadata</p>
          <AceEditor
            mode="json"
            width="100%"
            theme="github"
            value={metadata}
            onChange={newValue => this.setState({ metadata: newValue })}
            editorProps={{ $blockScrolling: true }}
          />
        </FormDetails>
      </Modal>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return { assets: state.assets.all };
};

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      updateFile,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditFileModal);
