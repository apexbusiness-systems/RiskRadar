import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Plus, Trash2, Bell, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
        <div className="grid grid-cols-3 gap-3">
          <FormField control={form.control} name="daysBefore" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Days Before</FormLabel>
              <FormControl><Input type="number" min={0} {...field} data-testid="input-days-before" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="channel" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Channel</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger data-testid="select-channel"><SelectValue /></SelectTrigger></FormControl>
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
              <FormLabel className="text-xs">Recipient</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger data-testid="select-recipient"><SelectValue /></SelectTrigger></FormControl>
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
              <FormLabel className="text-xs">Custom Email</FormLabel>
              <FormControl><Input type="email" placeholder="custom@email.com" {...field} data-testid="input-custom-email" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={createRule.isPending} data-testid="button-add-rule">
            {createRule.isPending ? "Adding..." : "Add Rule"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone} data-testid="button-cancel-rule">Cancel</Button>
        </div>
      </form>
    </Form>
  );
}

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
          toast({ title: "Obligation updated" });
        },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      },
    );
  };

  const handleComplete = () => {
    completeObligation.mutate(
      { obligationId },
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
        <div className="p-6 max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!obl) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">Obligation not found.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/obligations")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold truncate max-w-sm">{obl.title}</h1>
                <StatusBadge status={obl.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {obl.category} · Due {format(parseISO(obl.dueDate), "MMM d, yyyy")}
                {" "}<DueDateBadge dueDate={obl.dueDate} status={obl.status} />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {obl.status === "active" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-green-700 border-green-200 hover:bg-green-50"
                onClick={handleComplete}
                data-testid="button-complete"
              >
                <CheckCircle className="w-4 h-4" />
                Complete
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/10"
              onClick={handleDelete}
              data-testid="button-delete"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Edit form */}
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl><Input {...field} data-testid="input-title" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date *</FormLabel>
                      <FormControl><Input type="date" {...field} data-testid="input-due-date" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="renewalFrequency" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renewal Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-frequency"><SelectValue placeholder="None" /></SelectTrigger></FormControl>
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
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger></FormControl>
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
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea rows={2} {...field} data-testid="input-description" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="ownerEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Email</FormLabel>
                      <FormControl><Input type="email" {...field} data-testid="input-owner-email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="backupOwnerEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Backup Owner Email</FormLabel>
                      <FormControl><Input type="email" {...field} data-testid="input-backup-email" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea rows={3} {...field} data-testid="input-notes" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" disabled={updateObligation.isPending} data-testid="button-save">
                  {updateObligation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Reminder Rules */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Reminder Rules
            </CardTitle>
            {!addingRule && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setAddingRule(true)}
                data-testid="button-add-reminder-rule"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Rule
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {addingRule && (
              <ReminderRuleForm obligationId={obligationId} onDone={() => setAddingRule(false)} />
            )}

            {rulesQuery.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : rules.length === 0 && !addingRule ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No reminder rules yet. Add one to get notified before this deadline.
              </p>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                  data-testid={`row-rule-${rule.id}`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {rule.daysBefore} day{rule.daysBefore !== 1 ? "s" : ""} before · {rule.channel} · {rule.recipientType.replace(/_/g, " ")}
                    </p>
                    {rule.customEmail && (
                      <p className="text-xs text-muted-foreground">{rule.customEmail}</p>
                    )}
                    {rule.lastTriggeredAt && (
                      <p className="text-xs text-muted-foreground">
                        Last sent: {format(new Date(rule.lastTriggeredAt), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => handleToggleRule(rule.id, rule)}
                      data-testid={`switch-rule-${rule.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteRule(rule.id)}
                      data-testid={`button-delete-rule-${rule.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
