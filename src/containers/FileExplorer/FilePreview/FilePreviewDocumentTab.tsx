import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Button, message, Spin, Table, Icon, Divider } from 'antd';
import styled from 'styled-components';
import { BetaTag } from 'components/BetaWarning';
import { Asset, UploadFileMetadataResponse } from '@cognite/sdk';
import { selectThreeD, ThreeDState } from 'modules/threed';
import { selectAssets, AssetsState } from 'modules/assets';
import { RootState } from 'reducers/index';
import { selectAppState, AppState, setAssetId } from 'modules/app';
import { sdk } from 'index';
import LoaderBPSvg from 'assets/loader-bp.svg';
import { trackUsage } from 'utils/metrics';
import AssetSelect from 'components/AssetSelect';
import { GCSUploader } from 'components/FileUploader';
import { checkForAccessPermission } from 'utils/utils';
import { FilesMetadataWithDownload } from '../FileExplorer';

import 'react-pdf/dist/Page/AnnotationLayer.css';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  && .current {
    background-color: #dfdfdf;
  }
`;

const SpinWrapper = styled.div`
  flex: 1;
  display: flex;
  height: 100%;

  && > * {
    align-self: center;
    margin: 0 auto;
  }

  && img {
    width: 36px;
    height: 36px;
  }
`;

type OrigProps = {
  selectedDocument: FilesMetadataWithDownload;
  setPage: (page: number) => void;
  downloadFile: (url: string) => Promise<Blob>;
  isPnIDParsingAllowed: boolean;
  currentPage: number;
};

type Props = {
  app: AppState;
  assets: AssetsState;
  threed: ThreeDState;
  setAssetId: typeof setAssetId;
} & OrigProps;

type State = {
  filePreviewUrl?: string;
  detectingAsset: boolean;
  assetResults?: { page: number; name: string }[];
  convertingToSvg?: string;
  selectedAssetId?: number;
};

class MapModelToAssetForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      detectingAsset: false,
    };
  }

  detectAssetClicked = async (fileId: number) => {
    this.setState({ detectingAsset: true });
    try {
      trackUsage('FilePreview.DetectAsset', { fileId });
      const response = await sdk.post(
        `/api/playground/projects/${sdk.project}/context/entity_extraction/extract`,
        {
          data: {
            fileId,
          },
        }
      );

      const names: { page: number; name: string }[] = [];
      response.data.items.forEach(
        (match: { entity: string; pages: number[] }) => {
          const name = match.entity;
          match.pages.forEach(page => {
            names.push({ page, name });
          });
        }
      );

      names.sort((a, b) => {
        if (a.page !== b.page) return a.page - b.page;
        return a.name.localeCompare(b.name);
      });

      this.setState({ assetResults: names });
    } catch (e) {
      message.error('Unable to process document, please try again');
      this.setState({ assetResults: undefined, detectingAsset: false });
    }
  };

  convertToPnIDClicked = async (
    fileId: number,
    selectedRootAssetId: number
  ) => {
    if (
      !checkForAccessPermission(
        this.props.app.groups,
        'filesAcl',
        'WRITE',
        true
      )
    ) {
      return;
    }
    trackUsage('FilePreview.ConvertToPnIDClicked', { fileId });
    const { selectedDocument } = this.props;
    let names: string[] = [];
    const countRequest = await sdk.get(
      `/api/playground/projects/${sdk.project}/assets/count?rootIds=[${selectedRootAssetId}]`
    );
    const { count } = countRequest.data;
    let currentCount = 0;
    this.setState({ convertingToSvg: `Loading Assets (0%)` });
    const results = await Promise.all(
      [...Array(20).keys()].map(async index => {
        let items: string[] = [];
        let response = await sdk.assets.list({
          filter: { rootIds: [{ id: selectedRootAssetId }] },
          limit: 1000,
          // @ts-ignore
          partition: `${index + 1}/20`,
        });
        items = items.concat(response.items.map((el: Asset) => el.name));
        currentCount += response.items.length;
        this.setState({
          convertingToSvg: `Loading Assets (${Math.ceil(
            (currentCount / count) * 100
          )}%)`,
        });
        while (response.nextCursor) {
          // eslint-disable-next-line no-await-in-loop
          response = await sdk.assets.list({
            filter: { rootIds: [{ id: selectedRootAssetId }] },
            limit: 1000,
            cursor: response.nextCursor,
            // @ts-ignore
            partition: `${index + 1}/20`,
          });
          items = items.concat(response.items.map((el: Asset) => el.name));
          currentCount += response.items.length;
          this.setState({
            convertingToSvg: `Loading Assets (${Math.ceil(
              (currentCount / count) * 100
            )}%)`,
          });
        }
        return items;
      })
    );
    names = names.concat(results.reduce((prev, el) => prev.concat(el), []));

    this.setState({ convertingToSvg: 'Processing File' });

    try {
      const newJob = await sdk.post(
        `/api/playground/projects/${sdk.project}/context/pnid/parse`,
        {
          data: {
            fileId,
            entities: names,
          },
        }
      );
      if (newJob.status !== 200) {
        message.error('Unable to process file to interactive P&ID');
        this.setState({ convertingToSvg: undefined });
      } else {
        const interval = setInterval(async () => {
          const status = await sdk.get(
            `/api/playground/projects/${sdk.project}/context/pnid/${newJob.data.jobId}`
          );
          if (status.status !== 200) {
            clearInterval(interval);
            message.error('Unable to process file to interactive P&ID');
            this.setState({ convertingToSvg: undefined });
          } else if (status.data.status === 'Failed') {
            clearInterval(interval);
            message.error('Failed to process file to interactive P&ID');
            this.setState({ convertingToSvg: undefined });
          } else if (status.data.status === 'Completed') {
            clearInterval(interval);
            this.setState({ convertingToSvg: 'Uploading Interactive P&ID' });
            const data = await this.props.downloadFile(status.data.svgUrl);
            // @ts-ignore
            const newFile = await sdk.files.upload({
              name: `Processed-${selectedDocument.name.substr(
                0,
                selectedDocument.name.lastIndexOf('.')
              )}.svg`,
              mimeType: 'image/svg+xml',
              assetIds: selectedDocument.assetIds,
              metadata: {
                original_file_id: `${fileId}`,
              },
            });

            const uploader = await GCSUploader(
              data,
              (newFile as UploadFileMetadataResponse).uploadUrl!
            );
            sdk.files.update([
              {
                id: fileId,
                update: {
                  metadata: {
                    set: {
                      ...selectedDocument.metadata,
                      processed_pnid_file_id: `${newFile.id}`,
                    },
                  },
                },
              },
            ]);
            await uploader.start();
            await sdk.post(
              `/api/playground/projects/${sdk.project}/relationships`,
              {
                data: {
                  items: [
                    {
                      source: {
                        resource: 'file',
                        resourceId: `${newFile.id}`,
                      },
                      target: {
                        resource: 'file',
                        resourceId: `${fileId}`,
                      },
                      confidence: 1,
                      dataSet: `discovery-manual-contextualization`,
                      externalId: `${fileId}-manual-pnid-${newFile.id}`,
                      relationshipType: 'belongsTo',
                    },
                  ],
                },
              }
            );
            setTimeout(() => {
              this.setState({ convertingToSvg: undefined });
            }, 1000);
          }
        }, 1000);
      }
    } catch (e) {
      message.error('Unable to convert to P&ID, please try again');
      this.setState({
        assetResults: undefined,
        detectingAsset: false,
        convertingToSvg: undefined,
      });
    }
  };

  onAssetSelected = async (asset: { page: number; name: string }) => {
    trackUsage('FilePreview.DetectAsset.AssetSelected', { asset });
    const [result] = await sdk.assets.search({
      search: { name: asset.name },
    });
    this.props.setAssetId(result.rootId, result.id);
    this.props.setPage(asset.page);
  };

  renderDocumentAssetDetection = () => {
    const { currentPage } = this.props;
    const { assetResults } = this.state;
    if (!assetResults) {
      return (
        <SpinWrapper>
          <Spin
            indicator={<img src={LoaderBPSvg} alt="" />}
            tip="Extracting assets..."
          />
        </SpinWrapper>
      );
    }
    return (
      <Wrapper>
        <div>
          <Button
            onClick={() =>
              this.setState({ detectingAsset: false, assetResults: undefined })
            }
          >
            <Icon type="arrow-left" />
            Back To File Information
          </Button>
        </div>
        <div style={{ flex: 1, marginTop: '12px' }}>
          <Table
            onRowClick={this.onAssetSelected}
            pagination={false}
            rowClassName={item => (item.page === currentPage ? 'current' : '')}
            columns={[
              {
                key: 'name',
                title: 'Asset Name',
                dataIndex: 'name',
              },
              {
                key: 'page',
                title: 'Page in Document',
                dataIndex: 'page',
              },
            ]}
            dataSource={assetResults}
          />
        </div>
      </Wrapper>
    );
  };

  render() {
    const { selectedAssetId, convertingToSvg, detectingAsset } = this.state;
    const { selectedDocument, isPnIDParsingAllowed } = this.props;
    if (detectingAsset) {
      return this.renderDocumentAssetDetection();
    }
    return (
      <>
        <h2 style={{ display: 'flex' }}>
          <BetaTag />
          Detect Assets In Document
        </h2>
        <p>Find mentioned Assets in your document.</p>
        <Button
          size="large"
          type="primary"
          onClick={() => this.detectAssetClicked(selectedDocument.id)}
        >
          Detect Assets
        </Button>
        <Divider />
        <h2 style={{ display: 'flex' }}>
          <BetaTag />
          Convert to Interactive P&ID
        </h2>
        <p>
          Navigate the asset hierarchy via clicking on the P&ID diagram. This is
          only possible for PDFs with 1 page.
        </p>
        <AssetSelect
          rootOnly
          onAssetSelected={selectedIds =>
            this.setState({ selectedAssetId: selectedIds[0] })
          }
        />
        <br />
        <br />
        <Button
          size="large"
          type="primary"
          disabled={!selectedAssetId || !isPnIDParsingAllowed}
          onClick={() =>
            this.convertToPnIDClicked(selectedDocument.id, selectedAssetId!)
          }
          loading={!!convertingToSvg}
        >
          {convertingToSvg || 'Convert to Clickable P&ID'}
        </Button>
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: selectAppState(state),
    threed: selectThreeD(state),
    assets: selectAssets(state),
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      setAssetId,
    },
    dispatch
  );
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MapModelToAssetForm);
