"use client";

import { useState } from "react";
import { Navbar } from "@/components/ui/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-graphite/40">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Home() {
  const [collapsibleOpen, setCollapsibleOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        logo={
          <span className="text-sm font-bold tracking-tight text-graphite">
            AgentRouter
          </span>
        }
        links={[
          { label: "Dashboard", href: "#" },
          { label: "Listings", href: "#" },
          { label: "Policies", href: "#" },
          { label: "Settings", href: "#" },
        ]}
        actions={
          <Button variant="outline" size="sm">
            Log in
          </Button>
        }
      />

      <main className="mx-auto max-w-2xl px-6 py-16 flex flex-col gap-14">
        {/* Badges */}
        <Section title="Badge">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Button — variants">
          <div className="flex flex-wrap gap-2">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </Section>

        <Section title="Button — sizes">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        {/* Input */}
        <Section title="Input">
          <Input placeholder="Search listings…" />
          <Input type="email" placeholder="you@example.com" />
          <Input disabled placeholder="Disabled input" />
        </Section>

        {/* Textarea */}
        <Section title="Textarea">
          <Textarea placeholder="Write a policy description…" rows={4} />
        </Section>

        {/* Select */}
        <Section title="Select">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Pick a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Categories</SelectLabel>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="clothing">Clothing</SelectItem>
                <SelectItem value="furniture">Furniture</SelectItem>
                <SelectItem value="toys">Toys</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Section>

        {/* Tabs */}
        <Section title="Tabs">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="listings">Listings</TabsTrigger>
              <TabsTrigger value="policies">Policies</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <p className="text-sm text-graphite/70 pt-2">
                This is the overview tab. Shows a summary of agent activity.
              </p>
            </TabsContent>
            <TabsContent value="listings">
              <p className="text-sm text-graphite/70 pt-2">
                Your marketplace listings will appear here.
              </p>
            </TabsContent>
            <TabsContent value="policies">
              <p className="text-sm text-graphite/70 pt-2">
                Compliance policies and vector search results live here.
              </p>
            </TabsContent>
          </Tabs>
        </Section>

        {/* Collapsible */}
        <Section title="Collapsible">
          <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>View policy details</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${collapsibleOpen ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 rounded-md border border-graphite/10 bg-graphite/2 px-4 py-3 text-sm text-graphite/70">
              Policy ID:{" "}
              <span className="font-mono text-graphite">POL-00142</span>
              <br />
              Status:{" "}
              <Badge variant="accent" className="ml-1">
                Active
              </Badge>
              <br />
              Last reviewed: Feb 18, 2026
            </CollapsibleContent>
          </Collapsible>
        </Section>

        {/* Dialog */}
        <Section title="Dialog">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm policy update</DialogTitle>
                <DialogDescription>
                  This will re-run the compliance check on all active listings.
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <Input placeholder="Type CONFIRM to proceed" />
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Confirm</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Section>
      </main>
    </div>
  );
}
