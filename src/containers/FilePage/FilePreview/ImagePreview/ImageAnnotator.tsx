import React, { useState, useEffect } from 'react';
import { ReactPictureAnnotation, IAnnotation } from 'react-picture-annotation';
import styled from 'styled-components';
import { AutoSizer } from 'react-virtualized';
import { Button } from 'antd';

const Buttons = styled.div`
  position: absolute;
  right: 24px;
  top: 24px;
  z-index: 1000;
`;

type Props = {
  filePreviewUrl: string;
  annotations: IAnnotation[];
  onSelect?: (annotation?: IAnnotation) => void;
  editCallbacks?: {
    onUpdate: (annotation: IAnnotation) => void;
    onCreate: (annotation: IAnnotation) => void;
    onDelete: (annotation: IAnnotation) => void;
  };
  renderItemPreview: (
    editable: boolean,
    annotation: IAnnotation,
    onLabelValueUpdate: (value: string) => void,
    onDelete: () => void
  ) => React.ReactElement;
};

const ImageAnnotator = ({
  filePreviewUrl,
  annotations,
  onSelect,
  editCallbacks,
  renderItemPreview,
}: Props) => {
  const [editable, setEditable] = useState(false);
  const [realAnnotations, setRealAnnotations] = useState(annotations);

  useEffect(() => {
    setRealAnnotations(annotations);
  }, [annotations]);

  // const onAnnotationsChange = (updatedAnnotations: IAnnotation[]) => {
  //   if (!editCallbacks) {
  //     return;
  //   }
  //   if (updatedAnnotations.length > annotations.length) {
  //     const keys = new Set(annotations.map(el => el.id));
  //     updatedAnnotations
  //       .filter(el => !keys.has(el.id))
  //       .forEach(el => editCallbacks.onCreate(el));
  //   } else if (updatedAnnotations.length < annotations.length) {
  //     const updatedKeys = new Set(updatedAnnotations.map(el => el.id));
  //     annotations
  //       .filter(el => !updatedKeys.has(el.id))
  //       .forEach(el => editCallbacks.onDelete(el));
  //   } else {
  //     annotations.forEach(annotation => {
  //       editCallbacks.onChange(annotation);
  //     });
  //   }
  // };

  const onAnnotationSelect = (id: string | null) => {
    if (!onSelect) {
      return;
    }
    if (id === null) {
      onSelect(undefined);
    }
    const annotation = annotations.find(el => el.id === id);
    if (annotation) {
      onSelect(annotation);
    }
  };

  return (
    <>
      {editCallbacks && (
        <Buttons>
          <Button onClick={() => setEditable(!editable)}>
            {editable ? 'Finish Editing' : 'Edit Annotations'}
          </Button>
        </Buttons>
      )}
      <AutoSizer>
        {({ height, width }) => (
          <ReactPictureAnnotation
            annotationData={realAnnotations}
            onChange={setRealAnnotations}
            onSelect={onAnnotationSelect}
            onAnnotationCreate={editCallbacks && editCallbacks.onCreate}
            onAnnotationDelete={editCallbacks && editCallbacks.onDelete}
            onAnnotationUpdate={editCallbacks && editCallbacks.onUpdate}
            image={filePreviewUrl}
            editable={editable}
            width={width}
            height={height}
            renderItemPreview={renderItemPreview}
          />
        )}
      </AutoSizer>
    </>
  );
};
export default ImageAnnotator;
