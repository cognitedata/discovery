import React, { useEffect, useState } from 'react';
import { IAnnotation, IRectShapeData } from 'react-picture-annotation';
import { FilesMetadata } from '@cognite/sdk';
import { sdk } from 'utils/SDK';
import { message } from 'antd';
import { fetchAssets } from '../../../../modules/assets';
import {
  canReadEvents,
  canEditEvents,
  canReadRelationships,
  canEditRelationships,
} from '../../../../utils/PermissionsUtils';
import { useSelector, useDispatch } from '../../../../utils/ReduxUtils';
import ImageAnnotator from './ImageAnnotator';
import { trackUsage } from '../../../../utils/Metrics';
import AnnotatedPnIDItemEditor from './AnnotatedPnIDItemEditor';
import {
  PnIDApi,
  PnIDAnnotation,
  PendingPnIDAnnotation,
} from '../../../../utils/PnIDApi';

type Props = {
  filePreviewUrl: string;
  file: FilesMetadata;
};

export interface ProposedPnIDAnnotation extends PendingPnIDAnnotation {
  id: string;
}

const pnidApi = new PnIDApi(sdk);

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
                strokeColor: el.type === 'Model Generated' ? 'green' : 'blue',
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
    if (!canEditEvents(true) || !canEditRelationships(true)) {
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
      message.info('Coming Soon');
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

  return (
    <ImageAnnotator
      filePreviewUrl={filePreviewUrl}
      annotations={annotations}
      drawLabel={false}
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
  );
};

export default AnnotatedPnIDPreview;
