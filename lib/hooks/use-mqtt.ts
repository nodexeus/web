'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { getIdentity } from '@modules/grpc/utils/utils';
import {
  NodeMessage,
  OrgMessage,
} from '@modules/grpc/library/blockjoy/v1/event';
import { useAuth } from './use-auth';
import { useOrganizations } from './use-organizations';
import { useNotificationStore } from '@/lib/stores/notification-store';

function getActiveTopic(topic: string): 'nodes' | 'organization' | null {
  if (!topic) return null;
  const nodeTopicRegex = /^\/orgs\/[\w-]+\/nodes$/;
  const orgTopicRegex = /^\/orgs\/[\w-]+$/;
  if (nodeTopicRegex.test(topic)) return 'nodes';
  if (orgTopicRegex.test(topic)) return 'organization';
  return null;
}

// Track last known node state per nodeId — used to filter out heartbeat
// updates that don't represent an actual state change.
const lastKnownNodeState = new Map<string, number>();

// Call this from action handlers to pre-set the expected state.
// When MQTT later delivers the same state, it will be treated as
// "no change" and no duplicate notification will fire.
export function setExpectedNodeState(nodeId: string, state: number) {
  lastKnownNodeState.set(nodeId, state);
}

// During the warmup period after connecting or switching orgs, we silently
// record node states without generating notifications. This prevents the
// initial flood of "Node Status Changed" events when the page first loads
// or the user switches orgs.
let isWarmedUp = false;
let warmupTimer: ReturnType<typeof setTimeout> | null = null;

function startWarmup() {
  isWarmedUp = false;
  lastKnownNodeState.clear();
  if (warmupTimer) clearTimeout(warmupTimer);
  // Allow 5 seconds for the initial burst of status messages to arrive,
  // then start generating real notifications.
  console.log('[MQTT] Warmup started — notifications suppressed for 5s');
  warmupTimer = setTimeout(() => {
    isWarmedUp = true;
    console.log(
      '[MQTT] Warmup complete — notifications enabled, tracking',
      lastKnownNodeState.size,
      'nodes',
    );
  }, 5000);
}

export function useMqtt() {
  const { accessToken } = useAuth();
  const { defaultOrg } = useOrganizations();
  const queryClient = useQueryClient();
  const clientRef = useRef<MqttClient | null>(null);
  const orgIdRef = useRef<string | null>(null);
  const defaultOrgRef = useRef(defaultOrg);
  const handleMessageRef = useRef<(topic: string, payload: Buffer) => void>(
    () => {},
  );

  // Keep org ref in sync so the connect handler always has the latest value
  defaultOrgRef.current = defaultOrg;

  const handleMessage = useCallback(
    (topic: string, payload: Buffer) => {
      const type = getActiveTopic(topic);

      console.log(
        '[MQTT] Message received, type:',
        type,
        'warmedUp:',
        isWarmedUp,
        'knownNodes:',
        lastKnownNodeState.size,
      );

      if (type === 'nodes') {
        try {
          const msg = NodeMessage.decode(new Uint8Array(payload));

          if (msg.created || msg.updated || msg.deleted) {
            // Invalidate the nodes list so it refetches
            queryClient.invalidateQueries({ queryKey: ['nodes'] });
            queryClient.invalidateQueries({ queryKey: ['hostNodes'] });

            // If a specific node was updated/created, invalidate its detail cache
            const nodeId =
              msg.updated?.node?.nodeId ??
              msg.created?.node?.nodeId ??
              msg.deleted?.nodeId;

            if (nodeId) {
              queryClient.invalidateQueries({
                queryKey: ['node', nodeId],
              });
            }

            // Dispatch notifications
            const addNotification =
              useNotificationStore.getState().addNotification;

            if (msg.created?.node && isWarmedUp) {
              addNotification({
                type: 'node-created',
                title: 'Node Launched',
                message: `${msg.created.node.sqdName || msg.created.node.displayName || msg.created.node.nodeName || 'A node'} was launched`,
                nodeId: msg.created.node.nodeId,
              });
            }

            if (msg.updated?.node) {
              const node = msg.updated.node;
              const currentState = node.nodeStatus?.state ?? 0;
              const previousState = lastKnownNodeState.get(node.nodeId);
              lastKnownNodeState.set(node.nodeId, currentState);

              const nodeName =
                node.sqdName || node.displayName || node.nodeName || 'unknown';
              console.log(
                `[MQTT] Node update: ${nodeName} state=${currentState} prev=${previousState} warmedUp=${isWarmedUp}`,
              );

              // Only notify if warmed up AND the state actually changed
              if (
                isWarmedUp &&
                previousState !== undefined &&
                previousState !== currentState
              ) {
                console.log(
                  `[MQTT] ✅ Notifying: ${nodeName} changed ${previousState} → ${currentState}`,
                );
                const stateNames: Record<number, string> = {
                  1: 'starting',
                  2: 'running',
                  3: 'stopped',
                  4: 'failed',
                  5: 'upgrading',
                  6: 'deleting',
                  7: 'deleted',
                };
                const stateName = stateNames[currentState] || 'updated';
                addNotification({
                  type: 'node-updated',
                  title: 'Node Status Changed',
                  message: `${node.sqdName || node.displayName || node.nodeName || 'A node'} is now ${stateName}`,
                  nodeId: node.nodeId,
                });
              }
            }

            if (msg.deleted && isWarmedUp) {
              addNotification({
                type: 'node-deleted',
                title: 'Node Deleted',
                message: `A node was deleted`,
                nodeId: msg.deleted.nodeId,
              });
            }
          }
        } catch (err) {
          console.error('[MQTT] Failed to decode node message:', err);
        }
      } else if (type === 'organization') {
        try {
          const msg = OrgMessage.decode(new Uint8Array(payload));

          if (msg.created || msg.updated || msg.deleted) {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
            queryClient.invalidateQueries({
              queryKey: ['defaultOrganization'],
            });
          }

          // Dispatch org notifications (only after warmup)
          if (isWarmedUp) {
            const addOrgNotification =
              useNotificationStore.getState().addNotification;

            if (msg.created?.org) {
              addOrgNotification({
                type: 'org-created',
                title: 'Organization Created',
                message: `${msg.created.org.name || 'An organization'} was created`,
                orgId: msg.created.org.orgId,
              });
            }

            if (msg.updated?.org) {
              addOrgNotification({
                type: 'org-updated',
                title: 'Organization Updated',
                message: `${msg.updated.org.name || 'An organization'} was updated`,
                orgId: msg.updated.org.orgId,
              });
            }

            if (msg.deleted) {
              addOrgNotification({
                type: 'org-deleted',
                title: 'Organization Deleted',
                message: 'An organization was deleted',
              });
            }
          }
        } catch (err) {
          console.error('[MQTT] Failed to decode org message:', err);
        }
      }
    },
    [queryClient],
  );

  // Keep the ref in sync with the latest callback
  handleMessageRef.current = handleMessage;

  // Connect to MQTT when we have a token
  useEffect(() => {
    const mqttUrl = process.env.NEXT_PUBLIC_MQTT_URL;
    if (!mqttUrl || !accessToken) return;

    // Don't reconnect if already connected
    if (clientRef.current?.connected) return;

    // Start warmup period — silently record states for 10 seconds
    startWarmup();

    const options: IClientOptions = {
      protocolVersion: 5,
      keepalive: 0,
      reconnectPeriod: 5000,
      // Read fresh token from localStorage on every connection/reconnect
      // attempt — the token may have been refreshed since the initial connect.
      transformWsUrl: (url, _opts, client) => {
        const identity = getIdentity();
        const token: string = identity?.accessToken;
        if (token) {
          // Use userId as username (non-sensitive identifier) and JWT as password only.
          // Passing the JWT as both username and password doubles the exposure surface
          // since MQTT brokers may log usernames in plaintext.
          client.options.username = identity?.userId || 'anonymous';
          client.options.password = token;
        }
        return url;
      },
    };

    const client = mqtt.connect(mqttUrl, options);

    client.on('connect', () => {
      // Read the latest org from the ref (not the stale closure value)
      const currentOrg = defaultOrgRef.current;
      console.log(
        '[MQTT] Connected successfully. Token present:',
        Boolean(getIdentity()?.accessToken),
        'Org:',
        currentOrg?.orgId ?? 'none yet',
      );

      // Subscribe to current org if we have one
      if (currentOrg?.orgId && orgIdRef.current !== currentOrg.orgId) {
        const topics = [
          `/orgs/${currentOrg.orgId}`,
          `/orgs/${currentOrg.orgId}/nodes`,
        ];
        client.subscribe(topics, (err) => {
          if (err) {
            console.error('[MQTT] Subscribe error:', err);
          } else {
            console.log('[MQTT] Subscribed to', topics);
            orgIdRef.current = currentOrg.orgId;
          }
        });
      }
    });

    client.on('message', (topic: string, payload: Uint8Array) => {
      handleMessageRef.current(topic, Buffer.from(payload));
    });

    client.on('error', (err) => {
      console.error('[MQTT] Error:', err);
      // If auth fails, stop retrying to avoid an infinite loop.
      // The connection will be re-established when the token changes
      // (the effect re-runs on accessToken change).
      if (err.message?.includes('Bad User Name or Password')) {
        console.warn('[MQTT] Auth rejected — stopping reconnect');
        client.end(true);
      }
    });

    client.on('close', () => {
      console.log('[MQTT] Disconnected');
    });

    clientRef.current = client;

    return () => {
      client.end();
      clientRef.current = null;
      if (warmupTimer) clearTimeout(warmupTimer);
    };
    // We intentionally depend only on accessToken for connection lifecycle.
    // handleMessage is accessed via ref to avoid reconnection cycles.
    // Org subscription changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Subscribe/resubscribe when org changes or becomes available.
  // This handles the case where the org loads after MQTT connects.
  useEffect(() => {
    if (!defaultOrg?.orgId) return;
    if (orgIdRef.current === defaultOrg.orgId) return;

    const client = clientRef.current;
    if (!client?.connected) {
      // Client not connected yet — the connect handler will pick up
      // the org from defaultOrgRef when it fires.
      console.log(
        '[MQTT] Org ready but client not connected yet, will subscribe on connect',
      );
      return;
    }

    // Reset warmup when switching orgs — the initial burst of status
    // messages for the new org should be silently absorbed.
    startWarmup();

    // Unsubscribe from old org
    if (orgIdRef.current) {
      const oldTopics = [
        `/orgs/${orgIdRef.current}`,
        `/orgs/${orgIdRef.current}/nodes`,
      ];
      client.unsubscribe(oldTopics, undefined, (err) => {
        if (err) {
          console.error('[MQTT] Unsubscribe error:', err);
        }
      });
    }

    // Subscribe to new org
    const newTopics = [
      `/orgs/${defaultOrg.orgId}`,
      `/orgs/${defaultOrg.orgId}/nodes`,
    ];
    client.subscribe(newTopics, (err) => {
      if (err) {
        console.error('[MQTT] Resubscribe error:', err);
      } else {
        console.log('[MQTT] Resubscribed to', newTopics);
        orgIdRef.current = defaultOrg.orgId;
      }
    });
  }, [defaultOrg?.orgId]);
}
