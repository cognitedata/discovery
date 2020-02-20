import React, { useEffect, useState } from 'react';
import { IAnnotation, IRectShapeData } from 'react-picture-annotation';
import { FilesMetadata } from '@cognite/sdk';
import { sdk } from 'utils/SDK';
import { message, Button, Badge, Icon, Card, Collapse } from 'antd';
import styled from 'styled-components';
import {
  canReadEvents,
  canEditEvents,
  canReadRelationships,
  canEditRelationships,
} from 'utils/PermissionsUtils';
import { useSelector, useDispatch } from 'utils/ReduxUtils';
import { trackUsage } from 'utils/Metrics';
import { PnIDApi, PnIDAnnotation, PendingPnIDAnnotation } from 'utils/PnIDApi';
import { fetchAssets } from 'modules/assets';
import ImageAnnotator from './ImageAnnotator';
import AnnotatedPnIDItemEditor from './AnnotatedPnIDItemEditor';

const AnnotationOverview = styled.div`
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 1000;

  button {
    display: flex;
    align-items: center;
    i {
      margin-left: 6px;
    }
    .ant-badge {
      margin-right: 6px;
    }
    box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.1);
    border: none;
  }

  && .ant-card {
    box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.1);
    border-radius: 14px;

    h1 {
      text-align: center;
      font-size: 64px;
      line-height: 72px;
      font-weight: 700;
      margin-bottom: 0;
    }
    p.subtitle {
      text-align: center;
      font-weight: 700;
    }
  }
`;

const StyledCollapse = styled(Collapse)`
  && .ant-collapse-header {
    padding-left: 0px;
    display: flex;
    align-items: center;

    .ant-badge {
      margin-left: 16px;
    }
  }
  .ant-collapse-item {
    background: #fff;
    border: none;
  }
`;

type Props = {
  filePreviewUrl: string;
  file: FilesMetadata;
};

export interface ProposedPnIDAnnotation extends PendingPnIDAnnotation {
  id: string;
}

const pnidApi = new PnIDApi(sdk);

const selectAnnotationColor = (annotation: PnIDAnnotation) => {
  return annotation.type === 'Model Generated' ? '#4A67FB' : '#FF6918';
};

const AnnotatedPnIDPreview = ({ filePreviewUrl, file }: Props) => {
  const dispatch = useDispatch();
  const assetsMap = useSelector(state => state.assets.items);
  const [pnidAnnotations, setPnidAnnotations] = useState(
    [] as PnIDAnnotation[]
  );
  const [pendingPnidAnnotations, setPendingPnidAnnotations] = useState(
    [] as ProposedPnIDAnnotation[]
  );
  const [annotations, setAnnotations] = useState([] as IAnnotation[]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const assetIds = pnidAnnotations.reduce(
      (prev: Set<number>, el: PnIDAnnotation) => {
        if (el.assetId && !assetsMap[el.assetId]) {
          prev.add(el.assetId);
        }
        return prev;
      },
      new Set<number>()
    );

    dispatch(fetchAssets(Array.from(assetIds).map(id => ({ id }))));

    setAnnotations(
      pnidAnnotations
        .map(
          el =>
            ({
              id: `${el.id}`,
              comment: el.label || 'No Label',
              mark: {
                type: 'RECT',
                x: el.boundingBox!.x,
                y: el.boundingBox!.y,
                width: el.boundingBox!.width,
                height: el.boundingBox!.height,
                strokeColor: selectAnnotationColor(el),
              },
            } as IAnnotation<IRectShapeData>)
        )
        .concat(
          pendingPnidAnnotations.map(
            el =>
              ({
                id: el.id,
                comment: el.label || 'Pending Annotation',
                mark: {
                  type: 'RECT',
                  x: el.boundingBox!.x,
                  y: el.boundingBox!.y,
                  width: el.boundingBox!.width,
                  height: el.boundingBox!.height,
                  strokeColor: 'yellow',
                },
              } as IAnnotation<IRectShapeData>)
          )
        )
    );
  }, [pnidAnnotations, pendingPnidAnnotations, dispatch, assetsMap]);

  useEffect(() => {
    (async () => {
      if (!canReadEvents(false) || !canReadRelationships(false)) {
        return;
      }

      setPnidAnnotations(await pnidApi.fetchAnnotations(file.id));
    })();
  }, [file.externalId, file.id]);

  const onSaveDetection = async (
    pendingAnnotation: ProposedPnIDAnnotation | PnIDAnnotation
  ) => {
    if (!canEditEvents(true) || !canEditRelationships(true)) {
      return;
    }

    let annotation: PnIDAnnotation;

    if (pendingPnidAnnotations.find(el => el.id === pendingAnnotation.id)) {
      trackUsage('FilePage.FilePreview.AnnotatedPnIDPreview.Create', {
        annotation: pendingAnnotation,
      });
      const pendingObj = { ...pendingAnnotation };
      delete pendingObj.id;
      [annotation] = await pnidApi.createAnnotations([pendingObj]);
      setPendingPnidAnnotations(
        pendingPnidAnnotations.filter(el => el.id !== pendingAnnotation.id)
      );
      setPnidAnnotations(pnidAnnotations.concat([annotation]));
    } else {
      trackUsage('FilePage.FilePreview.AnnotatedPnIDPreview.Update', {
        annotation: pendingAnnotation,
      });
      message.info('Coming Soon');
    }

    // load missing asset information
    if (pendingAnnotation.assetId && !assetsMap[pendingAnnotation.assetId]) {
      dispatch(fetchAssets([{ id: pendingAnnotation.assetId }]));
    }
  };

  const onDeleteAnnotation = async (annotation: IAnnotation) => {
    if (!canEditEvents(true)) {
      return;
    }

    if (pendingPnidAnnotations.find(el => el.id === annotation.id)) {
      trackUsage('FilePage.FilePreview.AnnotatedPnIDPreview.CancelCreate', {
        annotation,
      });
      setPendingPnidAnnotations(
        pendingPnidAnnotations.filter(el => el.id !== annotation.id)
      );
    } else {
      const pnidIndex = pnidAnnotations.findIndex(
        el => `${el.id}` === annotation.id
      );
      if (pnidIndex > -1) {
        pnidApi.deleteAnnotations([pnidAnnotations[pnidIndex]]);
        setPnidAnnotations(
          pnidAnnotations
            .slice(0, pnidIndex)
            .concat(pnidAnnotations.slice(pnidIndex + 1))
        );
      }
    }
  };

  const onUpdateAnnotation = async (
    annotation: IAnnotation<IRectShapeData>
  ) => {
    if (!canEditEvents(true)) {
      return;
    }

    if (pendingPnidAnnotations.find(el => el.id === annotation.id)) {
      setPendingPnidAnnotations(
        pendingPnidAnnotations.reduce((prev: ProposedPnIDAnnotation[], el) => {
          if (el.id !== annotation.id) {
            prev.push(el);
          } else {
            prev.push({
              ...el,
              boundingBox: {
                x: annotation.mark.x,
                y: annotation.mark.y,
                width: annotation.mark.width,
                height: annotation.mark.height,
              },
            });
          }
          return prev;
        }, [] as ProposedPnIDAnnotation[])
      );
    } else {
      // message.info('Coming Soon');
    }
  };

  const onCreateAnnotation = async (
    annotation: IAnnotation<IRectShapeData>
  ) => {
    if (!canEditEvents(true)) {
      return;
    }
    setPendingPnidAnnotations(
      pendingPnidAnnotations.concat([
        {
          id: annotation.id,
          type: 'User Defined',
          fileId: file.id,
          version: 1,
          label: '',
          boundingBox: {
            x: annotation.mark.x,
            y: annotation.mark.y,
            width: annotation.mark.width,
            height: annotation.mark.height,
          },
        },
      ])
    );
  };

  // const onDeleteAnnotation = (annotation: IAnnotation) => {
  //   if (pendingPnidAnnotations.find(el => el.id === annotation.id)) {
  //     setPendingPnidAnnotations(
  //       pendingPnidAnnotations.filter(el => el.id !== annotation.id)
  //     );
  //   } else {
  //     // const pnidIndex = pnidAnnotations.find(
  //     //   el => `${el.id}` === annotation.id
  //     // );
  //   //   if (pnidIndex !== -1) {
  //   //     pnidApi.deleteAnnotations([]);
  //   //     setPnidAnnotations(
  //   //       pnidAnnotations
  //   //         .slice(0, pnidIndex)
  //   //         .concat(pnidAnnotations.slice(pnidIndex + 1))
  //   //     );
  //   //   }
  //   // }
  // };

  const renderAnnotationOverview = () => {
    if (showDetails) {
      const pnidAnnotationsDetails: {
        [key: string]: PnIDAnnotation[];
      } = pnidAnnotations.reduce((prev, el) => {
        if (prev[el.type]) {
          prev[el.type].push(el);
          return prev;
        }
        return {
          ...prev,
          [el.type]: [el],
        };
      }, {} as { [key: string]: PnIDAnnotation[] });
      return (
        <AnnotationOverview>
          <Card
            style={{ width: '360px' }}
            title="ANNOTATIONS"
            extra={
              <Icon
                type="caret-up"
                onClick={() => setShowDetails(!showDetails)}
              />
            }
          >
            <h1>{annotations.length}</h1>
            <p className="subtitle">Annotations</p>
            <StyledCollapse
              bordered={false}
              expandIconPosition="right"
              expandIcon={({ isActive }) => (
                <Icon type="caret-down" rotate={isActive ? 180 : 0} />
              )}
            >
              {Object.keys(pnidAnnotationsDetails).map(type => (
                <Collapse.Panel
                  key={type}
                  header={
                    <>
                      <span>{type.toUpperCase()} </span>
                      <Badge
                        style={{
                          backgroundColor: selectAnnotationColor(
                            pnidAnnotationsDetails[type][0]
                          ),
                        }}
                        count={pnidAnnotationsDetails[type].length}
                        showZero
                      />
                      /{annotations.length}
                    </>
                  }
                ></Collapse.Panel>
              ))}
            </StyledCollapse>
          </Card>
        </AnnotationOverview>
      );
    }
    return (
      <AnnotationOverview>
        <Button
          shape="round"
          type="default"
          onClick={() => setShowDetails(!showDetails)}
        >
          <Badge
            style={{ backgroundColor: '#fc2574' }}
            count={annotations.length}
            showZero
          />{' '}
          ANNOTATIONS
          <Icon type="caret-down" />
        </Button>
      </AnnotationOverview>
    );
  };

  return (
    <>
      {renderAnnotationOverview()}
      <ImageAnnotator
        filePreviewUrl={filePreviewUrl}
        annotations={annotations}
        drawLabel={false}
        editCallbacks={{
          onDelete: onDeleteAnnotation,
          onCreate: onCreateAnnotation,
          onUpdate: onUpdateAnnotation,
        }}
        renderItemPreview={(
          editable: boolean,
          annotation: IAnnotation,
          onLabelChange: (value: string) => void,
          onDelete: () => void
        ) => {
          const pnidAnnotation =
            pnidAnnotations.find(el => `${el.id}` === annotation.id) ||
            pendingPnidAnnotations.find(el => el.id === annotation.id);
          if (pnidAnnotation) {
            return (
              <AnnotatedPnIDItemEditor
                editable={editable}
                annotation={pnidAnnotation}
                onUpdateDetection={async newAnnotation => {
                  onLabelChange(newAnnotation.label || 'No Label');
                  await onSaveDetection(newAnnotation);
                }}
                onDeleteDetection={() => {
                  onDelete();
                  onDeleteAnnotation(annotation);
                }}
              />
            );
          }
          return <></>;
        }}
      />
    </>
  );
};

export default AnnotatedPnIDPreview;
