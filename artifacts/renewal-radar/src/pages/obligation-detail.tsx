import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetObligation,
  getGetObligationQueryKey,
  useUpdateObligation,
  useCompleteObligation,
  useDeleteObligation,
  useListReminderRules,
  getListReminderRulesQueryKey,
  useCreateReminderRule,
  useUpdateReminderRule,
  useDeleteReminderRule,
  getListObligationsQueryKey,
} from "@workspace/api-client-react";
import { StatusBadge, DueDateBadge } from "@/components/ObligationBadge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Bell,
  CheckCircle2,
  Save,
  Mail,
  Smartphone,
  UserCheck,
  Users,
  AtSign,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Licensing", "Insurance", "Contracts", "Software", "HR & Compliance", "Real Estate", "Other"];

const oblFormSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  dueDate: z.string().min(1),
  renewalFrequency: z.string().optional(),
  ownerEmail: z.string().optional(),
  backupOwnerEmail: z.string().optional(),
  notes: z.string().optional(),
  status: z.string(),
});
type OblFormValues = z.infer<typeof oblFormSchema>;

const ruleSchema = z.object({
  daysBefore: z.coerce.number().min(0),
  channel: z.string(),
  recipientType: z.string(),
  customEmail: z.string().optional(),
  isActive: z.boolean().default(true),
});
type RuleFormValues = z.infer<typeof ruleSchema>;

function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function ReminderRuleForm({ obligationId, onDone }: { obligationId: number; onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createRule = useCreateReminderRule();

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: { daysBefore: 7, channel: "email", recipientType: "owner", isActive: true },
  });

  const onSubmit = (values: RuleFormValues) => {
    createRule.mutate(
      {
        obligationId,
        data: {
          daysBefore: values.daysBefore,
          channel: values.channel as "email" | "in_app",
          recipientType: values.recipientType as "owner" | "backup_owner" | "all_members" | "custom_email",
          customEmail: values.customEmail || null,
          isActive: values.isActive,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReminderRulesQueryKey(obligationId) });
          toast({ title: "Reminder rule added" });
          onDone();
        },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      },
    );
  };

  const recipientType = form.watch("recipientType");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-700">New Reminder Rule</p>
        <div className="grid grid-cols-3 gap-3">
          <FormField control={form.control} name="daysBefore" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-slate-600">Days Before</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  {...field}
                  className="rounded-xl border-slate-200 bg-white focus-visible:ring-slate-300 h-9"
                  data-testid="input-days-before"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="channel" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-slate-600">Channel</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-xl border-slate-200 bg-white h-9" data-testid="select-channel">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="in_app">In-App</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="recipientType" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-slate-600">Recipient</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-xl border-slate-200 bg-white h-9" data-testid="select-recipient">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="backup_owner">Backup Owner</SelectItem>
                  <SelectItem value="all_members">All Members</SelectItem>
                  <SelectItem value="custom_email">Custom Email</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        {recipientType === "custom_email" && (
          <FormField control={form.control} name="customEmail" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-slate-600">Custom Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="custom@email.com" className="rounded-xl border-slate-200 bg-white h-9" {...field} data-testid="input-custom-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={createRule.isPending}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-9 px-4"
            data-testid="button-add-rule"
          >
            {createRule.isPending ? "Adding..." : "Add Rule"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDone}
            className="rounded-xl h-9 border-slate-200 text-slate-600"
            data-testid="button-cancel-rule"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

const CHANNEL_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  in_app: Smartphone,
};

const RECIPIENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  owner: UserCheck,
  backup_owner: UserCheck,
  all_members: Users,
  custom_email: AtSign,
};

export default function ObligationDetailPage() {
  const params = useParams<{ id: string }>();
  const obligationId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addingRule, setAddingRule] = useState(false);

  const oblQuery = useGetObligation(obligationId, {
    query: { queryKey: getGetObligationQueryKey(obligationId), enabled: !!obligationId },
  });

  const rulesQuery = useListReminderRules(obligationId, {
    query: { queryKey: getListReminderRulesQueryKey(obligationId), enabled: !!obligationId },
  });

  const updateObligation = useUpdateObligation();
  const completeObligation = useCompleteObligation();
  const deleteObligation = useDeleteObligation();
  const deleteRule = useDeleteReminderRule();
  const updateRule = useUpdateReminderRule();

  const obl = oblQuery.data;
  const rules = rulesQuery.data ?? [];

  const form = useForm<OblFormValues>({
    resolver: zodResolver(oblFormSchema),
    values: obl
      ? {
          title: obl.title,
          description: obl.description ?? "",
          category: obl.category,
          dueDate: obl.dueDate,
          renewalFrequency: obl.renewalFrequency ?? "",
          ownerEmail: obl.ownerEmail ?? "",
          backupOwnerEmail: obl.backupOwnerEmail ?? "",
          notes: obl.notes ?? "",
          status: obl.status,
        }
      : undefined,
  });

  const onSubmit = (values: OblFormValues) => {
    if (!obl) return;
    updateObligation.mutate(
      {
        obligationId,
        data: {
          workspaceId: obl.workspaceId,
          title: values.title,
          description: values.description || null,
          category: values.category,
          dueDate: values.dueDate,
          renewalFrequency: (values.renewalFrequency as "once" | "monthly" | "quarterly" | "annually" | "custom") || null,
          ownerClerkId: obl.ownerClerkId ?? null,
          ownerEmail: values.ownerEmail || null,
          backupOwnerClerkId: obl.backupOwnerClerkId ?? null,
          backupOwnerEmail: values.backupOwnerEmail || null,
          notes: values.notes || null,
          tags: obl.tags ?? [],
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetObligationQueryKey(obligationId) });
          queryClient.invalidateQueries({ queryKey: getListObligationsQueryKey() });
          toast({ title: "Changes saved" });
        },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      },
    );
  };

  const handleComplete = () => {
    completeObligation.mutate(
      { obligationId, data: {} },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetObligationQueryKey(obligationId) });
          toast({ title: "Marked as completed" });
        },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      },
    );
  };

  const handleDelete = () => {
    if (!obl || !confirm(`Delete "${obl.title}"?`)) return;
    deleteObligation.mutate(
      { obligationId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListObligationsQueryKey() });
          toast({ title: "Deleted" });
          setLocation("/obligations");
        },
        onError: () => toast({ title: "Delete failed", variant: "destructive" }),
      },
    );
  };

  const handleDeleteRule = (ruleId: number) => {
    deleteRule.mutate(
      { obligationId, ruleId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReminderRulesQueryKey(obligationId) });
          toast({ title: "Rule deleted" });
        },
      },
    );
  };

  const handleToggleRule = (ruleId: number, rule: typeof rules[0]) => {
    updateRule.mutate(
      {
        obligationId,
        ruleId,
        data: {
          daysBefore: rule.daysBefore,
          channel: rule.channel,
          recipientType: rule.recipientType,
          customEmail: rule.customEmail ?? null,
          isActive: !rule.isActive,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReminderRulesQueryKey(obligationId) });
        },
      },
    );
  };

  if (oblQuery.isLoading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-5">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  if (!obl) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <p className="text-slate-500 font-medium">Obligation not found.</p>
          <Button variant="outline" onClick={() => setLocation("/obligations")} className="mt-4 rounded-xl">
            Back to Obligations
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-4">
            <button
              onClick={() => setLocation("/obligations")}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm flex-shrink-0 mt-0.5"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{obl.title}</h1>
                <StatusBadge status={obl.status} />
                <DueDateBadge dueDate={obl.dueDate} status={obl.status} />
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {obl.category} · Due {format(parseISO(obl.dueDate), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {obl.status === "active" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-xl h-9"
                onClick={handleComplete}
                data-testid="button-complete"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Complete</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 rounded-xl h-9"
              onClick={handleDelete}
              data-testid="button-delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Core Details */}
            <FormSection title="Core Details">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">Title</FormLabel>
                  <FormControl>
                    <Input className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus-visible:ring-slate-300" {...field} data-testid="input-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50" data-testid="select-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus-visible:ring-slate-300" {...field} data-testid="input-due-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="renewalFrequency" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Renewal Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50" data-testid="select-frequency">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="once">One-time</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50" data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus-visible:ring-slate-300 resize-none" {...field} data-testid="input-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </FormSection>

            {/* Ownership */}
            <FormSection title="Ownership" description="Who is responsible for tracking and renewing this obligation">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="ownerEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Owner Email</FormLabel>
                    <FormControl>
                      <Input type="email" className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus-visible:ring-slate-300" {...field} data-testid="input-owner-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="backupOwnerEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Backup Owner</FormLabel>
                    <FormControl>
                      <Input type="email" className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus-visible:ring-slate-300" {...field} data-testid="input-backup-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </FormSection>

            {/* Notes */}
            <FormSection title="Notes">
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea rows={3} placeholder="Filing instructions, vendor contacts, renewal process notes..." className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus-visible:ring-slate-300 resize-none" {...field} data-testid="input-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </FormSection>

            <Button
              type="submit"
              disabled={updateObligation.isPending}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 gap-2 font-semibold shadow-sm w-full"
              data-testid="button-save"
            >
              <Save className="w-4 h-4" />
              {updateObligation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>

        {/* Reminder Rules */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mt-5">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                <Bell className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Reminder Rules</h2>
                {rules.length > 0 && (
                  <p className="text-xs text-slate-400">{rules.filter(r => r.isActive).length} active</p>
                )}
              </div>
            </div>
            {!addingRule && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50 rounded-xl h-8 text-xs"
                onClick={() => setAddingRule(true)}
                data-testid="button-add-reminder-rule"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Rule
              </Button>
            )}
          </div>

          <div className="p-5 space-y-3">
            {addingRule && (
              <ReminderRuleForm obligationId={obligationId} onDone={() => setAddingRule(false)} />
            )}

            {rulesQuery.isLoading ? (
              <Skeleton className="h-16 w-full rounded-xl" />
            ) : rules.length === 0 && !addingRule ? (
              <div className="py-10 text-center">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-1">No reminders configured</p>
                <p className="text-xs text-slate-400">Add a rule to get notified before this deadline.</p>
              </div>
            ) : (
              rules.map((rule, idx) => {
                const ChanIcon = CHANNEL_ICON[rule.channel] ?? Mail;
                const RecipIcon = RECIPIENT_ICON[rule.recipientType] ?? UserCheck;
                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all",
                      rule.isActive ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-60",
                    )}
                    data-testid={`row-rule-${rule.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", rule.isActive ? "bg-violet-100" : "bg-slate-100")}>
                        <Bell className={cn("w-4 h-4", rule.isActive ? "text-violet-600" : "text-slate-400")} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {rule.daysBefore} day{rule.daysBefore !== 1 ? "s" : ""} before deadline
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <ChanIcon className="w-3 h-3" />
                            {rule.channel.replace("_", " ")}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <RecipIcon className="w-3 h-3" />
                            {rule.recipientType.replace(/_/g, " ")}
                            {rule.customEmail ? ` (${rule.customEmail})` : ""}
                          </span>
                          {rule.lastTriggeredAt && (
                            <span className="text-xs text-slate-400">
                              Last: {format(new Date(rule.lastTriggeredAt), "MMM d")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => handleToggleRule(rule.id, rule)}
                        data-testid={`switch-rule-${rule.id}`}
                      />
                      <button
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                        onClick={() => handleDeleteRule(rule.id)}
                        data-testid={`button-delete-rule-${rule.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
