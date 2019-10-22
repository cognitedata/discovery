/* eslint no-param-reassign: ["error", { "props": false }] */
import React from 'react';
import { Upload, Icon, Button, Modal, message } from 'antd';
import UploadGCS from 'gcs-browser-upload';
import mime from 'mime-types';
import { UploadFileMetadataResponse } from '@cognite/sdk';
import styled from 'styled-components';
import { UploadFile } from 'antd/lib/upload/interface';
import { sdk } from '../index';

const ButtonRow = styled.div`
  display: flex;
  margin-top: 20px;

  button:not(:first-child) {
    align-self: start;
    margin-right: 0;
    margin-left: 10px;
  }

  button:last-child {
    align-self: end;
    margin-right: 0;
    margin-left: auto;
  }
`;

const { Dragger } = Upload;
const { confirm } = Modal;

enum STATUS {
  WAITING,
  READY,
  STARTED,
  PAUSED,
}

type Props = {
  assetId?: number;
  validExtensions?: string[];
  onUploadSuccess: (file: UploadFileMetadataResponse) => void;
  onFileListChange: (fileList: UploadFile[]) => void;
  onUploadFailure: (error: string) => void;
  onCancel: () => void;
  beforeUploadStart: () => void;
};

type State = {
  uploadStatus: STATUS;
  fileList: UploadFile[];
};

const defaultState = {
  uploadStatus: STATUS.WAITING,
  fileList: [],
};

class FileUploader extends React.Component<Props, State> {
  currentUploads: { [key: string]: any };

  public static defaultProps = {
    onUploadSuccess: () => {},
    onUploadFailure: message.error,
    onCancel: () => {},
    beforeUploadStart: () => {},
    onFileListChange: () => {},
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      uploadStatus: STATUS.WAITING,
      fileList: [],
    };
    this.currentUploads = {};
  }

  get uploadButtons() {
    let uploaderButton;

    switch (this.state.uploadStatus) {
      case STATUS.WAITING:
        uploaderButton = (
          <Button type="primary" icon="cloud-upload" disabled>
            Upload
          </Button>
        );
        break;
      case STATUS.READY:
        uploaderButton = (
          <>
            <Button
              type="primary"
              onClick={this.startUpload}
              icon="cloud-upload"
            >
              Upload
            </Button>
          </>
        );
        break;
      case STATUS.STARTED:
        uploaderButton = (
          <>
            <Button onClick={this.stopUpload}>Cancel Upload</Button>
            <Button type="primary" onClick={this.pauseUpload} icon="loading">
              Pause Upload
            </Button>
          </>
        );
        break;
      case STATUS.PAUSED:
        uploaderButton = (
          <>
            <Button onClick={this.stopUpload}>Cancel Upload</Button>
            <Button type="primary" onClick={this.unpauseUpload}>
              Continue Upload
            </Button>
          </>
        );
        break;
      default:
        uploaderButton = null;
    }

    return <ButtonRow>{uploaderButton}</ButtonRow>;
  }

  getMIMEType = (fileURI: string) => mime.lookup(fileURI);

  setupFilesBeforeUpload = (file: any) => {
    if (
      this.props.validExtensions === undefined ||
      this.props.validExtensions.length === 0 ||
      this.props.validExtensions.includes(
        file.name
          .split('.')
          .pop()
          .toLowerCase()
      )
    ) {
      this.setState(
        state => ({
          ...state,
          fileList: [...state.fileList, file],
          uploadStatus: STATUS.READY,
        }),
        () => {
          this.props.onFileListChange(this.state.fileList);
        }
      );
    } else {
      this.setState(defaultState);
      message.error(`${file.name} has an invalid extension`);
    }

    // false stops them from automatically using their upload functionaility
    return false;
  };

  startUpload = async () => {
    const { assetId } = this.props;
    if (this.state.uploadStatus !== STATUS.READY) {
      return;
    }

    try {
      this.props.beforeUploadStart();
    } catch (e) {
      this.props.onUploadFailure('Unable to start upload');
      return;
    }

    message.info('Starting Upload...');

    this.state.fileList.forEach(async file => {
      const mimeType = this.getMIMEType(file.name);
      if (!mimeType) {
        this.props.onUploadFailure(
          `Unable to detect file type for ${file.name}`
        );
        return;
      }

      const fileMetadata = (await sdk.files.upload({
        name: file.name,
        mimeType,
        source: 'Discovery',
        ...(assetId && { assetIds: [assetId] }),
      })) as UploadFileMetadataResponse;
      const { uploadUrl, id } = fileMetadata;

      if (!uploadUrl || !id) {
        this.props.onUploadFailure('Unable to create file');
        return;
      }

      file.status = 'uploading';
      file.percent = 0;

      this.setState(state => ({
        ...state,
        fileList: state.fileList.map(el => {
          if (el.uid === file.uid) {
            return file;
          }
          return el;
        }),
      }));

      // This is what is recommended from google when uploading files.
      // https://github.com/QubitProducts/gcs-browser-upload
      const chunkMultiple = Math.min(
        Math.max(
          2, // 0.5MB min chunks
          Math.ceil((file.size / 20) * 262144) // will divide into 20 segments
        ),
        200 // 50 MB max
      );

      this.currentUploads[file.uid] = new UploadGCS({
        id: 'discovery-upload',
        url: uploadUrl,
        file,
        chunkSize: 262144 * chunkMultiple,
        onChunkUpload: (info: any) => {
          file.response = info;
          file.percent = (info.uploadedBytes / info.totalBytes) * 100;

          this.setState(state => ({
            ...state,
            fileList: state.fileList.map(el => {
              if (el.uid === file.uid) {
                return file;
              }
              return el;
            }),
          }));
        },
      });

      this.setState({ uploadStatus: STATUS.STARTED });

      try {
        await this.currentUploads[file.uid].start();
      } catch (e) {
        console.error(e);
        message.error('Unable to upload file to server.');
      }

      this.setState(state => ({
        ...state,
        fileList: state.fileList.filter(el => el.uid !== file.uid),
        uploadStatus:
          state.fileList.length === 1 ? STATUS.WAITING : state.uploadStatus,
      }));

      this.props.onUploadSuccess(fileMetadata);

      this.currentUploads[file.uid].meta.reset(); // clears the locally stored metadata
      this.setState({});
    });
  };

  stopUpload = () => {
    this.state.fileList.forEach(file => {
      if (
        this.state.uploadStatus === STATUS.PAUSED ||
        this.state.uploadStatus === STATUS.STARTED
      ) {
        confirm({
          title: 'Do you want to cancel the file upload?',
          content: 'If you cancel, the file upload will be cancelled!',
          onOk: () => {
            this.currentUploads[file.uid].cancel();
            this.currentUploads[file.uid].meta.reset();
            this.setState(defaultState);
          },
          onCancel: () => {
            this.props.onCancel();
          },
        });
      } else {
        if (this.currentUploads[file.uid]) {
          this.currentUploads[file.uid].cancel();
          this.currentUploads[file.uid].meta.reset();
        }
        this.props.onCancel();
        this.setState(defaultState);
      }
    });
  };

  pauseUpload = () => {
    if (this.state.uploadStatus === STATUS.STARTED) {
      this.state.fileList.forEach(file => {
        this.currentUploads[file.uid].pause();
      });
      this.setState({
        uploadStatus: STATUS.PAUSED,
      });
    }
  };

  unpauseUpload = () => {
    if (this.state.uploadStatus === STATUS.PAUSED) {
      this.state.fileList.forEach(file => {
        this.currentUploads[file.uid].unpause();
      });

      this.setState({
        uploadStatus: STATUS.STARTED,
      });
    }
  };

  removeFile = (file: UploadFile) => {
    this.setState(
      state => ({
        ...state,
        fileList: state.fileList.filter(el => el.uid !== file.uid),
      }),
      () => {
        this.props.onFileListChange(this.state.fileList);
      }
    );
  };

  render() {
    return (
      <div>
        <Dragger
          name="file"
          multiple
          onRemove={this.removeFile}
          beforeUpload={this.setupFilesBeforeUpload}
          fileList={this.state.fileList}
        >
          <p className="ant-upload-drag-icon">
            <Icon type="file-add" />
          </p>
          <p className="ant-upload-text">
            Click or drag file to this area to upload, will begin upload when
            you click the Upload button.
          </p>
        </Dragger>
        {this.props.children}
        {this.uploadButtons}
      </div>
    );
  }
}

export default FileUploader;
