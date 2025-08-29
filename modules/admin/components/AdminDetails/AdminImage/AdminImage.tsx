import { useState } from 'react';
import { useRouter } from 'next/router';
import { css } from '@emotion/react';
import { AdminDetail } from '../AdminDetail/AdminDetail';
import { DateTime, NextLink, Button } from '@shared/components';
import { Breadcrumb } from '@shared/components/App/Page/Breadcrumb';
import { formatters } from '@shared/utils/formatters';
import { spacing } from 'styles/utils.spacing.styles';
import { typo } from 'styles/utils.typography.styles';
import { colors } from 'styles/utils.colors.styles';
import { AdminImageProperties } from './AdminImageProperties/AdminImageProperties';

import { imageClient } from '@modules/grpc';
import { protocolClient } from '@modules/grpc';
import { Image, ImageProperty } from '@modules/grpc/library/blockjoy/v1/image';
import {
  Protocol,
  ProtocolVersion,
} from '@modules/grpc/library/blockjoy/v1/protocol';
import { organizationSelectors } from '@modules/organization';
import { useRecoilValue } from 'recoil';

const formatDiskSize = (sizeValue: number): string => {
  // Storage uses decimal units (1000), not binary (1024)
  // Convert from bytes to appropriate storage units
  let gbValue: number;
  
  if (sizeValue < 10000) {
    // Values under 10,000 are likely already in GB
    gbValue = sizeValue;
  } else {
    // Values over 10,000 are likely in bytes, convert to GB using decimal (1000)
    gbValue = sizeValue / Math.pow(1000, 3);
  }
  
  // Format with friendly units using decimal conversion
  if (gbValue >= 1000) {
    const tbValue = gbValue / 1000;
    if (tbValue >= 10) {
      return `${Math.round(tbValue)} TB`;
    } else {
      return `${tbValue.toFixed(1)} TB`;
    }
  } else if (gbValue >= 1) {
    return `${Math.round(gbValue)} GB`;
  } else {
    const mbValue = gbValue * 1000;
    return `${Math.round(mbValue)} MB`;
  }
};

export const AdminImage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [showProperties, setShowProperties] = useState(false);
  const [semanticVersion, setSemanticVersion] = useState<string | null>(null);
  const [protocolName, setProtocolName] = useState<string | null>(null);
  const defaultOrganization = useRecoilValue(
    organizationSelectors.defaultOrganization,
  );

  const handleOpenInApp = () => {
    // Navigate to the images list or a specific image view in the main app
    router.push(`/admin?name=images`);
  };

  const getItem = async (): Promise<Image> => {
    const response = await imageClient.getImageDetails({
      imageId: id as string,
      orgId: defaultOrganization?.orgId,
    });

    if (!response.image) {
      throw new Error('Image not found');
    }

    // Fetch protocol version information
    await fetchProtocolVersionInfo(response.image.protocolVersionId);

    return response.image;
  };

  const fetchProtocolVersionInfo = async (protocolVersionId: string) => {
    try {
      // List all protocols to find which one contains this version
      const protocolsResponse = await protocolClient.listProtocols(
        defaultOrganization?.orgId,
      );

      for (const protocol of protocolsResponse.protocols) {
        // Check if this protocol has the version we're looking for
        const version = protocol.versions?.find(
          (v) => v.protocolVersionId === protocolVersionId,
        );
        if (version) {
          setSemanticVersion(version.semanticVersion);
          setProtocolName(protocol.name);
          return;
        }
      }

      // If not found in any protocol, set defaults
      setSemanticVersion('Unknown');
      setProtocolName('Unknown');
    } catch (error) {
      console.error('Failed to fetch protocol version info:', error);
      setSemanticVersion('Unknown');
      setProtocolName('Unknown');
    }
  };

  const customItems = (image: Image): AdminDetailProperty[] => [
    {
      id: 'imageId',
      label: 'Image ID',
      data: <span css={css`font-size: 13px; opacity: 0.7;`}>{image.imageId}</span>,
      copyValue: image.imageId,
    },
    {
      id: 'protocolInfo',
      label: 'Protocol & Version',
      data: (
        <div css={css`font-size: 13px; opacity: 0.7;`}>
          {protocolName && (
            <div css={spacing.bottom.micro}>
              {protocolName}
            </div>
          )}
          {semanticVersion && (
            <div css={spacing.bottom.micro}>
              Version: {semanticVersion}
            </div>
          )}
          {/*<div css={[typo.small, colors.text3]}>
            Internal ID: {image.protocolVersionId}
          </div>*/}
        </div>
      ),
      copyValue: `${protocolName} ${semanticVersion} (${image.protocolVersionId})`,
    },
    {
      id: 'buildVersion',
      label: 'Build Version',
      data: <span css={css`font-size: 13px; opacity: 0.7;`}>{image.buildVersion.toString()}</span>,
      copyValue: image.buildVersion.toString(),
    },
    {
      id: 'description',
      label: 'Description',
      data: <span css={css`font-size: 13px; opacity: 0.7;`}>{image.description || '-'}</span>,
    },
    {
      id: 'minBabelVersion',
      label: 'Min Babel Version',
      data: <span css={css`font-size: 13px; opacity: 0.7;`}>{image.minBabelVersion || '-'}</span>,
    },
    {
      id: 'resourceRequirements',
      label: 'Resource Requirements',
      data: (
        <div css={css`font-size: 13px; opacity: 0.7;`}>
          <div>CPU: {image.minCpuCores || 0} cores</div>
          <div>
            Memory: {formatters.formatSize(image.minMemoryBytes || 0, 'bytes')}
          </div>
          <div>
            Disk: {formatDiskSize(image.minDiskBytes || 0)}
          </div>
        </div>
      ),
    },
    {
      id: 'propertyCount',
      label: 'Property Count',
      data: (
        <div>
          <span css={css`font-size: 13px; opacity: 0.7;`}>{image.properties?.length || 0} properties</span>
          <Button
            size="small"
            style="outline"
            customCss={spacing.left.small}
            onClick={() => setShowProperties(!showProperties)}
          >
            {showProperties ? 'Hide Properties' : 'Manage Properties'}
          </Button>
        </div>
      ),
    },
    {
      id: 'orgId',
      label: 'Organization',
      data: image.orgId ? (
        <NextLink href={`/admin?name=orgs&id=${image.orgId}`}>
          <span css={css`font-size: 13px; opacity: 0.7;`}>{image.orgId}</span>
        </NextLink>
      ) : (
        <span css={css`font-size: 13px; opacity: 0.7;`}>Public</span>
      ),
    },
    {
      id: 'createdAt',
      label: 'Created At',
      data: <span css={css`font-size: 13px; opacity: 0.7;`}><DateTime date={image.createdAt} /></span>,
    },
  ];

  if (showProperties) {
    return (
      <div
        css={css`
          padding: 20px;
        `}
      >
        <div css={[spacing.bottom.medium]}>
          <Breadcrumb
            title="← Back to Image Details"
            handleClick={() => setShowProperties(false)}
          >
            <span>Properties</span>
          </Breadcrumb>
        </div>
        <AdminImageProperties
          imageId={id as string}
          protocolName={protocolName || undefined}
          semanticVersion={semanticVersion || undefined}
        />
      </div>
    );
  }

  return (
    <AdminDetail
      getItem={getItem}
      onOpenInApp={handleOpenInApp}
      detailsName="imageId"
      metricsKey="imageId"
      hasMetrics={false}
      hasLogs={false}
      customItems={customItems}
      ignoreItems={[
        'imageId',
        'protocolVersionId',
        'buildVersion',
        'properties',
        'orgId',
        'description',
        'minBabelVersion',
        'minDiskBytes',
        'minMemoryBytes',
        'minCpuCores',
        'createdAt',
        'updatedAt',
        'imageUri',
        'firewall',
        'ramdisks',
        'visibility',
        'dnsScheme',
      ]}
    />
  );
};
