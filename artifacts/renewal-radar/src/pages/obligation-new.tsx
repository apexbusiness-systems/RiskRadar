import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useCreateObligation, getListObligationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { useUser } from "@clerk/react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = ["Licensing", "Insurance", "Contracts", "Software", "HR & Compliance", "Real Estate", "Other"];

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(2000).optional(),
  category: z.string().min(1, "Category is required"),
  dueDate: z.string().min(1, "Due date is required"),
  renewalFrequency: z.string().optional(),
  ownerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  backupOwnerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().max(5000).optional(),
});
type FormValues = z.infer<typeof formSchema>;

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

export default function ObligationNewPage() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createObligation = useCreateObligation();
  const { workspaceId, isLoading: wsLoading, error: wsError } = useWorkspace();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      dueDate: "",
      renewalFrequency: "",
      ownerEmail: user?.emailAddresses[0]?.emailAddress ?? "",
      backupOwnerEmail: "",
      notes: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!workspaceId) {
      toast({ title: "Workspace not loaded yet. Please wait.", variant: "destructive" });
      return;
    }

    createObligation.mutate(
      {
        data: {
          workspaceId,
          title: values.title,
          description: values.description || undefined,
          category: values.category,
          dueDate: values.dueDate,
          renewalFrequency: (values.renewalFrequency as "once" | "monthly" | "quarterly" | "annually" | "custom" | null) || null,
          ownerClerkId: null,
          ownerEmail: values.ownerEmail || null,
          backupOwnerClerkId: null,
          backupOwnerEmail: values.backupOwnerEmail || null,
          notes: values.notes || null,
          tags: [],
        },
      },
      {
        onSuccess: (obligation) => {
          queryClient.invalidateQueries({ queryKey: getListObligationsQueryKey() });
          toast({ title: "Obligation created" });
          setLocation(`/obligations/${obligation.id}`);
        },
        onError: () => toast({ title: "Failed to create", variant: "destructive" }),
      },
    );
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setLocation("/obligations")}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">New Obligation</h1>
            <p className="text-slate-500 text-sm mt-0.5">Track a new deadline or renewal</p>
          </div>
        </div>

        {wsError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {wsError}
          </div>
        )}

        {wsLoading ? (
          <div className="space-y-5">
            <Skeleton className="h-60 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormSection title="Core Details">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Title <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Business License Renewal"
                        className="rounded-xl border-slate-200 focus-visible:ring-slate-300 bg-slate-50 focus:bg-white transition-colors"
                        {...field}
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Category <span className="text-red-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white" data-testid="select-category">
                            <SelectValue placeholder="Select..." />
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
                      <FormLabel className="text-slate-700 font-medium">Due Date <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus-visible:ring-slate-300"
                          {...field}
                          data-testid="input-due-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="renewalFrequency" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Renewal Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50" data-testid="select-frequency">
                          <SelectValue placeholder="None (one-time)" />
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

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this obligation..."
                        rows={2}
                        className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus-visible:ring-slate-300 resize-none"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </FormSection>

              <FormSection title="Ownership">
                <p className="text-xs text-slate-500 -mt-1">Assign an owner and backup so reminders reach the right people.</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="ownerEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Owner Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="owner@company.com" className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus-visible:ring-slate-300" {...field} data-testid="input-owner-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="backupOwnerEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium">Backup Owner</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="backup@company.com" className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus-visible:ring-slate-300" {...field} data-testid="input-backup-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </FormSection>

              <FormSection title="Notes">
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder="Any additional context, filing instructions, or notes..." rows={3} className="rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus-visible:ring-slate-300 resize-none" {...field} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </FormSection>

              <div className="flex gap-3 pt-1">
                <Button
                  type="submit"
                  disabled={createObligation.isPending || !workspaceId}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 font-semibold shadow-sm gap-2"
                  data-testid="button-submit"
                >
                  {createObligation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Create Obligation</>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/obligations")}
                  className="rounded-xl h-11 border-slate-200 text-slate-600"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </AppLayout>
  );
}
