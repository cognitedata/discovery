import { FilesMetadata, Asset, UploadFileMetadataResponse } from '@cognite/sdk';
import { sdk } from 'utils/SDK';
import { trackUsage } from '../../utils/Metrics';
import { GCSUploader } from '../../components/FileUploader';
import { PendingPnIDAnnotation, PnIDApi } from '../../utils/PnIDApi';
import { stripWhitespace } from '../../utils/utils';
import {
  canReadFiles,
  canEditFiles,
  canEditRelationships,
} from '../../utils/PermissionsUtils';

const pnidApi = new PnIDApi(sdk);

export const downloadFile = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Network response was not ok.');
  }
  const blob = await response.blob();
  return blob;
};

const fetchAllNamesOfAssetInRoot = async (
  rootId?: number,
  callbackProgress?: (progress: string) => void
) => {
  const countRequest = await sdk.get(
    `/api/playground/projects/${sdk.project}/assets/count?${
      rootId ? `rootIds=[${rootId}]` : ''
    }`
  );
  const { count } = countRequest.data;
  let currentCount = 0;
  const names = new Set<string>();
  if (callbackProgress) {
    callbackProgress(`Loading Assets (0%)`);
  }
  await sdk.assets
    .list({
      ...(rootId && { filter: { rootIds: [{ id: rootId }] } }),
      limit: 1000,
    })
    .autoPagingEach(asset => {
      names.add(asset.name);
      currentCount += 1;

      if (currentCount === count || currentCount % 1000 === 0) {
        if (callbackProgress) {
          callbackProgress(
            `Loading Assets (${Math.ceil((currentCount / count) * 100)}%)`
          );
        }
      }
    });
  return names;
};

export const convertPDFtoPNID = async (
  file: FilesMetadata,
  selectedRootAssetId: number,
  callbacks: {
    callbackProgress?: (progressString: string) => void;
    callbackResult: (file: FilesMetadata) => void;
    callbackError?: (error: any) => void;
  }
) => {
  const { callbackProgress, callbackResult, callbackError } = callbacks;
  if (!canEditFiles()) {
    return;
  }
  trackUsage('FileUtil.ConvertToP&ID', { fileId: file.id });

  const names = await fetchAllNamesOfAssetInRoot(
    selectedRootAssetId,
    callbackProgress
  );
  if (callbackProgress) {
    callbackProgress('Processing File');
  }

  try {
    const newJob = await sdk.post(
      `/api/playground/projects/${sdk.project}/context/pnid/parse`,
      {
        data: {
          fileId: file.id,
          entities: [...names],
        },
      }
    );
    if (newJob.status !== 200) {
      if (callbackError) {
        callbackError('Unable to process file to interactive P&ID');
      }
    } else {
      const callback = async () => {
        const parsingJob = await sdk.get(
          `/api/playground/projects/${sdk.project}/context/pnid/${newJob.data.jobId}`
        );
        if (parsingJob.status !== 200 || parsingJob.data.status === 'Failed') {
          if (callbackError) {
            callbackError('Unable to parse file to interactive P&ID');
          }
        } else if (parsingJob.data.status === 'Completed') {
          if (callbackProgress) {
            callbackProgress('Uploading Interactive P&ID');
          }
          const data = await downloadFile(parsingJob.data.svgUrl);
          const assets = await Promise.all<Asset | undefined>(
            parsingJob.data.items
              .map((el: any) => el.text)
              .map(async (name: string) => {
                const response = await sdk.assets.list({
                  filter: { name },
                  limit: 1,
                });
                return response.items[0];
              })
          );
          const assetIds = assets.filter(el => !!el).map(asset => asset!.id);
          // @ts-ignore
          const newFile = await sdk.files.upload({
            name: `Processed-${file.name.substr(
              0,
              file.name.lastIndexOf('.')
            )}.svg`,
            mimeType: 'image/svg+xml',
            assetIds: [...new Set((file.assetIds || []).concat(assetIds))],
            metadata: {
              original_file_id: `${file.id}`,
            },
          });

          const uploader = await GCSUploader(
            data,
            (newFile as UploadFileMetadataResponse).uploadUrl!
          );
          await uploader.start();

          if (canEditRelationships(false)) {
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
                        resourceId: `${file.id}`,
                      },
                      confidence: 1,
                      dataSet: `discovery-manual-contextualization`,
                      externalId: `${file.id}-manual-pnid-${newFile.id}`,
                      relationshipType: 'belongsTo',
                    },
                  ],
                },
              }
            );
          }
          setTimeout(() => {
            callbackResult(newFile);
          }, 1000);
        } else {
          setTimeout(callback, 1000);
        }
      };
      setTimeout(callback, 1000);
    }
  } catch (e) {
    if (callbackError) {
      callbackError('Unable to convert to P&ID, please try again');
    }
  }
};

export const convertPDFtoInteractivePnID = async (
  file: FilesMetadata,
  selectedRootAssetId: number,
  callbacks: {
    callbackProgress?: (progressString: string) => void;
    callbackResult: (file: FilesMetadata) => void;
    callbackError?: (error: any) => void;
  }
) => {
  const { callbackProgress, callbackResult, callbackError } = callbacks;
  if (!canEditFiles() || !canEditRelationships()) {
    if (callbackError) {
      callbackError('Missing Permissions');
    }
    return;
  }
  trackUsage('FileUtil.ConvertToP&IDNew', { fileId: file.id });

  const names = await fetchAllNamesOfAssetInRoot(
    selectedRootAssetId,
    callbackProgress
  );

  if (callbackProgress) {
    callbackProgress('Processing File');
  }

  let parsingJobItems: any[] = [];
  let pngUrl: string = '';

  const startParsingJob = async () => {
    try {
      const newJob = await sdk.post(
        `/api/playground/projects/${sdk.project}/context/pnid/parse`,
        {
          data: {
            fileId: file.id,
            entities: [...names],
          },
        }
      );
      if (newJob.status !== 200) {
        if (callbackError) {
          callbackError('Unable to process file to interactive P&ID');
        }
      } else {
        setTimeout(() => checkFetchJobStatus(newJob.data.jobId), 1000);
      }
    } catch (e) {
      if (callbackError) {
        callbackError('Unable to convert to P&ID, please try again');
      }
    }
  };

  const checkFetchJobStatus = async (jobId: number) => {
    const parsingJob = await sdk.get(
      `/api/playground/projects/${sdk.project}/context/pnid/${jobId}`
    );
    if (parsingJob.status !== 200 || parsingJob.data.status === 'Failed') {
      if (callbackError) {
        callbackError('Unable to parse file to interactive P&ID');
      }
    } else if (parsingJob.data.status === 'Completed') {
      parsingJobItems = parsingJob.data.items;
      await startConversionJob();
    } else {
      setTimeout(() => checkFetchJobStatus(jobId), 1000);
    }
  };

  const startConversionJob = async () => {
    if (callbackProgress) {
      callbackProgress('Converting File');
    }
    const convertJob = await sdk.post(
      `/api/playground/projects/${sdk.project}/context/pnid/convert`,
      {
        data: {
          fileId: file.id,
          items: [],
        },
      }
    );
    if (convertJob.status !== 200) {
      if (callbackError) {
        callbackError('Unable to process file to interactive P&ID');
      }
    } else {
      setTimeout(() => checkConvertJobStatus(convertJob.data.jobId), 1000);
    }
  };

  const checkConvertJobStatus = async (jobId: number) => {
    const convertJob = await sdk.get(
      `/api/playground/projects/${sdk.project}/context/pnid/convert/${jobId}`
    );
    if (convertJob.status !== 200 || convertJob.data.status === 'Failed') {
      if (callbackError) {
        callbackError('Unable to parse file to interactive P&ID');
      }
    } else if (convertJob.data.status === 'Completed') {
      pngUrl = convertJob.data.pngUrl;
      await createPnId();
    } else {
      setTimeout(() => checkConvertJobStatus(jobId), 1000);
    }
  };

  const createPnId = async () => {
    if (callbackProgress) {
      callbackProgress('Generating Interactive P&ID');
    }
    const data = await downloadFile(pngUrl);
    const annotations = await Promise.all<PendingPnIDAnnotation>(
      parsingJobItems.map(async (el: any) => {
        const response = await sdk.assets.list({
          filter: { name: el.text },
          limit: 2,
        });

        let assetId: number | undefined;

        if (
          response.items.length === 1 &&
          stripWhitespace(el.text) === stripWhitespace(response.items[0].name)
        ) {
          assetId = response.items[0].id;
        }
        if (
          response.items.length === 2 &&
          stripWhitespace(el.text) ===
            stripWhitespace(response.items[0].name) &&
          stripWhitespace(response.items[0].name) !==
            stripWhitespace(response.items[1].name)
        ) {
          assetId = response.items[0].id;
        }

        return {
          type: 'Model Generated',
          boundingBox: {
            x: el.boundingBox.xMin,
            y: el.boundingBox.yMin,
            width: el.boundingBox.xMax - el.boundingBox.xMin,
            height: el.boundingBox.yMax - el.boundingBox.yMin,
          },
          assetId,
          label: el.text,
        } as PendingPnIDAnnotation;
      })
    );
    const assetIds = new Set<number>(file.assetIds);
    annotations.forEach(el => {
      if (el.assetId) {
        assetIds.add(el.assetId);
      }
    });
    // @ts-ignore
    const newFile = await sdk.files.upload({
      name: `Processed-${file.name.substr(0, file.name.lastIndexOf('.'))}.png`,
      mimeType: 'image/png',
      assetIds: [...assetIds],
      metadata: {
        original_file_id: `${file.id}`,
        COGNITE_INTERACTIVE_PNID: 'true',
      },
    });

    const uploader = await GCSUploader(
      data,
      (newFile as UploadFileMetadataResponse).uploadUrl!
    );

    await uploader.start();

    await sdk.post(`/api/playground/projects/${sdk.project}/relationships`, {
      data: {
        items: [
          {
            source: {
              resource: 'file',
              resourceId: `${newFile.id}`,
            },
            target: {
              resource: 'file',
              resourceId: `${file.id}`,
            },
            confidence: 1,
            dataSet: `discovery-manual-contextualization`,
            externalId: `${file.id}-manual-pnid-${newFile.id}`,
            relationshipType: 'belongsTo',
          },
        ],
      },
    });

    pnidApi.createAnnotations(
      annotations.map(el => ({ ...el, fileId: newFile.id }))
    );

    await setTimeout(() => {
      callbackResult(newFile);
    }, 1000);
  };

  await startParsingJob();
};

export const detectAssetsInDocument = async (
  file: FilesMetadata,
  callbacks: {
    callbackProgress?: (progressString: string) => void;
    callbackResult: (results: { name: string; page: number }[]) => void;
    callbackError?: (error: any) => void;
  },
  selectedRootAssetId?: number
) => {
  const { callbackProgress, callbackResult, callbackError } = callbacks;
  if (!canReadFiles()) {
    return;
  }
  trackUsage('FileUtil.DetectAssets', { fileId: file.id });
  const names = await fetchAllNamesOfAssetInRoot(
    selectedRootAssetId,
    callbackProgress
  );
  if (callbackProgress) {
    callbackProgress('Processing File');
  }

  try {
    trackUsage('FilePreview.DetectAsset', { fileId: file.id });
    const response = await sdk.post(
      `/api/playground/projects/${sdk.project}/context/entity_extraction/extract`,
      {
        data: {
          fileId: file.id,
          entities: [...names],
        },
      }
    );

    const foundEntities: { page: number; name: string }[] = [];
    response.data.items.forEach(
      (match: { entity: string; pages: number[] }) => {
        const name = match.entity;
        match.pages.forEach(page => {
          foundEntities.push({ page, name });
        });
      }
    );

    foundEntities.sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      return a.name.localeCompare(b.name);
    });

    callbackResult(foundEntities);
  } catch (e) {
    if (callbackError) {
      callbackError('Unable to process document, please try again');
    }
  }
};
