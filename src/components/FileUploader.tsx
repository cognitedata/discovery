import React from 'react';
import { Upload, Icon, Button, Modal, message } from 'antd';
import UploadGCS from 'gcs-browser-upload';
import mime from 'mime-types';
import { UploadFileMetadataResponse } from '@cognite/sdk';
import styled from 'styled-components';
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
  onUploadSuccess: (fileId: number) => void;
  onUploadFailure: (error: string) => void;
  onCancel: () => void;
  beforeUploadStart: () => void;
};

type State = {
  uploadStatus: STATUS;
  fileList: any[];
};

const defaultState = {
  uploadStatus: STATUS.WAITING,
  fileList: [],
};

class FileUploader extends React.Component<Props, State> {
  public static defaultProps = {
    onUploadSuccess: () => {},
    onUploadFailure: message.error,
    onCancel: () => {},
    beforeUploadStart: () => {},
  };

  currentUpload: any;

  constructor(props: Props) {
    super(props);

    this.state = {
      uploadStatus: STATUS.WAITING,
      fileList: [],
    };
    this.currentUpload = null;
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
      this.setState({
        fileList: [file],
        uploadStatus: STATUS.READY,
      });
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
      await this.props.beforeUploadStart();
    } catch (e) {
      this.props.onUploadFailure('Unable to start upload');
      return;
    }

    message.info('Starting Upload...');

    const file = this.state.fileList[0];

    const mimeType = this.getMIMEType(file.name);
    if (!mimeType) {
      this.props.onUploadFailure('Unable to detect file type');
      return;
    }

    const { uploadUrl, id } = (await sdk.files.upload({
      name: file.name,
      mimeType,
      source: 'Discovery',
      ...(assetId && { assetIds: [assetId] }),
    })) as UploadFileMetadataResponse;

    if (!uploadUrl || !id) {
      this.props.onUploadFailure('Unable to create file');
      return;
    }

    const chunkMultiple = Math.min(
      Math.max(
        2, // 0.5MB min chunks
        Math.ceil((file.size / 20) * 262144) // will divide into 20 segments
      ),
      200 // 50 MB max
    );

    this.currentUpload = new UploadGCS({
      id: 'discovery-upload',
      url: uploadUrl,
      file,
      chunkSize: 262144 * chunkMultiple,
      onChunkUpload: (info: any) => {
        if (file.status !== 'uploading') {
          file.status = 'uploading';
        }
        file.response = info;
        file.percent = (info.uploadedBytes / info.totalBytes) * 100;

        this.setState({ fileList: [file] });
      },
    });

    this.setState({ uploadStatus: STATUS.STARTED });

    try {
      await this.currentUpload.start();
    } catch (e) {
      // catch CORS errors
    }

    this.props.onUploadSuccess(id);

    message.success(
      'Upload complete, starting processing job to render 3d model!'
    );

    this.currentUpload.meta.reset(); // clears the locally stored metadata
    this.setState({});
  };

  stopUpload = () => {
    if (
      this.state.uploadStatus === STATUS.PAUSED ||
      this.state.uploadStatus === STATUS.STARTED
    ) {
      confirm({
        title: 'Do you want to cancel the job?',
        content: 'If you cancel, the file upload will be cancelled!',
        onOk: () => {
          this.currentUpload.cancel();
          this.currentUpload.meta.reset();
          this.setState(defaultState);
        },
        onCancel: () => {
          this.props.onCancel();
        },
      });
    } else {
      if (this.currentUpload) {
        this.currentUpload.cancel();
        this.currentUpload.meta.reset();
      }
      this.props.onCancel();
      this.setState(defaultState);
    }
  };

  pauseUpload = () => {
    if (this.state.uploadStatus === STATUS.STARTED) {
      this.currentUpload.pause();

      this.setState({
        uploadStatus: STATUS.PAUSED,
      });
    }
  };

  unpauseUpload = () => {
    if (this.state.uploadStatus === STATUS.PAUSED) {
      this.currentUpload.unpause();

      this.setState({
        uploadStatus: STATUS.STARTED,
      });
    }
  };

  removeFile = () => {
    this.setState(defaultState);
  };

  render() {
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
            <Button onClick={this.stopUpload}>Cancel</Button>
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
            <Button onClick={this.stopUpload}>Cancel</Button>
            <Button type="primary" onClick={this.pauseUpload} icon="loading">
              Pause Upload
            </Button>
          </>
        );
        break;
      case STATUS.PAUSED:
        uploaderButton = (
          <>
            <Button onClick={this.stopUpload}>Cancel</Button>
            <Button type="primary" onClick={this.unpauseUpload}>
              Continue Upload
            </Button>
          </>
        );
        break;
      default:
        uploaderButton = null;
    }

    return (
      <div>
        <Dragger
          name="file"
          multiple={false}
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
        <ButtonRow>{uploaderButton}</ButtonRow>
      </div>
    );
  }
}

export default FileUploader;

// const { Dragger } = Upload;

// const onFileUploadChange = (info: UploadChangeParam) => {
//   const { status } = info.file;
//   if (status !== 'uploading') {
//     // console.log(info.file, info.fileList);
//   }
//   if (status === 'done') {
//     message.success(`${info.file.name} file uploaded successfully.`);
//   } else if (status === 'error') {
//     message.error(`${info.file.name} file upload failed.`);
//   }
// };

// const uploadFile = async (
//   request: any,
//   onUploadSuccess: (fileId: number) => void,
//   assetId?: number
// ) => {
//   const { file } = request;
//   const reader = new FileReader();
//   // Specify the handler for the `load`  event
//   // @ts-ignore
//   reader.onload = async (e: ProgressEvent<FileReader>) => {
//     try {
//       const response = await sdk.files.upload(
//         {
//           name: file.name,
//           mimeType: file.type === '' ? undefined : file.type,
//           source: 'Discovery',
//           ...(assetId && { assetIds: [assetId] }),
//         },
//         e.target!.result,
//         true,
//         true
//       );

//       const fileId = response.id;
//       trackUsage('FileUploader.Success', {
//         fileName: file.name,
//         fileId,
//         fileType: file.type,
//         fileSize: file.size,
//       });
//       onUploadSuccess(fileId);
//       request.onSuccess();
//     } catch (error) {
//       trackUsage('FileUploader.Error', {
//         fileName: file.name,
//         fileType: file.type,
//         fileSize: file.size,
//         errorName: error.name,
//         errorMessage: error.message,
//       });
//       request.onError();
//     }
//   };

//   reader.readAsArrayBuffer(file);
// };

// const FileUploader = ({
//   onUploadSuccess,
//   assetId,
// }: {
//   onUploadSuccess: (fileId: number) => void;
//   assetId?: number;
// }) => {
//   return (
//     <Dragger
//       onChange={onFileUploadChange}
//       customRequest={request => uploadFile(request, onUploadSuccess, assetId)}
//       multiple={false}
//     >
//       <p className="ant-upload-drag-icon">
//         <Icon type="inbox" />
//       </p>
//       <p className="ant-upload-text">
//         Click or drag file to this area to upload
//       </p>
//     </Dragger>
//   );
// };

// export default FileUploader;
