import { FilesMetadata, Asset, UploadFileMetadataResponse } from '@cognite/sdk';
import { checkForAccessPermission } from '../../utils/utils';
import { trackUsage } from '../../utils/metrics';
import { sdk } from '../../index';
import { GCSUploader } from '../../components/FileUploader';

export const downloadFile = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Network response was not ok.');
  }
  const blob = await response.blob();
  return blob;
};

export const convertPDFtoPNID = async (
  file: FilesMetadata,
  selectedRootAssetId: number,
  permissions: { [key: string]: string[] },
  callbacks: {
    callbackProgress?: (progressString: string) => void;
    callbackResult: (file: FilesMetadata) => void;
    callbackError?: (error: any) => void;
  }
) => {
  const { callbackProgress, callbackResult, callbackError } = callbacks;
  if (!checkForAccessPermission(permissions, 'filesAcl', 'WRITE', true)) {
    return;
  }
  if (
    !checkForAccessPermission(permissions, 'relationshipsAcl', 'WRITE', true)
  ) {
    return;
  }
  trackUsage('FileUtil.convertToPnIDClicked', { fileId: file.id });
  const countRequest = await sdk.get(
    `/api/playground/projects/${sdk.project}/assets/count?rootIds=[${selectedRootAssetId}]`
  );
  const { count } = countRequest.data;
  let currentCount = 0;
  const names = new Set<string>();
  if (callbackProgress) {
    callbackProgress(`Loading Assets (0%)`);
  }
  await sdk.assets
    .list({
      filter: { rootIds: [{ id: selectedRootAssetId }] },
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
