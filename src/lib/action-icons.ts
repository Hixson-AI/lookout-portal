/**
 * Action icon mapping.
 *
 * AgentAction.icon stores a Lucide icon name (e.g. "Mail").
 * This module maps those names to React components and provides
 * category-based fallbacks when no icon is set.
 */

import {
  Globe,
  Bot,
  RefreshCw,
  GitBranch,
  MessageSquare,
  Calendar,
  Mail,
  HardDrive,
  CreditCard,
  Smartphone,
  Zap,
  Box,
  Database,
  FileText,
  Code,
  Search,
  Shield,
  Cloud,
  Send,
  Phone,
  Video,
  Users,
  ShoppingCart,
  BarChart3,
  FolderOpen,
  Lock,
  Settings,
  Bell,
  Clock,
  type LucideIcon,
} from "lucide-react"

/** All icon names available for the LLM enricher and admin picker. */
export const AVAILABLE_ICON_NAMES: string[] = [
  "Globe",
  "Bot",
  "RefreshCw",
  "GitBranch",
  "MessageSquare",
  "Calendar",
  "Mail",
  "HardDrive",
  "CreditCard",
  "Smartphone",
  "Zap",
  "Box",
  "Database",
  "FileText",
  "Code",
  "Search",
  "Shield",
  "Cloud",
  "Send",
  "Phone",
  "Video",
  "Users",
  "ShoppingCart",
  "BarChart3",
  "FolderOpen",
  "Lock",
  "Settings",
  "Bell",
  "Clock",
]

const ICON_MAP: Record<string, LucideIcon> = {
  Globe,
  Bot,
  RefreshCw,
  GitBranch,
  MessageSquare,
  Calendar,
  Mail,
  HardDrive,
  CreditCard,
  Smartphone,
  Zap,
  Box,
  Database,
  FileText,
  Code,
  Search,
  Shield,
  Cloud,
  Send,
  Phone,
  Video,
  Users,
  ShoppingCart,
  BarChart3,
  FolderOpen,
  Lock,
  Settings,
  Bell,
  Clock,
}

const CATEGORY_FALLBACK: Record<string, string> = {
  integration: "Globe",
  ai: "Bot",
  data: "Database",
  logic: "GitBranch",
  communication: "MessageSquare",
}

export function getIconComponent(name?: string | null, category?: string): LucideIcon {
  if (name && ICON_MAP[name]) return ICON_MAP[name]
  if (category && CATEGORY_FALLBACK[category]) return ICON_MAP[CATEGORY_FALLBACK[category]]
  return Box
}
