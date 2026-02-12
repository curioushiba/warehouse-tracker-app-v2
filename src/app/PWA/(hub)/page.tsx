"use client";

import Link from "next/link";
import { Snowflake, ChefHat, ExternalLink, Smartphone } from "lucide-react";
import { Card, CardBody, Badge, Button } from "@/components/ui";

interface PWACard {
  name: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  iconBgClass: string;
  status: "Active" | "Coming Soon";
}

const pwaApps: PWACard[] = [
  {
    name: "Frozen Goods",
    description: "Mobile PWA for employees to check in/out frozen inventory items. Scan barcodes, manage stock, and track transactions.",
    href: "/PWA/frozengoodspwa",
    icon: <Snowflake className="w-8 h-8 text-white" />,
    iconBgClass: "bg-[#0077b6]",
    status: "Active",
  },
  {
    name: "Commissary",
    description: "Mobile PWA for employees to check in/out commissary inventory items. Scan barcodes, manage stock, and track transactions.",
    href: "/PWA/commissarypwa",
    icon: <ChefHat className="w-8 h-8 text-white" />,
    iconBgClass: "bg-[#E07A2F]",
    status: "Active",
  },
];

export default function PWAHubPage() {
  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card variant="filled" size="sm">
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-sm text-foreground-secondary">
            PWAs can be installed on mobile devices for a native app-like experience. Share the app link with employees or scan the QR code.
          </p>
        </div>
      </Card>

      {/* PWA Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pwaApps.map((app) => (
          <Card key={app.name} variant="elevated" className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardBody className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${app.iconBgClass}`}>
                  {app.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground text-lg">{app.name}</h3>
                    <Badge
                      colorScheme={app.status === "Active" ? "success" : "secondary"}
                      variant="subtle"
                      size="xs"
                    >
                      {app.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground-muted mb-4">{app.description}</p>
                  <Link href={app.href}>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<ExternalLink className="w-4 h-4" />}
                    >
                      Open App
                    </Button>
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
