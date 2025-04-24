// This file provides all icons needed by the application
// By centralizing icon imports, we can avoid ad blocker issues

// Import our custom implementation for blocked icons
import SecurityIcon from './icons/Fingerprint';

// Import all icons we need from Lucide
import {
  Search,
  Moon,
  Sun,
  ChevronDown,
  Menu,
  Maximize2,
  MoreHorizontal,
  Trash2,
  LayoutGrid,
  RotateCcw,
  Copy,
  Clipboard,
  Palette,
  Monitor,
  ChevronRight,
  // Added icons for Markets dropdown
  ListChecks,
  Plus,
  Edit,
  Globe,
  ListFilter
} from 'lucide-react';

// Export our safe version of the fingerprint icon
export const Fingerprint = SecurityIcon;

// Re-export all other icons explicitly
export {
  Search,
  Moon,
  Sun,
  ChevronDown,
  Menu,
  Maximize2,
  MoreHorizontal,
  Trash2,
  LayoutGrid,
  RotateCcw,
  Copy,
  Clipboard,
  Palette,
  Monitor,
  ChevronRight,
  // Added icons for Markets dropdown
  ListChecks,
  Plus,
  Edit,
  Globe,
  ListFilter
}; 