import { useEffect, useRef, useState } from 'react';
import { useRecoilValue } from 'recoil';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { env } from '@shared/constants/env';
import { getActiveTopic, createWebWorker, keepAlive } from '@modules/mqtt';
import { useUpdates as useNodeUpdates } from '@modules/node';
import {
  useUpdates as useOrgUpdates,
  organizationSelectors,
} from '@modules/organization';
import { getIdentity } from '@modules/grpc';

type IMqttHook = {
  connect: VoidFunction;
  reconnect: VoidFunction;
  client: MqttClient | null;
  error?: Error | null;
  message?: Message | null;
  connectStatus: ConnectionStatus;
  updateSubscription: VoidFunction;
};

export const useMqtt = (): IMqttHook => {
  const { handleNodeUpdate } = useNodeUpdates();
  const { handleOrganizationUpdate } = useOrgUpdates();

  const defaultOrganization = useRecoilValue(
    organizationSelectors.defaultOrganization,
  );

  const [client, setClient] = useState<MqttClient | null>(null);
  const [connectStatus, setConnectStatus] =
    useState<ConnectionStatus>('Connect');
  const [message, setMessage] = useState<Message | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const subscribedTopics = useRef<string[]>([]);
  const keepAliveWorker = useRef<Worker | null>(null);

  // Refs to hold the latest values, avoiding stale closures in event handlers
  const clientRef = useRef<MqttClient | null>(null);
  const defaultOrganizationRef = useRef(defaultOrganization);
  const handleNodeUpdateRef = useRef(handleNodeUpdate);
  const handleOrganizationUpdateRef = useRef(handleOrganizationUpdate);

  // Keep refs in sync with latest values
  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  useEffect(() => {
    defaultOrganizationRef.current = defaultOrganization;
  }, [defaultOrganization]);

  useEffect(() => {
    handleNodeUpdateRef.current = handleNodeUpdate;
  }, [handleNodeUpdate]);

  useEffect(() => {
    handleOrganizationUpdateRef.current = handleOrganizationUpdate;
  }, [handleOrganizationUpdate]);

  const mqttConnect = () => {
    if (client?.connected) return;
    setConnectStatus('Connecting');

    const options: IClientOptions = {
      protocolVersion: 5,
      keepalive: 0,
      transformWsUrl: (url, options, client) => {
        const token: string = getIdentity()?.accessToken;

        client.options.username = token;
        client.options.password = token;

        return url;
      },
    };

    try {
      const mqttClient = mqtt.connect(env.mqttUrl!, options);
      setClient(mqttClient);
      console.log('Connected to MQTT');
    } catch (err: any) {
      console.error('Error while connecting to MQTT client', err);
    }
  };

  const mqttUpdateSubscription = () => {
    const currentClient = clientRef.current;
    const currentOrg = defaultOrganizationRef.current;

    if (!currentClient || !currentClient.connected || !currentOrg) return;

    const topics = [
      `/orgs/${currentOrg.orgId}`,
      `/orgs/${currentOrg.orgId}/nodes`,
    ];

    if (subscribedTopics.current.length) mqttUnSubscribe();
    mqttSubscribe(topics);
  };

  const mqttSubscribe = (topics: string[]) => {
    const currentClient = clientRef.current;
    if (!currentClient?.connected) return;
    currentClient.subscribe(topics, (err: Error | null) => {
      if (err) {
        console.error(`Failed to subscribe to ${topics}: ${err}`);
        return;
      }

      subscribedTopics.current = topics;
    });
  };

  const mqttUnSubscribe = () => {
    const currentClient = clientRef.current;
    if (!currentClient?.connected) return;
    currentClient.unsubscribe(subscribedTopics.current, (err?: Error) => {
      if (err) {
        console.error(
          `Failed to unsubscribe from ${subscribedTopics.current}: ${err}`,
        );
        return;
      }
      subscribedTopics.current = [];
    });
  };

  const mqttReconnect = async () => {
    if (!client || client.reconnecting) return;

    if (client.disconnected || client.disconnecting) handleReconnect();
    else
      client.end(false, () => {
        handleReconnect();
      });
  };

  useEffect(() => {
    if (client) {
      client.on('connect', () => {
        setConnectStatus('Connected');
        mqttUpdateSubscription();
        setError(null);

        manageKeepAliveWorker();
      });

      client.on('error', (err: Error) => {
        console.error('Connection error: ', err);
        setError(err);
      });

      client.on('reconnect', () => {
        console.log('Reconnecting');
        setConnectStatus('Reconnecting');
      });

      client.on('message', (topic: string, payload: Uint8Array) => {
        try {
          const type: Topic = getActiveTopic(topic);
          setMessage({ type, topic, payload });
        } catch (err) {
          console.error(`Failed to handle message: ${err}`);
        }
      });

      client.on('close', () => {
        console.log('Disconnected from broker.');
        keepAliveWorker.current?.terminate();
        keepAliveWorker.current = null;
        setConnectStatus('Connect');
      });

      client.on('offline', () => {
        console.log('MQTT client offline');
        setConnectStatus('Connect');
      });
    }

    return () => {
      client?.end();
    };
  }, [client]);

  // Re-subscribe when organization changes and client is already connected
  useEffect(() => {
    if (client?.connected && defaultOrganization) {
      mqttUpdateSubscription();
    }
  }, [defaultOrganization?.orgId]);

  // Dispatch messages to the latest handler refs
  useEffect(() => {
    if (!message) return;

    switch (message.type) {
      case 'nodes':
        handleNodeUpdateRef.current(message);
        break;
      case 'organization':
        handleOrganizationUpdateRef.current(message);
        break;
      default:
        break;
    }

    return () => setMessage(null);
  }, [message]);

  const handleReconnect = () => {
    if (!client) return;

    const token: string = getIdentity()?.accessToken;

    client.options.username = token;
    client.options.password = token;

    client.reconnect();
  };

  const manageKeepAliveWorker = () => {
    // Skip if worker already exists (prevent duplicates)
    if (keepAliveWorker.current) return;

    keepAliveWorker.current = createWebWorker(keepAlive);
    keepAliveWorker.current?.addEventListener('message', () => {
      // Use clientRef to always ping the current client, not a stale closure
      const currentClient = clientRef.current;
      if (currentClient?.connected) {
        (currentClient as any)._sendPacket({ cmd: 'pingreq' });
      }
    });
  };

  return {
    connect: mqttConnect,
    reconnect: mqttReconnect,
    client,
    error,
    message,
    connectStatus,
    updateSubscription: mqttUpdateSubscription,
  };
};

export default useMqtt;
