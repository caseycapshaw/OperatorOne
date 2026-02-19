import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createRequest } from "@/lib/actions";
import { HudFrame } from "@/components/thegridcn/hud-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function NewRequestPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-[grid-fade_0.3s_ease-out]">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/requests"
          className="text-text-muted hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold uppercase tracking-widest text-text-primary">
            New Request
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Submit a new service request
          </p>
        </div>
      </div>

      <HudFrame title="Request Details">
        <form action={createRequest} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Brief description of your request"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Provide details about what you need..."
              rows={6}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                defaultValue="general"
                className="flex h-9 w-full border border-grid-border bg-grid-dark/80 px-3 py-1 text-sm text-text-primary focus-visible:outline-none focus-visible:border-neon-cyan/50"
              >
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="feature">Feature Request</option>
                <option value="bug">Bug Report</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                name="priority"
                defaultValue="medium"
                className="flex h-9 w-full border border-grid-border bg-grid-dark/80 px-3 py-1 text-sm text-text-primary focus-visible:outline-none focus-visible:border-neon-cyan/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/requests">Cancel</Link>
            </Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      </HudFrame>
    </div>
  );
}
