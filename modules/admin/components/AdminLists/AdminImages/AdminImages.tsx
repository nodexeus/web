import { AdminList } from '../AdminList/AdminList';
import { DateTime } from '@shared/components';
import { AdminListColumn } from '@modules/admin/types/AdminListColumn';
import { useState } from 'react';
import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';
import { capitalized } from '@modules/admin';
import { AdminImagesFilterProtocol } from './AdminImagesFilter/AdminImagesFilterProtocol/AdminImagesFilterProtocol';
import { AdminImagesFilterOrg } from './AdminImagesFilter/AdminImagesFilterOrg/AdminImagesFilterOrg';
import { imageClient, protocolClient } from '@modules/grpc';
import { ImageSummary } from '@modules/grpc/library/blockjoy/v1/image';
import { Protocol } from '@modules/grpc/library/blockjoy/v1/protocol';

enum ImageSortField {
  IMAGE_SORT_FIELD_PROTOCOL_NAME = 0,
  IMAGE_SORT_FIELD_VERSION_KEY = 1,
  IMAGE_SORT_FIELD_BUILD_VERSION = 2,
  IMAGE_SORT_FIELD_CREATED_AT = 3,
}

const columns: AdminListColumn[] = [
  {
    name: 'protocolName',
    displayName: 'Protocol',
    width: '200px',
    sortField: ImageSortField.IMAGE_SORT_FIELD_PROTOCOL_NAME,
    isVisible: true,
    filterComponent: AdminImagesFilterProtocol,
    filterDropdownMinWidth: 200,
  },
  {
    name: 'semanticVersion',
    displayName: 'Version',
    width: '150px',
    isVisible: true,
  },
  {
    name: 'versionKey',
    displayName: 'Variant',
    width: '200px',
    sortField: ImageSortField.IMAGE_SORT_FIELD_VERSION_KEY,
    isVisible: true,
  },
  {
    name: 'buildVersion',
    displayName: 'Build Version',
    width: '150px',
    sortField: ImageSortField.IMAGE_SORT_FIELD_BUILD_VERSION,
    isVisible: true,
  },
  {
    name: 'propertyCount',
    displayName: 'Properties',
    width: '120px',
    isVisible: true,
  },
  {
    name: 'orgId',
    displayName: 'Organization',
    width: '200px',
    isVisible: true,
    filterComponent: AdminImagesFilterOrg,
    filterDropdownMinWidth: 200,
  },
  {
    name: 'createdAt',
    displayName: 'Created At',
    width: '180px',
    sortField: ImageSortField.IMAGE_SORT_FIELD_CREATED_AT,
    isVisible: true,
  },
];

export const AdminImages = () => {
  const [images, setImages] = useState<ImageSummary[]>([]);
  const [protocolVersions, setProtocolVersions] = useState<Map<string, string>>(
    new Map(),
  );

  const getList = async (
    keyword?: string,
    page?: number,
    sortField?: ImageSortField,
    sortOrder?: SortOrder,
    filters?: AdminListColumn[],
    pageSize?: number,
  ) => {
    try {
      // Extract filter values
      const protocolFilter = filters?.find((f) => f.name === 'protocolName')
        ?.filterSettings?.values?.[0];
      const orgFilter = filters?.find((f) => f.name === 'orgId')?.filterSettings
        ?.values?.[0];

      const response = await imageClient.listImages({
        search: keyword || undefined,
        protocolFilter: protocolFilter || undefined,
        orgFilter: orgFilter || undefined,
        page: Math.max(1, page || 1),
        pageSize: pageSize || 50,
      });

      return {
        list: response.images || [],
        total: response.totalCount || 0,
      };
    } catch (err) {
      console.error('Error loading images:', err);

      // TEMPORARY: Mock data for development when backend is not available
      if (err instanceof Error && err.message?.includes('UNIMPLEMENTED')) {
        console.warn(
          'Backend API server needs to be restarted with new image management endpoints',
        );

        // Return mock data to demonstrate UI functionality
        // const mockImages = [
        //   {
        //     imageId: 'img-1',
        //     protocolName: 'ethereum',
        //     versionKey: { protocolKey: 'ethereum', variantKey: 'mainnet-v1.0.0' },
        //     buildVersion: 1,
        //     propertyCount: 5,
        //     orgId: 'public',
        //     createdAt: new Date('2024-01-15'),
        //     semanticVersion: 'v1.0.0',
        //   },
        //   {
        //     imageId: 'img-2',
        //     protocolName: 'bitcoin',
        //     versionKey: { protocolKey: 'bitcoin', variantKey: 'mainnet-v25.0' },
        //     buildVersion: 2,
        //     propertyCount: 3,
        //     orgId: 'public',
        //     createdAt: new Date('2024-01-10'),
        //     semanticVersion: 'v25.0.0',
        //   },
        // ];

        // return {
        //   list: mockImages,
        //   total: mockImages.length,
        // };
      }

      return {
        list: [],
        total: 0,
      };
    }
  };

  const listMap = (list: ImageSummary[]) =>
    list.map((image) => ({
      ...image,
      protocolName: capitalized(image.protocolName),
      semanticVersion: image.semanticVersion || 'Unknown',
      versionKey: image.versionKey ? image.versionKey.variantKey : 'N/A',
      orgId: image.orgId || 'Public',
      createdAt: <DateTime date={image.createdAt} />,
    }));

  return (
    <AdminList
      name="images"
      idPropertyName="imageId"
      defaultSortField={ImageSortField.IMAGE_SORT_FIELD_CREATED_AT}
      defaultSortOrder={SortOrder.SORT_ORDER_DESCENDING}
      columns={columns}
      getList={getList}
      listMap={listMap}
    />
  );
};
