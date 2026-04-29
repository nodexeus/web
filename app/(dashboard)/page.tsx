'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Server,
  HardDrive,
  Activity,
  ArrowUpRight,
  CircleCheck,
  CircleAlert,
  Clock,
  Loader2,
} from 'lucide-react';

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-border/80">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-2xl font-medium tracking-tight">{value}</p>
      {trend && (
        <p className="mt-1 flex items-center gap-1 text-xs text-success">
          <ArrowUpRight className="h-3 w-3" />
          {trend}
        </p>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: 'running' | 'provisioning' | 'stopped' | 'error';
}) {
  const config = {
    running: {
      icon: CircleCheck,
      label: 'Running',
      className: 'text-success bg-success/10',
    },
    provisioning: {
      icon: Loader2,
      label: 'Provisioning',
      className: 'text-warning bg-warning/10',
    },
    stopped: {
      icon: Clock,
      label: 'Stopped',
      className: 'text-muted-foreground bg-muted',
    },
    error: {
      icon: CircleAlert,
      label: 'Error',
      className: 'text-destructive bg-destructive/10',
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function NodeRow({
  name,
  protocol,
  status,
  host,
  ip,
}: {
  name: string;
  protocol: string;
  status: 'running' | 'provisioning' | 'stopped' | 'error';
  host: string;
  ip: string;
}) {
  return (
    <tr className="border-b border-border/50 transition-colors hover:bg-accent/50">
      <td className="py-3 pr-4">
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-muted-foreground">{protocol}</p>
      </td>
      <td className="py-3 pr-4">
        <StatusBadge status={status} />
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">{host}</td>
      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
        {ip}
      </td>
      <td className="py-3 text-right">
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          View
        </Button>
      </td>
    </tr>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border/50">
      <td className="py-3 pr-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-1.5 h-3 w-20" />
      </td>
      <td className="py-3 pr-4">
        <Skeleton className="h-5 w-20 rounded-full" />
      </td>
      <td className="py-3 pr-4">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="py-3 pr-4">
        <Skeleton className="h-4 w-28" />
      </td>
      <td className="py-3 text-right">
        <Skeleton className="ml-auto h-7 w-12" />
      </td>
    </tr>
  );
}

export default function PreviewPage() {
  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your infrastructure
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Nodes"
          value="142"
          icon={Server}
          trend="+12 this week"
        />
        <StatCard
          label="Active Hosts"
          value="38"
          icon={HardDrive}
          trend="+3 this week"
        />
        <StatCard label="Uptime" value="99.97%" icon={Activity} />
        <StatCard label="Nodes Launching" value="5" icon={Loader2} />
      </div>

      <Separator />

      {/* Nodes table */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-tight">Recent Nodes</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Filter
            </Button>
            <Button size="sm">
              <Rocket className="mr-2 h-3.5 w-3.5" />
              Launch Node
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Node</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="px-4">
              <NodeRow
                name="eth-mainnet-01"
                protocol="Ethereum"
                status="running"
                host="host-us-east-1a"
                ip="10.0.12.44"
              />
              <NodeRow
                name="sol-validator-03"
                protocol="Solana"
                status="running"
                host="host-eu-west-2b"
                ip="10.0.8.102"
              />
              <NodeRow
                name="avax-subnet-07"
                protocol="Avalanche"
                status="provisioning"
                host="host-us-west-1a"
                ip="10.0.22.61"
              />
              <NodeRow
                name="dot-para-12"
                protocol="Polkadot"
                status="error"
                host="host-ap-south-1a"
                ip="10.0.3.88"
              />
              <NodeRow
                name="matic-full-05"
                protocol="Polygon"
                status="stopped"
                host="host-us-east-2a"
                ip="10.0.15.201"
              />

              {/* Skeleton rows to show loading state */}
              <SkeletonRow />
              <SkeletonRow />
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity feed preview */}
      <div>
        <h2 className="mb-4 text-lg font-medium tracking-tight">
          Recent Activity
        </h2>
        <div className="space-y-3">
          {[
            {
              action: 'Node launched',
              detail: 'eth-mainnet-01 started by admin@blockvisor.io',
              time: '2 min ago',
            },
            {
              action: 'Host registered',
              detail: 'host-us-west-1a came online in us-west-1',
              time: '15 min ago',
            },
            {
              action: 'Node error',
              detail: 'dot-para-12 reported a connection timeout',
              time: '1 hour ago',
            },
            {
              action: 'Organization updated',
              detail: 'Production org billing address changed',
              time: '3 hours ago',
            },
          ].map((event, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-md border border-border/50 bg-card/50 p-3 transition-colors hover:bg-card"
            >
              <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{event.action}</p>
                <p className="text-xs text-muted-foreground">{event.detail}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {event.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Rocket(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}
