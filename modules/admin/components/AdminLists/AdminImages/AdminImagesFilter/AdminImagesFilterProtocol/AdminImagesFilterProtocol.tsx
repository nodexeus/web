import { useEffect, useState } from 'react';
import { AdminListFilterControl } from '@modules/admin';
import { unique } from '@shared/index';
import { sort } from '@shared/components';
import { AdminFilterControlProps } from '@modules/admin/types/AdminFilterControlProps';
import { capitalize } from 'utils/capitalize';

// TODO: Replace with actual Image type once gRPC client is implemented
type Image = {
  imageId: string;
  protocolName: string;
  versionKey: string;
  buildVersion: number;
  propertyCount: number;
  createdAt: Date;
  orgId?: string;
};

export const AdminImagesFilterProtocol = ({
  columnName,
  values,
  listAll,
  onFilterChange,
}: AdminFilterControlProps) => {
  const [list, setList] = useState<AdminFilterDropdownItem[] | undefined>();

  useEffect(() => {
    const all: AdminFilterDropdownItem[] | undefined = (listAll as Image[])?.map(
      ({ imageId, protocolName }) => ({
        id: protocolName, // Use protocolName as ID so duplicates are filtered out
        name: capitalize(protocolName),
      }),
    );
    setList(sort(unique(all!, 'id'), { field: 'name' }));
  }, [listAll]);

  return (
    <AdminListFilterControl
      columnName={columnName}
      items={list}
      values={values}
      onFilterChange={onFilterChange}
    />
  );
};