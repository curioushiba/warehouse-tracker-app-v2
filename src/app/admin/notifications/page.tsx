"use client";

import { Card, CardBody } from "@/components/ui";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <Card variant="elevated" size="md">
        <CardBody className="py-16 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bell className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-heading font-semibold text-foreground mb-2">
            Notifications
          </h2>
          <p className="text-foreground-muted max-w-md mx-auto">
            This feature is coming soon. We&apos;re working hard to bring you
            alerts and notifications for inventory levels, sync errors, and
            system events.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
