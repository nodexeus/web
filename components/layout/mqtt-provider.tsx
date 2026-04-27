'use client';

import { useMqtt } from '@/lib/hooks/use-mqtt';

export function MqttProvider({ children }: { children: React.ReactNode }) {
  useMqtt();
  return <>{children}</>;
}
