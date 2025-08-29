import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useRecoilState,
  useRecoilValue,
  useResetRecoilState,
  useSetRecoilState,
} from 'recoil';
import { toast } from 'react-toastify';
import {
  Protocol,
  ProtocolVersion,
} from '@modules/grpc/library/blockjoy/v1/protocol';
import { Host, RegionInfo } from '@modules/grpc/library/blockjoy/v1/host';
import { NodeServiceCreateRequest } from '@modules/grpc/library/blockjoy/v1/node';
import { hostAtoms, useHostSelect } from '@modules/host';
import {
  useNodeAdd,
  nodeLauncherAtoms,
  useGetRegions,
  NodeLauncherHost,
  NodeLauncherState,
  NodePropertyGroup,
  sortVersions,
  NodeLauncherRegion,
  nodeLauncherSelectors,
  NodeLauncherVariantSegments,
} from '@modules/node';
import { organizationSelectors } from '@modules/organization';
import { ROUTES, useNavigate } from '@shared/index';
import { usePricing } from '@modules/billing';
import { ResourceAffinity } from '@modules/grpc/library/blockjoy/common/v1/node';
import { imageClient, protocolClient } from '@modules/grpc';
import { authSelectors } from '@modules/auth';
import { Visibility } from '@modules/grpc/library/blockjoy/common/v1/protocol';

type IUseNodeLauncherHandlersParams = {
  fulfilReqs: boolean;
  resetFulfilReqs: VoidFunction;
};

interface IUseNodeLauncherHandlersHook {
  handleHostsChanged: (hosts: NodeLauncherHost[] | null) => void;
  handleRegionsChanged: (regions: NodeLauncherRegion[] | null) => void;
  handleRegionsLoaded: (regionInfo: RegionInfo | null) => void;
  handleProtocolSelected: (protocol: Protocol) => void;
  handleNodePropertyChanged: <K extends keyof NodeLauncherState>(
    name: K,
    value: NodeLauncherState[K],
  ) => void;
  handleNodeConfigPropertyChanged: (
    key: string,
    keyGroup: string,
    value: string | boolean,
  ) => void;
  handleVersionChanged: (version: ProtocolVersion) => void;
  handleVariantChanged: (variant: string) => void;
  handleVariantSegmentsChanged: (
    variantSegments: NodeLauncherVariantSegments,
  ) => void;
  handleCreateNodeClicked: () => void;
}

export const useNodeLauncherHandlers = ({
  fulfilReqs,
  resetFulfilReqs,
}: IUseNodeLauncherHandlersParams): IUseNodeLauncherHandlersHook => {
  const searchParams = useSearchParams();
  const { navigate } = useNavigate();
  const { getHosts } = useHostSelect();
  const { createNode } = useNodeAdd();
  const { getRegions } = useGetRegions();
  const { getPrice } = usePricing();

  const isSuperUser = useRecoilValue(authSelectors.isSuperUser);

  const isVariantValid = useRecoilValue(nodeLauncherSelectors.isVariantValid);

  const defaultOrganization = useRecoilValue(
    organizationSelectors.defaultOrganization,
  );

  const allHosts = useRecoilValue(hostAtoms.allHosts);

  const totalNodesToLaunch = useRecoilValue(
    nodeLauncherSelectors.totalNodesToLaunch,
  );

  const setVersionMetadata = useSetRecoilState(
    nodeLauncherAtoms.versionMetadata,
  );

  const [selectedProtocol, setSelectedProtocol] = useRecoilState(
    nodeLauncherAtoms.selectedProtocol,
  );
  const [nodeLauncherState, setNodeLauncherState] = useRecoilState(
    nodeLauncherAtoms.nodeLauncher,
  );
  const resetNodeLauncherState = useResetRecoilState(
    nodeLauncherAtoms.nodeLauncher,
  );
  const [error, setError] = useRecoilState(nodeLauncherAtoms.error);
  const setIsLaunchError = useSetRecoilState(nodeLauncherAtoms.isLaunchError);
  const setIsLaunching = useSetRecoilState(nodeLauncherAtoms.isLaunching);
  const [selectedHosts, setSelectedHosts] = useRecoilState(
    nodeLauncherAtoms.selectedHosts,
  );
  const [selectedVersion, setSelectedVersion] = useRecoilState(
    nodeLauncherAtoms.selectedVersion,
  );
  const resetSelectedVersion = useResetRecoilState(
    nodeLauncherAtoms.selectedVersion,
  );

  const resetSelectedVariant = useResetRecoilState(
    nodeLauncherAtoms.selectedVariant,
  );

  const resetSelectedVariantSegments = useResetRecoilState(
    nodeLauncherAtoms.selectedVariantSegments,
  );

  const [selectedRegions, setSelectedRegions] = useRecoilState(
    nodeLauncherAtoms.selectedRegions,
  );

  const [selectedImage, setSelectedImage] = useRecoilState(
    nodeLauncherAtoms.selectedImage,
  );

  const setVariants = useSetRecoilState(nodeLauncherAtoms.variants);

  const setVersions = useSetRecoilState(nodeLauncherAtoms.versions);

  const [selectedVariant, setSelectedVariant] = useRecoilState(
    nodeLauncherAtoms.selectedVariant,
  );

  const [selectedVariantSegments, setSelectedVariantSegments] = useRecoilState(
    nodeLauncherAtoms.selectedVariantSegments,
  );

  const resetSelectedImage = useResetRecoilState(
    nodeLauncherAtoms.selectedImage,
  );

  useEffect(() => {
    if (error) resetError();
  }, [
    selectedProtocol,
    selectedRegions,
    selectedHosts,
    selectedVariant,
    selectedVersion,
    selectedImage,
  ]);

  useEffect(() => {
    setSelectedHosts(null);
  }, [allHosts]);

  useEffect(() => {
    let queriedHost = null;
    const hostId = searchParams.get('hostId');

    if (hostId) {
      queriedHost =
        allHosts.find((host: Host) => host.hostId === hostId) ?? null;

      if (queriedHost) {
        const isValid = queriedHost.ipAddresses.some((host) => !host.assigned);

        setSelectedHosts([
          {
            nodesToLaunch: 1,
            host: queriedHost!,
            isValid,
          },
        ]);
      }
    }
  }, [allHosts]);

  useEffect(() => {
    if (!selectedImage) return;

    const properties: NodePropertyGroup[] = [];
    const processedKeys = new Set<string>();

    // First, process properties without keyGroup (individual properties like switches, text inputs)
    const propertiesWithoutKeyGroup: NodePropertyGroup[] =
      selectedImage?.properties
        .filter((property) => !property.keyGroup)
        .map((property) => {
          processedKeys.add(property.key);
          return {
            key: property.key,
            uiType: property.uiType,
            value: property.defaultValue || '',
            properties: [property],
            displayName: property.displayName!,
            displayGroup: property.displayGroup,
          };
        }) ?? [];

    properties.push(...propertiesWithoutKeyGroup);

    // Then, process keyGroups (for enum-like properties that have multiple options)
    const keyGroups = Array.from(
      new Set(
        selectedImage?.properties
          ?.filter((property) => property.keyGroup && !processedKeys.has(property.key))
          ?.map((property) => property.keyGroup),
      ),
    );

    for (let keyGroup of keyGroups) {
      const keyGroupProperties = selectedImage?.properties.filter(
        (property) => property.keyGroup === keyGroup && !processedKeys.has(property.key),
      );

      const firstProperty = keyGroupProperties?.[0];
      if (!firstProperty) continue;

      const defaultProperty = selectedImage?.properties.find(
        (property) => property.keyGroup === keyGroup && property.isGroupDefault,
      );

      // Mark all properties in this group as processed
      keyGroupProperties.forEach(prop => processedKeys.add(prop.key));

      properties.push({
        key: defaultProperty?.key || firstProperty.key,
        keyGroup: keyGroup!,
        uiType: firstProperty.uiType,
        value: defaultProperty?.defaultValue || firstProperty.defaultValue || '',
        properties: keyGroupProperties!,
        displayName: firstProperty.displayName!,
        displayGroup: defaultProperty?.displayGroup || firstProperty.displayGroup,
      });
    }

    const firewall = selectedImage?.firewall?.rules! ?? [];

    setNodeLauncherState((nodeLauncherOldState) => ({
      ...nodeLauncherOldState,
      properties,
      firewall,
    }));
  }, [selectedImage]);

  useEffect(() => {
    (async () => {
      if (!selectedVersion) {
        setSelectedImage(null);
        return;
      }

      try {
        const imageResponse = await imageClient.getImage({
          versionKey: selectedVersion.versionKey,
          semanticVersion: selectedVersion.semanticVersion,
          orgId: defaultOrganization?.orgId,
        });

        setSelectedImage(imageResponse.image!);
      } catch (err) {
        setSelectedImage(null);
        console.log('getImageError', err);
      }
    })();
  }, [selectedVersion]);

  useEffect(() => {
    (async () => {
      if (!defaultOrganization || !selectedProtocol) return;
      const variantsResponse = await protocolClient.listVariants({
        protocolId: selectedProtocol?.protocolId!,
        orgId: defaultOrganization?.orgId,
      });

      setVariants(variantsResponse);

      if (selectedProtocol.key === 'legacy') {
        setSelectedVariant({
          protocol: selectedProtocol.key,
          variantKey: 'legacy',
        });
      }

      const metadata = selectedProtocol.versions
        .filter(
          (v) =>
            v.visibility === Visibility.VISIBILITY_PUBLIC && v.metadata.length,
        )
        .map((innerArray) => {
          const item: Record<string, string> = {};

          for (const kv of innerArray.metadata) {
            if (!item[kv.metadataKey]) {
              item[kv.metadataKey] = '';
            }
            item[kv.metadataKey] = kv.value;
          }

          return item;
        });

      setVersionMetadata(metadata?.length ? metadata : null);
      setSelectedVariantSegments({
        client: { selectedItem: null },
        network: { selectedItem: null },
        nodeType: { selectedItem: null },
      });
      setSelectedVariant(null);
    })();
  }, [selectedProtocol, defaultOrganization]);

  useEffect(() => {
    (async () => {
      if ((!isVariantValid || !selectedProtocol?.key) && !selectedVariant) {
        setSelectedVersion(null);
        return;
      }

      const versionsResponse = await protocolClient.listVersions({
        versionKey: {
          protocolKey: selectedProtocol?.key!,
          variantKey:
            selectedVariant?.variantKey ||
            `${selectedVariantSegments.client.selectedItem?.id}-${selectedVariantSegments.network.selectedItem?.id}-${selectedVariantSegments.nodeType.selectedItem?.id}`,
        },
        orgId: defaultOrganization?.orgId,
      });

      setVersions(versionsResponse);

      setSelectedVersion(
        versionsResponse.length
          ? sortVersions(
              versionsResponse.filter(
                (version) =>
                  version.visibility === Visibility.VISIBILITY_PUBLIC,
              ),
            )[0]
          : null,
      );
    })();
  }, [selectedVariant, selectedVariantSegments]);

  useEffect(() => {
    if (selectedVersion && selectedRegions && defaultOrganization)
      getPrice({
        regionId: isSuperUser
          ? ''
          : selectedRegions[0]?.regionInfo?.region?.regionId!,
        versionKey: selectedVersion.versionKey,
        orgId: defaultOrganization?.orgId,
      });
  }, [selectedProtocol, selectedVersion, selectedRegions]);

  useEffect(() => {
    if (fulfilReqs) handleCreateNodeClicked();
  }, [fulfilReqs]);

  useEffect(() => {
    if (!isSuperUser && !defaultOrganization?.orgId) {
      return;
    }

    getHosts(isSuperUser ? undefined : defaultOrganization?.orgId);
  }, [defaultOrganization?.orgId, isSuperUser]);

  useEffect(() => {
    if (defaultOrganization?.orgId) getRegions();
  }, [defaultOrganization?.orgId, selectedImage]);

  const handleHostsChanged = (hosts: NodeLauncherHost[] | null) => {
    setSelectedHosts(hosts);
    setSelectedRegions(null);
  };

  const handleRegionsChanged = (regions: NodeLauncherRegion[] | null) => {
    setSelectedRegions(regions);
  };

  const handleRegionsLoaded = (regionInfo: RegionInfo | null) => {
    if (!isSuperUser && regionInfo) {
      setSelectedRegions([
        {
          nodesToLaunch: 1,
          regionInfo: regionInfo!,
        },
      ]);
    }
  };

  const handleProtocolSelected = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
  };

  const handleNodePropertyChanged = <K extends keyof NodeLauncherState>(
    name: K,
    value: NodeLauncherState[K],
  ) => {
    setNodeLauncherState((nodeLauncherOldState) => ({
      ...nodeLauncherOldState,
      [name]: value,
    }));
  };

  const handleNodeConfigPropertyChanged = (
    key: string,
    keyGroup: string,
    value: boolean | string,
  ) => {
    setError('');
    setIsLaunchError(false);

    if (!nodeLauncherState.properties) return;

    const propertiesCopy = [...nodeLauncherState.properties!];

    // Find the exact property to update
    const propertyIndex = propertiesCopy.findIndex((property) => {
      // For keyGroup properties (enums), match by keyGroup
      if (keyGroup && keyGroup !== '' && property.keyGroup === keyGroup) {
        return true;
      }
      // For individual properties (switches, text inputs), match by key when no keyGroup
      if ((!keyGroup || keyGroup === '') && (!property.keyGroup || property.keyGroup === '') && property.key === key) {
        return true;
      }
      return false;
    });

    if (propertyIndex === -1) return;

    const currentProperty = propertiesCopy[propertyIndex];
    const newValue = value?.toString();
    
    // Only update if the value has actually changed
    if (currentProperty.key === key && currentProperty.value === newValue) {
      return;
    }
    
    const updatedProperty = {
      ...currentProperty,
      key,
      value: newValue,
    };

    propertiesCopy[propertyIndex] = updatedProperty;

    setNodeLauncherState((nodeLauncherOldState) => ({
      ...nodeLauncherOldState,
      properties: propertiesCopy,
    }));
  };

  const handleVersionChanged = (version: ProtocolVersion) => {
    setSelectedVersion(version);
  };

  const handleVariantChanged = (variantKey: string) => {
    resetSelectedVariantSegments();
    setSelectedVariant({
      protocol: selectedProtocol?.key!,
      variantKey,
    });
  };

  const handleVariantSegmentsChanged = (
    variantSegments: NodeLauncherVariantSegments,
  ) => {
    if (isVariantValid) resetSelectedVariant();
    setSelectedVariantSegments(variantSegments);
  };

  const handleCreateNodeClicked = async () => {
    setIsLaunching(true);

    const isSingleNode = totalNodesToLaunch === 1;

    const params: NodeServiceCreateRequest = {
      orgId: defaultOrganization!.orgId,
      imageId: selectedImage?.imageId!,
      newValues: nodeLauncherState.properties?.map((property) => ({
        key: property.key,
        value: property.value,
      }))!,
      launcher: {},
      addRules: nodeLauncherState.firewall,
    };

    if (selectedHosts?.length!) {
      params.launcher = {
        byHost: {
          hostCounts: selectedHosts.map(
            ({ host: { hostId }, nodesToLaunch: nodeCount }) => ({
              hostId,
              nodeCount,
            }),
          ),
        },
      };
    } else {
      params.launcher = {
        byRegion: {
          regionCounts: selectedRegions?.map(
            ({ regionInfo, nodesToLaunch: nodeCount }) => ({
              regionId: regionInfo.region?.regionId!,
              nodeCount,
              resource: ResourceAffinity.RESOURCE_AFFINITY_LEAST_RESOURCES,
            }),
          )!,
        },
      };
    }

    await createNode(
      params,
      (nodeId: string) => {
        if (!isSingleNode) toast.success('All nodes launched');

        navigate(isSingleNode ? ROUTES.NODE(nodeId) : ROUTES.NODES, () => {
          resetNodeLauncherState();
          resetSelectedVersion();
          resetSelectedImage();
        });
      },
      (error: string) => setError(error!),
    );
  };

  const resetError = () => {
    resetFulfilReqs();
    setError(null);
    setIsLaunchError(false);
    setIsLaunching(false);
  };

  return {
    handleHostsChanged,
    handleRegionsChanged,
    handleRegionsLoaded,
    handleProtocolSelected,
    handleNodePropertyChanged,
    handleNodeConfigPropertyChanged,
    handleVersionChanged,
    handleVariantChanged,
    handleVariantSegmentsChanged,
    handleCreateNodeClicked,
  };
};
