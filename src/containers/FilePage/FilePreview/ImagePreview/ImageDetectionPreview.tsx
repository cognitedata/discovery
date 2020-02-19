import React, { useEffect, useState } from 'react';
import { IAnnotation, IRectShapeData } from 'react-picture-annotation';
import { FilesMetadata } from '@cognite/sdk';
import { sdk } from 'utils/SDK';
import { message } from 'antd';
import { fetchAssets } from '../../../../modules/assets';
import {
  DetectionsAPI,
  ExternalDetection,
  CogniteDetection,
} from '../../../../utils/detectionApi';
import {
  canReadEvents,
  canEditEvents,
} from '../../../../utils/PermissionsUtils';
import { useSelector, useDispatch } from '../../../../utils/ReduxUtils';
import ImageAnnotator from './ImageAnnotator';
import { trackUsage } from '../../../../utils/Metrics';
import ImageDetectionItemEditor from './ImageDetectionItemEditor';

type Props = {
  filePreviewUrl: string;
  file: FilesMetadata;
};

export interface PendingDetection extends ExternalDetection {
  id: string;
}

const detectionApi = new DetectionsAPI(sdk);

const ImageDetectionPreview = ({ filePreviewUrl, file }: Props) => {
  const dispatch = useDispatch();
  const assetsMap = useSelector(state => state.assets.items);
  const [detections, setDetections] = useState([] as CogniteDetection[]);
  const [pendingDetections, setPendingDetections] = useState(
    [] as PendingDetection[]
  );
  const [annotations, setAnnotations] = useState([] as IAnnotation[]);

  useEffect(() => {
    const assetIds = detections.reduce(
      (prev: Set<number>, el: CogniteDetection) => {
        (el.assetIds || []).forEach(id => {
          if (!assetsMap[id]) {
            prev.add(id);
          }
        });
        return prev;
      },
      new Set<number>()
    );

    dispatch(fetchAssets(Array.from(assetIds).map(id => ({ id }))));

    setAnnotations(
      detections
        .filter(el => !!el.box)
        .map(
          el =>
            ({
              id: `${el.id}`,
              comment: el.label || el.description || 'No Label',
              mark: {
                type: 'RECT',
                x: el.box!.left,
                y: el.box!.top,
                width: el.box!.width,
                height: el.box!.height,
                strokeColor: 'green',
              },
            } as IAnnotation<IRectShapeData>)
        )
        .concat(
          pendingDetections
            .filter(el => !!el.box)
            .map(
              el =>
                ({
                  id: el.id,
                  comment: el.label || el.description || 'Pending Annotation',
                  mark: {
                    type: 'RECT',
                    x: el.box!.left,
                    y: el.box!.top,
                    width: el.box!.width,
                    height: el.box!.height,
                    strokeColor: 'yellow',
                  },
                } as IAnnotation<IRectShapeData>)
            )
        )
    );
  }, [detections, pendingDetections, dispatch, assetsMap]);

  useEffect(() => {
    (async () => {
      if (!canReadEvents(false)) {
        return;
      }

      const [detectionsResp, moreDetectionsResp] = await Promise.all([
        detectionApi.list({
          filter: { fileExternalId: `${file.id}` },
        }),
        ...(file.externalId
          ? [
              detectionApi.list({
                filter: { fileExternalId: file.externalId },
              }),
            ]
          : [Promise.resolve({ items: [] })]),
      ]);

      setDetections(detectionsResp.items.concat(moreDetectionsResp.items));
    })();
  }, [file.externalId, file.id]);

  const onSaveDetection = async (
    pendingDetection: PendingDetection | CogniteDetection
  ) => {
    if (!canEditEvents(true)) {
      return;
    }

    let detection: CogniteDetection;

    if (pendingDetections.find(el => el.id === pendingDetection.id)) {
      trackUsage('FilePage.FilePreview.ImageAnnotation.Create', {
        detection: pendingDetection,
      });
      const pendingObj = { ...pendingDetection };
      delete pendingObj.id;
      [detection] = await detectionApi.create([pendingObj]);
      setPendingDetections(
        pendingDetections.filter(el => el.id !== pendingDetection.id)
      );
      setDetections(detections.concat([detection]));
    } else {
      trackUsage('FilePage.FilePreview.ImageAnnotation.Update', {
        detection: pendingDetection,
      });
      const cogniteDetection = pendingDetection as CogniteDetection;
      [detection] = await detectionApi.update([
        {
          id: cogniteDetection.id,
          update: {
            ...(cogniteDetection.box && {
              box: {
                set: {
                  left: cogniteDetection.box.left,
                  top: cogniteDetection.box.top,
                  width: cogniteDetection.box.width,
                  height: cogniteDetection.box.height,
                },
              },
            }),
            ...(cogniteDetection.label
              ? {
                  label: {
                    set: cogniteDetection.label,
                  },
                }
              : {
                  label: {
                    setNull: true,
                  },
                }),
            ...(cogniteDetection.description
              ? {
                  description: {
                    set: cogniteDetection.description,
                  },
                }
              : {
                  description: {
                    setNull: true,
                  },
                }),
            ...(cogniteDetection.assetIds && {
              assetIds: {
                set: cogniteDetection.assetIds,
              },
            }),
          },
        },
      ]);

      setDetections(
        detections.reduce((prev, el) => {
          if (el.id === cogniteDetection.id) {
            return prev.concat([detection]);
          }
          return prev.concat([el]);
        }, [] as CogniteDetection[])
      );

      message.success('Detection Updated');
    }

    // load missing asset information
    const assetIds = (pendingDetection.assetIds || []).filter(
      id => !!assetsMap[id]
    );
    if (assetIds.length !== 0) {
      dispatch(fetchAssets(assetIds.map(id => ({ id }))));
    }
  };

  const onDeleteAnnotation = async (annotation: IAnnotation) => {
    if (!canEditEvents(true)) {
      return;
    }

    if (pendingDetections.find(el => el.id === annotation.id)) {
      trackUsage('FilePage.FilePreview.ImageAnnotation.CancelCreate', {
        annotation,
      });
      setPendingDetections(
        pendingDetections.filter(el => el.id !== annotation.id)
      );
    } else {
      trackUsage('FilePage.FilePreview.ImageAnnotation.Delete', {
        annotation,
      });
      await detectionApi.delete([{ id: Number(annotation.id) }]);
      setDetections(detections.filter(el => el.id !== Number(annotation.id)));
    }
  };

  const onUpdateAnnotation = async (
    annotation: IAnnotation<IRectShapeData>
  ) => {
    if (!canEditEvents(true)) {
      return;
    }

    if (pendingDetections.find(el => el.id === annotation.id)) {
      setPendingDetections(
        pendingDetections.reduce((prev: PendingDetection[], el) => {
          if (el.id !== annotation.id) {
            prev.push(el);
          } else {
            prev.push({
              ...el,
              box: {
                left: annotation.mark.x,
                top: annotation.mark.y,
                width: annotation.mark.width,
                height: annotation.mark.height,
              },
            });
          }
          return prev;
        }, [] as PendingDetection[])
      );
    } else {
      setDetections(
        detections.reduce((prev: CogniteDetection[], el) => {
          if (el.id !== Number(annotation.id)) {
            prev.push(el);
          } else {
            prev.push({
              ...el,
              box: {
                left: annotation.mark.x,
                top: annotation.mark.y,
                width: annotation.mark.width,
                height: annotation.mark.height,
              },
            });
          }
          return prev;
        }, [] as CogniteDetection[])
      );
    }
  };

  const onCreateAnnotation = async (
    annotation: IAnnotation<IRectShapeData>
  ) => {
    if (!canEditEvents(true)) {
      return;
    }
    setPendingDetections(
      pendingDetections.concat([
        {
          id: annotation.id,
          fileExternalId: `${file.externalId || file.id}`,
          box: {
            left: annotation.mark.x,
            top: annotation.mark.y,
            width: annotation.mark.width,
            height: annotation.mark.height,
          },
        },
      ])
    );
  };

  return (
    <ImageAnnotator
      filePreviewUrl={filePreviewUrl}
      annotations={annotations}
      editCallbacks={{
        onDelete: () => {},
        onCreate: onCreateAnnotation,
        onUpdate: onUpdateAnnotation,
      }}
      renderItemPreview={(
        editable: boolean,
        annotation: IAnnotation,
        onLabelChange: (value: string) => void,
        onDelete: () => void
      ) => {
        const detection =
          detections.find(el => `${el.id}` === annotation.id) ||
          pendingDetections.find(el => el.id === annotation.id);
        if (detection) {
          return (
            <ImageDetectionItemEditor
              editable={editable}
              detection={detection}
              onUpdateDetection={async newDetection => {
                onLabelChange(newDetection.label || 'No Label');
                await onSaveDetection(newDetection);
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
  );
};

export default ImageDetectionPreview;
