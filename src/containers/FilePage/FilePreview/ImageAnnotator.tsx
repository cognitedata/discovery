import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import Annotation from 'react-image-annotation';
import { Button, Input, Tag } from 'antd';
import styled, { keyframes } from 'styled-components';
import debounce from 'lodash/debounce';
import { FilesMetadata } from '@cognite/sdk';
import { sdk } from 'utils/SDK';
import { fetchAssets, AssetsState } from '../../../modules/assets';
import { RootState } from '../../../reducers/index';
import {
  DetectionsAPI,
  ExternalDetection,
  CogniteDetection,
  ManualVerificationState,
} from '../../../utils/detectionApi';
import AssetSelect from '../../../components/AssetSelect';
import { canReadEvents, canEditEvents } from '../../../utils/PermissionsUtils';
import { trackUsage } from '../../../utils/Metrics';

const fadeInScale = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  .react-transform-component {
    height: 100%;
    width: 100%;
    overflow: scroll;
    display: flex;
  }
  .react-transform-component > div {
    align-self: center;
    margin: 0 auto;
  }
`;

const Container = styled.div`
  background: white;
  border-radius: 2px;
  box-shadow: 0px 1px 5px 0px rgba(0, 0, 0, 0.2),
    0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 3px 1px -2px rgba(0, 0, 0, 0.12);
  margin-top: 16px;
  transform-origin: top left;
  animation: ${fadeInScale} 0.31s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
  padding: 12px;
  p {
    margin-top: 12px;
    margin-bottom: 8px;
  }
  button {
    margin-right: 4px;
  }
  .button-row {
    display: flex;
    align-items: center;
    margin-top: 12px;
  }
`;

const ContentOverlay = styled.div`
  background: white;
  border-radius: 2px;
  box-shadow: 0px 1px 5px 0px rgba(0, 0, 0, 0.2),
    0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 3px 1px -2px rgba(0, 0, 0, 0.12);
  padding: 8px 16px;
  margin-top: 8px;
  margin-left: 8px;

  p {
    margin-top: 4px;
    margin-bottom: 8px;
  }
`;

const Rectangle = styled.div`
  border: solid 2px yellow;
  box-shadow: 0px 0px 1px 1px black inset;
  box-sizing: border-box;
  transition: box-shadow 0.21s ease-in-out;
`;

const Overlay = styled.div`
  background: rgba(0, 0, 0, 0.4);
  border-radius: 5px;
  bottom: 4px;
  color: white;
  font-size: 12px;
  font-weight: bold;
  padding: 10px;
  pointer-events: none;
  position: absolute;
  right: 4px;
  transition: opacity 0.21s ease-in-out;
  user-select: none;
`;

const ResizeButtons = styled.div`
  position: absolute;
  left: 32px;
  bottom: 34px;
  z-index: 1000;
  && > * > * {
    box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.1);
  }
  .ant-btn-group > .ant-btn:first-child:not(:last-child),
  .ant-btn-group > span:first-child:not(:last-child) > .ant-btn {
    border-top-left-radius: 50px;
    border-bottom-left-radius: 50px;
  }
  .ant-btn-group > .ant-btn:last-child:not(:first-child),
  .ant-btn-group > span:last-child:not(:first-child) > .ant-btn {
    border-top-right-radius: 50px;
    border-bottom-right-radius: 50px;
  }
`;
const ImageAnnotatorButtons = styled.div`
  position: absolute;
  right: 32px;
  top: 34px;
  z-index: 1000;
  && > * {
    margin-left: 16px;
    box-shadow: 0px 0px 8px rgba(0, 0, 0, 0.1);
  }
`;

type OrigProps = {
  filePreviewUrl: string;
  file: FilesMetadata;
};

type Props = {
  fetchAssets: typeof fetchAssets;
  assets: AssetsState;
} & OrigProps;

type AnnotationItem = {
  geometry?: {
    x: number;
    y: number;
    width: number;
    type: 'RECTANGLE';
    height: number;
  };
  id: number;
  data: ExternalDetection;
};

type State = {
  detections: CogniteDetection[];
  annotation: AnnotationItem;
  disableZooming: boolean;
  scale: number;
};

class ImagePreview extends React.Component<Props, State> {
  detectionApi: DetectionsAPI;

  constructor(props: Props) {
    super(props);
    this.state = {
      detections: [],
      annotation: {
        id: Math.random(),
        data: {
          fileExternalId: this.props.file.externalId || `${this.props.file.id}`,
        },
      },
      scale: 1,
      disableZooming: false,
    };
    this.detectionApi = new DetectionsAPI(sdk);
    this.updateScale = debounce(this.updateScale, 200);
  }

  async componentDidMount() {
    this.fetchDetections();
  }

  async componentDidUpdate(prevProps: Props) {
    if (prevProps.file.id !== this.props.file.id) {
      this.fetchDetections();
    }
  }

  fetchDetections = async () => {
    const { items } = this.props.assets;

    if (!canReadEvents(false)) {
      return;
    }

    const [detectionsResp, moreDetectionsResp] = await Promise.all([
      this.detectionApi.list({
        filter: { fileExternalId: `${this.props.file.id}` },
      }),
      ...(this.props.file.externalId
        ? [
            this.detectionApi.list({
              filter: { fileExternalId: this.props.file.externalId },
            }),
          ]
        : [Promise.resolve({ items: [] })]),
    ]);

    const detections = detectionsResp.items.concat(moreDetectionsResp.items);

    this.setState({
      detections,
    });

    const assetIds = detections.reduce(
      (prev: Set<number>, el: ExternalDetection) => {
        (el.assetIds || []).forEach(id => {
          if (!items[id]) {
            prev.add(id);
          }
        });
        return prev;
      },
      new Set<number>()
    );

    this.props.fetchAssets(Array.from(assetIds).map(id => ({ id })));
  };

  onChange = (annotation: AnnotationItem) => {
    this.setState({ annotation });
  };

  onSubmit = async (annotation: AnnotationItem) => {
    trackUsage('FilePage.FilePreview.ImageAnnotation.Create', {
      annotation,
    });
    const { items } = this.props.assets;
    const { detections } = this.state;
    if (!canEditEvents(true)) {
      return;
    }
    if (annotation.data) {
      const [detection] = await this.detectionApi.create([
        {
          ...annotation.data,
          fileExternalId: this.props.file.externalId || `${this.props.file.id}`,
          manuallyVerified: ManualVerificationState.VERIFIED,
          box: {
            width: annotation.geometry!.width,
            height: annotation.geometry!.height,
            left: annotation.geometry!.x,
            top: annotation.geometry!.y,
          },
        },
      ]);

      // load missing asset information
      const assetIds = (annotation.data.assetIds || []).filter(
        id => !!items[id]
      );
      if (assetIds.length !== 0) {
        this.props.fetchAssets(assetIds.map(id => ({ id })));
      }

      this.setState(
        {
          detections: detections.concat([detection]),
        },
        () => this.clearAnnotation()
      );
    }
  };

  clearAnnotation = () => {
    this.setState({
      annotation: {
        id: Math.random(),
        data: {
          fileExternalId: this.props.file.externalId || `${this.props.file.id}`,
        },
      },
    });
  };

  renderSelector = ({ annotation }: { annotation: AnnotationItem }) => {
    const { geometry } = annotation;
    if (geometry) {
      return (
        <Rectangle
          key={annotation.id}
          style={{
            position: 'absolute',
            left: `${geometry.x}%`,
            top: `${geometry.y}%`,
            height: `${geometry.height}%`,
            width: `${geometry.width}%`,
          }}
        />
      );
    }
    return null;
  };

  renderEditor = ({
    annotation,
    onChange,
    onSubmit,
  }: {
    annotation: AnnotationItem;
    onChange: typeof ImagePreview.prototype.onChange;
    onSubmit: typeof ImagePreview.prototype.onSubmit;
  }) => {
    const { scale } = this.state;
    const { geometry } = annotation;
    if (!geometry) return null;

    return (
      <Container
        style={{
          transform: `scale(${1 / scale})`,
          position: 'absolute',
          left: `${geometry.x}%`,
          top: `${geometry.y + geometry.height}%`,
        }}
      >
        <p>Label</p>
        <Input
          onChange={e =>
            onChange({
              ...annotation,
              data: {
                ...annotation.data,
                label: e.target.value,
              },
            })
          }
          value={annotation.data && annotation.data.label}
        />
        <p>Description</p>
        <Input.TextArea
          onChange={e =>
            onChange({
              ...annotation,
              data: {
                ...annotation.data,
                description: e.target.value,
              },
            })
          }
          value={annotation.data && annotation.data.description}
        />
        <p>Assets</p>
        <AssetSelect
          multiple
          style={{ width: '100%' }}
          onAssetSelected={(ids: number[]) =>
            onChange({
              ...annotation,
              data: {
                ...annotation.data,
                assetIds: ids,
              },
            })
          }
        />
        <div className="button-row">
          <Button
            type="primary"
            icon="plus"
            onClick={() => onSubmit(annotation)}
          >
            Add Detection
          </Button>
          <Button icon="delete" onClick={() => this.clearAnnotation()} />
        </div>
      </Container>
    );
  };

  renderContent = ({ annotation }: { annotation: AnnotationItem }) => {
    const { items } = this.props.assets;
    const { geometry } = annotation;
    if (!geometry) return null;

    return (
      <ContentOverlay
        key={annotation.id}
        style={{
          position: 'absolute',
          left: `${geometry.x}%`,
          top: `${geometry.y + geometry.height}%`,
        }}
      >
        <p>
          <strong>{annotation.data.label}</strong>
        </p>
        <p>{annotation.data.description}</p>
        {(annotation.data.assetIds || []).map(id => (
          <Tag key={id}>{items[id] ? items[id].name : 'Loading...'}</Tag>
        ))}
      </ContentOverlay>
    );
  };

  updateScale = ({ scale: newScale }: { scale: number }) => {
    this.setState({ scale: newScale });
  };

  changeEditStatus = () => {
    const { disableZooming } = this.state;
    this.setState({ disableZooming: !disableZooming }, () =>
      this.clearAnnotation()
    );
  };

  render() {
    const { filePreviewUrl, file } = this.props;
    const { detections, annotation, disableZooming } = this.state;
    return (
      <>
        <TransformWrapper
          onZoomChange={this.updateScale}
          options={{ limitToBounds: false, disabled: disableZooming }}
        >
          {({
            zoomIn,
            zoomOut,
            resetTransform,
          }: {
            zoomIn: any;
            zoomOut: any;
            resetTransform: any;
          }) => (
            <Wrapper>
              <ImageAnnotatorButtons>
                <Button shape="round" icon="caret-down">
                  View Options
                </Button>
                <Button
                  shape="round"
                  icon="form"
                  onClick={this.changeEditStatus}
                  disabled={!canEditEvents(false)}
                >
                  {disableZooming ? 'Done Adding Annotation' : 'Add Annotation'}
                </Button>
              </ImageAnnotatorButtons>
              <ResizeButtons>
                <Button.Group>
                  <Button
                    icon="plus"
                    onClick={zoomIn}
                    disabled={disableZooming}
                  />
                  <Button
                    icon="minus"
                    onClick={zoomOut}
                    disabled={disableZooming}
                  />
                  <Button
                    icon="retweet"
                    onClick={resetTransform}
                    disabled={disableZooming}
                  />
                </Button.Group>
              </ResizeButtons>
              <TransformComponent>
                <Annotation
                  src={filePreviewUrl}
                  alt={file.name}
                  disableAnnotation={!disableZooming}
                  annotations={detections
                    .filter(el => el.box)
                    .map(el => ({
                      geometry: {
                        type: 'RECTANGLE',
                        x: el.box!.left,
                        y: el.box!.top,
                        width: el.box!.width,
                        height: el.box!.height,
                      },
                      id: el.id,
                      data: el,
                    }))}
                  value={annotation}
                  onChange={this.onChange}
                  onSubmit={this.onSubmit}
                  renderEditor={this.renderEditor}
                  renderSelector={this.renderSelector}
                  renderContent={this.renderContent}
                  renderOverlay={() =>
                    disableZooming ? (
                      <Overlay>Click and Drag to Annotate</Overlay>
                    ) : null
                  }
                />
              </TransformComponent>
            </Wrapper>
          )}
        </TransformWrapper>
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => {
  return {
    app: state.app,
    assets: state.assets,
  };
};
const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      fetchAssets,
    },
    dispatch
  );
export default connect(mapStateToProps, mapDispatchToProps)(ImagePreview);
