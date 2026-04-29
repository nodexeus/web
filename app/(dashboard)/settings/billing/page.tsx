'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/use-auth';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useOrganizations } from '@/lib/hooks/use-organizations';
import { organizationClient } from '@modules/grpc/clients/organizationClient';
import { InvoiceStatus } from '@modules/grpc/library/blockjoy/v1/org';
import type { Address } from '@modules/grpc/library/blockjoy/common/v1/address';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  Check,
  Plus,
  CreditCard,
  MapPin,
  FileText,
  Download,
  Pencil,
  Receipt,
} from 'lucide-react';

// ─── Stripe helpers ──────────────────────────────────────────────

function getStripeKey(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_KEY;
}

let stripePromise: ReturnType<typeof loadStripe> | null = null;
function getStripe() {
  if (!stripePromise) {
    const key = getStripeKey();
    if (key) stripePromise = loadStripe(key);
  }
  return stripePromise;
}

// ─── Section wrapper ─────────────────────────────────────────────

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      {children}
    </section>
  );
}

// ─── Subscription section ────────────────────────────────────────

function SubscriptionSection() {
  const { defaultOrg } = useOrganizations();
  const { hasPermission } = usePermissions();
  const orgId = defaultOrg?.orgId;

  const canView = hasPermission('org-billing-get-billing-details');

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', orgId],
    queryFn: () => organizationClient.getSubscription(orgId!),
    enabled: Boolean(orgId && canView),
  });

  if (!canView) return null;

  const formatDate = (d: Date | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAmount = (cents: number | undefined) => {
    if (cents == null) return '—';
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <Section id="subscription">
      <h2 className="text-lg font-medium">Subscription</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your current plan and billing cycle
      </p>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-5 w-56" />
        </div>
      ) : !subscription ? (
        <div className="mt-4 rounded-lg border border-dashed p-6 text-center">
          <Receipt className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No active subscription
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                subscription.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : subscription.status === 'trialing'
                    ? 'bg-blue-500/10 text-blue-500'
                    : 'bg-yellow-500/10 text-yellow-500'
              }`}
            >
              {subscription.status}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Period</span>
            <span className="text-sm text-muted-foreground">
              {formatDate(subscription.currentPeriodStart)} –{' '}
              {formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>

          {subscription.items.length > 0 && (
            <div className="border-t pt-3">
              <span className="text-sm font-medium">Plan Items</span>
              <div className="mt-2 space-y-2">
                {subscription.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                  >
                    <span>{item.name ?? 'Item'}</span>
                    <span className="text-muted-foreground">
                      {formatAmount(item.unitAmount)}
                      {item.quantity != null && item.quantity > 1
                        ? ` × ${item.quantity}`
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

// ─── Add Card Form ───────────────────────────────────────────────

function AddCardForm({
  orgId,
  userId,
  onSuccess,
  onCancel,
}: {
  orgId: string;
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    setError('');
    try {
      const clientSecret = await organizationClient.initCard(orgId, userId);
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      const { error: stripeError } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: { name },
          },
        },
      );

      if (stripeError) throw new Error(stripeError.message);

      // Wait for Stripe webhook to process
      await new Promise((resolve) => setTimeout(resolve, 5000));
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add card');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 space-y-4 rounded-lg border bg-card p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Cardholder Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Name on card"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Card Details
        </label>
        <div className="rounded-md border bg-background px-3 py-2.5">
          <CardElement
            options={{
              style: {
                base: {
                  color: '#f0f0f2',
                  fontSize: '14px',
                  '::placeholder': { color: '#6e6e73' },
                },
                invalid: { color: '#da3d2f' },
              },
            }}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || !stripe || !elements}
        >
          {isSubmitting && (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          )}
          Save Card
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Payment Methods section ─────────────────────────────────────

function PaymentMethodsSection() {
  const { user } = useAuth();
  const { defaultOrg } = useOrganizations();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const orgId = defaultOrg?.orgId;

  const canView = hasPermission('org-billing-list-payment-methods');

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['paymentMethods', orgId],
    queryFn: () => organizationClient.listPaymentMethods(orgId!),
    enabled: Boolean(orgId && canView),
  });

  const [showAddCard, setShowAddCard] = useState(false);

  if (!canView) return null;

  const brandIcon = (brand: string) => {
    const b = brand.toLowerCase();
    if (b === 'visa') return '💳 Visa';
    if (b === 'mastercard') return '💳 Mastercard';
    if (b === 'amex') return '💳 Amex';
    if (b === 'discover') return '💳 Discover';
    return `💳 ${brand}`;
  };

  return (
    <Section id="payment-methods">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Payment Methods</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cards on file for your organization
          </p>
        </div>
        {!showAddCard && !isLoading && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddCard(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Card
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : methods.length === 0 && !showAddCard ? (
        <div className="mt-4 rounded-lg border border-dashed p-6 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No payment methods on file
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setShowAddCard(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Card
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {methods.map((pm) => (
            <div
              key={pm.id}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {pm.card ? brandIcon(pm.card.brand) : 'Card'} ····{' '}
                    {pm.card?.last4 ?? '????'}
                  </p>
                  {pm.card && (
                    <p className="text-xs text-muted-foreground">
                      Expires {String(pm.card.expMonth).padStart(2, '0')}/
                      {pm.card.expYear}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddCard && orgId && user?.userId && getStripe() && (
        <Elements stripe={getStripe()}>
          <AddCardForm
            orgId={orgId}
            userId={user.userId}
            onSuccess={() => {
              setShowAddCard(false);
              queryClient.refetchQueries({
                queryKey: ['paymentMethods', orgId],
              });
            }}
            onCancel={() => setShowAddCard(false)}
          />
        </Elements>
      )}
    </Section>
  );
}

// ─── Billing Address section ─────────────────────────────────────

function BillingAddressSection() {
  const { defaultOrg } = useOrganizations();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const orgId = defaultOrg?.orgId;

  const canView = hasPermission('org-address-get');

  const { data: address, isLoading } = useQuery({
    queryKey: ['billingAddress', orgId],
    queryFn: () => organizationClient.getBillingAddress(orgId!),
    enabled: Boolean(orgId && canView),
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Address>({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });
  const [saved, setSaved] = useState(false);

  // Debug logging for billing address issues
  console.log(
    '[Billing] address data:',
    address,
    'canView:',
    canView,
    'orgId:',
    orgId,
  );

  useEffect(() => {
    if (address) {
      // Map fields – handle potential alternate field names from the API
      const raw = address as any;
      setForm({
        line1: address.line1 ?? raw.address ?? '',
        line2: address.line2 ?? '',
        city: address.city ?? '',
        state: address.state ?? '',
        postalCode: address.postalCode ?? raw.postal_code ?? raw.zip ?? '',
        country: address.country ?? '',
      });
    }
  }, [address]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await organizationClient.createBillingAddress(orgId!, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingAddress', orgId] });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (!canView) {
    console.log(
      '[Billing] No permission to view billing address. User lacks org-address-get.',
    );
    return null;
  }

  const updateField = (field: keyof Address, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const fieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      line1: 'Address Line 1',
      line2: 'Address Line 2',
      city: 'City',
      state: 'State / Province',
      postalCode: 'Postal Code',
      country: 'Country',
    };
    return labels[field] ?? field;
  };

  // Determine if the address object has any meaningful content
  const addressHasContent = address
    ? Boolean(
        address.line1 ||
        address.line2 ||
        address.city ||
        address.state ||
        address.postalCode ||
        address.country ||
        (address as any).address ||
        (address as any).postal_code ||
        (address as any).zip,
      )
    : false;

  return (
    <Section id="billing-address">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Billing Address</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Address used for invoices
          </p>
        </div>
        {!editing && !isLoading && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-56" />
        </div>
      ) : editing ? (
        <div className="mt-4 space-y-4 rounded-lg border bg-card p-5">
          {(
            [
              'line1',
              'line2',
              'city',
              'state',
              'postalCode',
              'country',
            ] as const
          ).map((field) => (
            <div key={field}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {fieldLabel(field)}
              </label>
              <input
                type="text"
                value={form[field] ?? ''}
                onChange={(e) => updateField(field, e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder={fieldLabel(field)}
              />
            </div>
          ))}

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Save Address
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                if (address) {
                  const raw = address as any;
                  setForm({
                    line1: address.line1 ?? raw.address ?? '',
                    line2: address.line2 ?? '',
                    city: address.city ?? '',
                    state: address.state ?? '',
                    postalCode:
                      address.postalCode ?? raw.postal_code ?? raw.zip ?? '',
                    country: address.country ?? '',
                  });
                }
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : !address || !addressHasContent ? (
        <div className="mt-4 rounded-lg border border-dashed p-6 text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No billing address on file
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setEditing(true)}
          >
            Add Address
          </Button>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border bg-card p-5 text-sm leading-relaxed">
          {(address.line1 || (address as any).address) && (
            <p>{address.line1 || (address as any).address}</p>
          )}
          {address.line2 && <p>{address.line2}</p>}
          {(address.city ||
            address.state ||
            address.postalCode ||
            (address as any).postal_code ||
            (address as any).zip) && (
            <p>
              {[
                address.city,
                address.state,
                address.postalCode ||
                  (address as any).postal_code ||
                  (address as any).zip,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
          {address.country && <p>{address.country}</p>}
          {saved && (
            <p className="mt-2 flex items-center gap-1 text-xs text-emerald-500">
              <Check className="h-3.5 w-3.5" /> Address saved
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

// ─── Invoices section ────────────────────────────────────────────

function InvoicesSection() {
  const { defaultOrg } = useOrganizations();
  const { hasPermission } = usePermissions();
  const orgId = defaultOrg?.orgId;

  const canView = hasPermission('org-billing-get-billing-details');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', orgId],
    queryFn: () => organizationClient.getInvoices(orgId!),
    enabled: Boolean(orgId && canView),
  });

  if (!canView) return null;

  const statusLabel = (s: InvoiceStatus | undefined): string => {
    switch (s) {
      case InvoiceStatus.INVOICE_STATUS_PAID:
        return 'Paid';
      case InvoiceStatus.INVOICE_STATUS_OPEN:
        return 'Open';
      case InvoiceStatus.INVOICE_STATUS_DRAFT:
        return 'Draft';
      case InvoiceStatus.INVOICE_STATUS_VOID:
        return 'Void';
      case InvoiceStatus.INVOICE_STATUS_UNCOLLECTIBLE:
        return 'Uncollectible';
      default:
        return 'Unknown';
    }
  };

  const statusColor = (s: InvoiceStatus | undefined): string => {
    switch (s) {
      case InvoiceStatus.INVOICE_STATUS_PAID:
        return 'bg-emerald-500/10 text-emerald-500';
      case InvoiceStatus.INVOICE_STATUS_OPEN:
        return 'bg-blue-500/10 text-blue-500';
      case InvoiceStatus.INVOICE_STATUS_DRAFT:
        return 'bg-zinc-500/10 text-zinc-400';
      case InvoiceStatus.INVOICE_STATUS_VOID:
        return 'bg-red-500/10 text-red-400';
      case InvoiceStatus.INVOICE_STATUS_UNCOLLECTIBLE:
        return 'bg-yellow-500/10 text-yellow-500';
      default:
        return 'bg-zinc-500/10 text-zinc-400';
    }
  };

  const formatDate = (d: Date | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatAmount = (cents: number | undefined) => {
    if (cents == null) return '—';
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <Section id="invoices">
      <h2 className="text-lg font-medium">Invoices</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Billing history for your organization
      </p>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed p-6 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">No invoices yet</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                  Invoice
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  Total
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  PDF
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr
                  key={inv.number ?? i}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {inv.number ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatDate(inv.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(inv.status)}`}
                    >
                      {statusLabel(inv.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatAmount(inv.total)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {inv.pdfUrl ? (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Download PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function BillingPage() {
  return (
    <div className="space-y-12 pb-[50vh]">
      <SubscriptionSection />
      <Separator />
      <PaymentMethodsSection />
      <Separator />
      <BillingAddressSection />
      <Separator />
      <InvoicesSection />
    </div>
  );
}
