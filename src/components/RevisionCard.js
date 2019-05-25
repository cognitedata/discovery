import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Card } from 'antd';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import * as sdk from '@cognite/sdk';

const { Meta } = Card;

const RevisionCardWrapper = styled(Card)`
  width: 100%;
  cursor: pointer;
  padding: 16px !important;
  background: none !important;
  border: none !important;

  .ant-card-body {
    background: white;
    border: 1px solid #e8e8e8 !important;
    border-radius: 0 0 5px 5px;
  }

  @media screen and (min-width: 920px) {
    width: 50%;
  }

  @media screen and (min-width: 1220px) {
    width: 33%;
  }

  @media screen and (min-width: 1920px) {
    width: 25%;
  }
`;

const RevisionCard = ({ thumbnailURL, revisionId }) => {
  // We have to do this silly dance because the browser isn't authenticated to
  // fetch the image, so we need to download the image and then serve it back
  // to the <img /> tag via a `blob:garbage` URL.
  // TODO(#2695): Remove this nonsense and just hand it the actual thumbnail.
  const [dataUrl, setDataUrl] = useState('');

  useEffect(
    () => {
      let canceled = false;
      sdk
        .rawGet(thumbnailURL, { responseType: 'blob' })
        .then(response => {
          if (!canceled) {
            const { data } = response;
            const url = URL.createObjectURL(data);
            setDataUrl(url);
          }
        })
        .catch(ex => {
          console.error(ex);
        });
      return () => {
        canceled = true;
      };
    },
    [thumbnailURL]
  );

  return (
    <RevisionCardWrapper
      cover={
        <Link
          to={`revisions/${revisionId}`}
          style={{ textAlign: 'center' }}
        >
          <img
            alt="Single revision"
            src={dataUrl}
            style={{
              height: 225,
              objectFit: 'cover',
              width: '100%',
            }}
          />
        </Link>
      }
    >
      <Link to={`revisions/${revisionId}`}>
        <Meta
          title="Revision"
          description="Click to view"
        />
      </Link>
    </RevisionCardWrapper>
  );
};

RevisionCard.propTypes = {
  thumbnailURL: PropTypes.string.isRequired,
  revisionId: PropTypes.number.isRequired,
};

export default RevisionCard;